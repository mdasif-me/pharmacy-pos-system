import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import Company from '../../../assets/company.svg'
import Search from '../../../assets/search.svg'
import { showModeChangeConfirmation } from '../../../utils/alerts'
import { Column, Pagination, Table } from '../../common'
import './Products.css'

type SelectOption<T> = {
  value: T
  label: string
}

type PriceMode = 'discount' | 'peak-hour'

const priceTypeOptions: SelectOption<PriceMode>[] = [
  { value: 'discount', label: 'Discount' },
  { value: 'peak-hour', label: 'Peak-Hour' },
]

interface ProductsProps {
  user: AuthToken
  syncRequestId?: number
  onSyncStatusChange?: (status: { isSyncing: boolean; lastSync: string }) => void
}

export const Products: React.FC<ProductsProps> = ({ user, syncRequestId, onSyncStatusChange }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<number | ''>('')
  const [companies, setCompanies] = useState<Array<{ company_id: number; company_name: string }>>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [discountInput, setDiscountInput] = useState('')
  const [peakHourInput, setPeakHourInput] = useState('')
  const [isSavingPrices, setIsSavingPrices] = useState(false)
  const [priceType, setPriceType] = useState<PriceMode>('discount')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [saleMode, setSaleMode] = useState(0) // 0 = discount, 1 = peak-hour
  const [billMode, setBillMode] = useState(0) // 0 = discount, 1 = peak-hour
  const [errorMessage, setErrorMessage] = useState('')
  const hasLoadedRef = useRef(false)
  const latestSyncRequestRef = useRef(syncRequestId)

  const updateLastSyncTimestamp = useCallback(async () => {
    try {
      if (products && products.length > 0) {
        console.log('[Products] updateLastSyncTimestamp called with products:', products.length)
        const productsWithSyncTime = products.filter((p) => p.last_synced_at)
        console.log('[Products] Products with sync time:', productsWithSyncTime.length)

        if (productsWithSyncTime.length > 0) {
          let mostRecentSyncTime = ''
          for (const product of productsWithSyncTime) {
            if (product.last_synced_at && product.last_synced_at > mostRecentSyncTime) {
              mostRecentSyncTime = product.last_synced_at
            }
          }
          console.log('[Products] mostRecentSyncTime:', mostRecentSyncTime)
          setLastSync(mostRecentSyncTime)
          return
        }
      }

      console.log('[Products] No products with sync time found')
      setLastSync('No last sync info found')
    } catch (error) {
      console.error('[Products] Error in updateLastSyncTimestamp:', error)
      setLastSync('Error loading sync time')
    }
  }, [products])

  // Update last sync timestamp whenever products change
  useEffect(() => {
    if (products && products.length > 0) {
      updateLastSyncTimestamp()
    }
  }, [products, updateLastSyncTimestamp])

  // apply filters when search or filter values change
  useEffect(() => {
    applyFilters()
    setCurrentPage(1) // Reset to first page when filters change
  }, [products, searchTerm, selectedCompany])

  useEffect(() => {
    onSyncStatusChange?.({ isSyncing, lastSync })
  }, [isSyncing, lastSync, onSyncStatusChange])

  const syncProducts = useCallback(async () => {
    try {
      setIsSyncing(true)

      // fetch latest products from api and store locally
      const apiProducts = await window.electron.syncProducts()
      console.log('Sync products response:', apiProducts)

      // Ensure we have an array
      const productsArray = Array.isArray(apiProducts) ? apiProducts : []
      setProducts(productsArray)

      // load filter options
      const companiesData = await window.electron.getUniqueCompanies()
      console.log('Companies data from sync:', companiesData)

      // Ensure companies is always an array
      const companiesArray = Array.isArray(companiesData) ? companiesData : []
      setCompanies(companiesArray)

      // Update sync timestamp with the synced products
      if (productsArray.length > 0) {
        const productsWithSyncTime = productsArray.filter((p) => p.last_synced_at)
        if (productsWithSyncTime.length > 0) {
          let mostRecentSyncTime = ''
          for (const product of productsWithSyncTime) {
            if (product.last_synced_at && product.last_synced_at > mostRecentSyncTime) {
              mostRecentSyncTime = product.last_synced_at
            }
          }
          console.log('[Products] Latest sync time from synced products:', mostRecentSyncTime)
          setLastSync(mostRecentSyncTime)
        } else {
          setLastSync('No last sync info found')
        }
      }
    } catch (error) {
      console.error('sync failed:', error)
      const message = error instanceof Error ? error.message : 'failed to sync products from server'
      alert(`failed to sync products: ${message}`)
    } finally {
      setIsSyncing(false)
    }
  }, [updateLastSyncTimestamp])

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true)

      // load products from local database first
      const localProducts = await window.electron.getAllProducts()
      console.log('Local products response:', localProducts)

      // Ensure we have an array
      const productsArray = Array.isArray(localProducts) ? localProducts : []
      setProducts(productsArray)

      // load filter options
      const companiesData = await window.electron.getUniqueCompanies()
      console.log('Companies data from loadInitialData:', companiesData)

      // Ensure companies is always an array
      const companiesArray = Array.isArray(companiesData) ? companiesData : []
      setCompanies(companiesArray)

      // Update sync timestamp with the loaded products
      if (productsArray.length > 0) {
        const productsWithSyncTime = productsArray.filter((p) => p.last_synced_at)
        if (productsWithSyncTime.length > 0) {
          let mostRecentSyncTime = ''
          for (const product of productsWithSyncTime) {
            if (product.last_synced_at && product.last_synced_at > mostRecentSyncTime) {
              mostRecentSyncTime = product.last_synced_at
            }
          }
          console.log('[Products] Latest sync time from loaded products:', mostRecentSyncTime)
          setLastSync(mostRecentSyncTime)
        } else {
          setLastSync('No last sync info found')
        }
      }

      // if no local products, sync from api
      if (productsArray.length === 0) {
        await syncProducts()
      }
    } catch (error) {
      console.error('failed to load initial data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [syncProducts, updateLastSyncTimestamp])

  // load products and filter data on first render
  useEffect(() => {
    if (hasLoadedRef.current) {
      return
    }
    hasLoadedRef.current = true
    loadInitialData()
  }, [loadInitialData])

  // Load business setup (sale mode and bill mode)
  useEffect(() => {
    const loadBusinessSetup = async () => {
      try {
        const setup = await window.electron.businessSetup.get()
        if (setup) {
          setSaleMode(setup.sale_mode)
          setBillMode(setup.bill_mode)
        }
      } catch (error) {
        console.error('[Products] Error loading business setup:', error)
      }
    }
    loadBusinessSetup()
  }, [])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setErrorMessage('')
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for real-time stock updates from socket
  useEffect(() => {
    const unsubscribe = window.electron.onStockUpdated(async (data) => {
      console.log('[Products] Received real-time stock update:', data)

      // Reload products to get the updated data
      try {
        const localProducts = await window.electron.getAllProducts()
        const productsArray = Array.isArray(localProducts) ? localProducts : []
        setProducts(productsArray)

        // Show a brief notification (optional)
        console.log(`[Products] Stock updated for ${data.productName}: ${data.newStock} units`)
      } catch (error) {
        console.error('[Products] Error reloading products after stock update:', error)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Listen for sale mode updates
  useEffect(() => {
    const unsubscribe = window.electron.onSaleModeUpdated((data) => {
      console.log('[Products] Sale mode updated:', data.saleMode)
      setSaleMode(data.saleMode)
    })
    return unsubscribe
  }, [])

  // Sync saleMode with priceType in the table display
  useEffect(() => {
    const newPriceType: PriceMode = saleMode === 0 ? 'discount' : 'peak-hour'
    setPriceType(newPriceType)
    console.log('[Products] Price type updated to:', newPriceType, 'based on saleMode:', saleMode)
  }, [saleMode])

  // Listen for bill mode updates
  useEffect(() => {
    const unsubscribe = window.electron.onBillModeUpdated((data) => {
      console.log('[Products] Bill mode updated:', data.billMode)
      setBillMode(data.billMode)
    })
    return unsubscribe
  }, [])

  // Listen for price updates
  useEffect(() => {
    const unsubscribe = window.electron.onPriceUpdated(async (data) => {
      console.log('[Products] Price updated:', data)
      // Reload products to show updated prices
      try {
        const localProducts = await window.electron.getAllProducts()
        const productsArray = Array.isArray(localProducts) ? localProducts : []
        setProducts(productsArray)
      } catch (error) {
        console.error('[Products] Error reloading products after price update:', error)
      }
    })
    return unsubscribe
  }, [])

  // trigger sync when dashboard requests it
  useEffect(() => {
    if (syncRequestId === undefined) {
      return
    }
    if (latestSyncRequestRef.current === syncRequestId) {
      return
    }
    latestSyncRequestRef.current = syncRequestId
    syncProducts()
  }, [syncRequestId, syncProducts])

  const applyFilters = () => {
    // Ensure products is an array
    if (!Array.isArray(products)) {
      console.error('products is not an array:', products)
      setFilteredProducts([])
      return
    }

    let filtered = [...products]

    // search filter - prioritize products that start with search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()

      // Separate products into two groups: starts with and contains
      const startsWithMatches: Product[] = []
      const containsMatches: Product[] = []

      filtered.forEach((product) => {
        const productNameLower = (product.product_name ?? '').toLowerCase()
        const genericNameLower = (product.generic_name ?? '').toLowerCase()
        const companyNameLower = (product.company_name ?? '').toLowerCase()
        const stockStr = String(product.in_stock ?? '').toLowerCase()

        // Check if starts with search term
        if (
          productNameLower.startsWith(term) ||
          genericNameLower.startsWith(term) ||
          companyNameLower.startsWith(term) ||
          stockStr.startsWith(term)
        ) {
          startsWithMatches.push(product)
        }
        // Check if contains search term (but not starts with)
        else if (
          productNameLower.includes(term) ||
          genericNameLower.includes(term) ||
          companyNameLower.includes(term) ||
          stockStr.includes(term)
        ) {
          containsMatches.push(product)
        }
      })

      // Combine: starts with first, then contains
      filtered = [...startsWithMatches, ...containsMatches]
    }

    // company filter
    if (selectedCompany) {
      filtered = filtered.filter((product) => product.company_id === selectedCompany)
    }

    // Sort by stock: prioritize 0, 1, 3 first, then ascending order
    filtered.sort((a, b) => {
      const stockA = a.in_stock ?? 0
      const stockB = b.in_stock ?? 0

      // Priority values order: 0, 1, 3
      const priorityOrder: { [key: number]: number } = { 0: 0, 1: 1, 3: 2 }
      const priorityA = priorityOrder[stockA] ?? 999
      const priorityB = priorityOrder[stockB] ?? 999

      // If both have priority, sort by priority
      if (priorityA !== 999 && priorityB !== 999) {
        return priorityA - priorityB
      }

      // If only one has priority, it comes first
      if (priorityA !== 999) return -1
      if (priorityB !== 999) return 1

      // Otherwise, sort ascending
      return stockA - stockB
    })

    setFilteredProducts(filtered)
  }

  const companyOptions = useMemo<SelectOption<number>[]>(() => {
    // Safety check: ensure companies is an array
    if (!Array.isArray(companies)) {
      console.warn('companies is not an array:', companies)
      return []
    }
    return companies.map((company) => ({
      value: company.company_id,
      label: company.company_name,
    }))
  }, [companies])

  const selectedCompanyOption = useMemo<SelectOption<number> | null>(() => {
    if (typeof selectedCompany !== 'number') {
      return null
    }
    return companyOptions.find((option) => option.value === selectedCompany) ?? null
  }, [selectedCompany, companyOptions])

  const handleCompanyChange = (option: SingleValue<SelectOption<number>>) => {
    if (!option) {
      setSelectedCompany('')
      return
    }
    setSelectedCompany(option.value)
  }

  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) {
      return '—'
    }

    const numeric = Number(value)
    if (Number.isNaN(numeric)) {
      return '—'
    }

    return `৳${numeric.toFixed(2)}`
  }

  const getDisplayedRate = (product: Product) => {
    if (priceType === 'discount') {
      return product.discount_price ?? product.sale_price ?? product.peak_hour_price
    }
    return product.peak_hour_price ?? product.sale_price ?? product.discount_price
  }

  const openPriceModal = (product: Product) => {
    setSelectedProduct(product)
    setDiscountInput(
      product.discount_price !== null && product.discount_price !== undefined
        ? product.discount_price.toString()
        : ''
    )
    setPeakHourInput(
      product.peak_hour_price !== null && product.peak_hour_price !== undefined
        ? product.peak_hour_price.toString()
        : ''
    )
    setIsModalOpen(true)
  }

  const closePriceModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
    setDiscountInput('')
    setPeakHourInput('')
  }

  const parsePriceInput = (value: string): number | undefined => {
    const trimmed = value.trim()
    if (trimmed === '') {
      return undefined
    }

    const parsed = Number.parseFloat(trimmed)
    if (Number.isNaN(parsed) || parsed < 0) {
      return undefined
    }

    return parsed
  }

  const handlePriceUpdate = async () => {
    if (!selectedProduct) {
      return
    }

    // Check if online
    if (!isOnline) {
      setErrorMessage(
        'আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন! মূল্য আপডেট করতে আপনাকে অনলাইনে থাকতে হবে।'
      )
      alert('Please check your internet connection! You have to be online to update prices.')
      return
    }

    const discountPrice = parsePriceInput(discountInput)
    if (discountPrice === undefined) {
      alert('enter a valid discount price')
      return
    }

    const peakHourPrice = parsePriceInput(peakHourInput)
    if (peakHourPrice === undefined) {
      alert('enter a valid peak-hour price')
      return
    }

    if (discountPrice <= 0 || peakHourPrice <= 0) {
      alert('prices must be greater than zero')
      return
    }

    // Get mediboy offer price from selected product
    const offerPrice = selectedProduct.mediboy_offer_price || 0

    // Price validation - Peak Hour Price must be >= Sale Price
    if (peakHourPrice < discountPrice) {
      setErrorMessage(
        'পিক আওয়ার প্রাইস কখনোই সেল প্রাইসের চেয়ে কম হতে পারবে না। অনুগ্রহ করে সঠিক মূল্য দিন।'
      )
      return
    }

    // Mediboy Offer Price must be < Sale Price AND < Peak Hour Price
    if (offerPrice >= discountPrice || offerPrice >= peakHourPrice) {
      setErrorMessage(
        'Mediboy অফার প্রাইস অবশ্যই সেল প্রাইস এবং পিক আওয়ার প্রাইস — দুটোই এর চেয়ে কম হতে হবে।'
      )
      return
    }

    setIsSavingPrices(true)
    setErrorMessage('')

    try {
      // Use the new business setup API for price updates
      await window.electron.businessSetup.updatePrice(
        selectedProduct.id,
        discountPrice,
        peakHourPrice
      )

      // Reload products to show updated prices
      const localProducts = await window.electron.getAllProducts()
      const productsArray = Array.isArray(localProducts) ? localProducts : []
      setProducts(productsArray)

      closePriceModal()
    } catch (error) {
      console.error('failed to update prices:', error)
      const message = error instanceof Error ? error.message : 'failed to update prices'
      setErrorMessage(message)
      alert(message)
    } finally {
      setIsSavingPrices(false)
    }
  }

  // Handle sale mode toggle
  const handleSaleModeToggle = async () => {
    if (!isOnline) {
      setErrorMessage(
        'আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন! সেল মোড পরিবর্তন করতে আপনাকে অনলাইনে থাকতে হবে।'
      )
      alert('Please check your internet connection! You have to be online to change sale mode.')
      return
    }

    const newMode = saleMode === 0 ? 1 : 0
    const newModeLabel = newMode === 0 ? 'Discount' : 'Peak-Hour'

    // Show confirmation dialog
    const result = await showModeChangeConfirmation('sale mode', newModeLabel)

    if (result.isConfirmed) {
      try {
        await window.electron.businessSetup.updateSaleMode(newMode)
        setSaleMode(newMode)
        setErrorMessage('')
      } catch (error) {
        console.error('Failed to update sale mode:', error)
        const message = error instanceof Error ? error.message : 'Failed to update sale mode'
        setErrorMessage(message)
        alert(message)
      }
    }
  }

  // Handle bill mode toggle
  const handleBillModeToggle = async () => {
    if (!isOnline) {
      setErrorMessage(
        'আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন! বিল মোড পরিবর্তন করতে আপনাকে অনলাইনে থাকতে হবে।'
      )
      alert('Please check your internet connection! You have to be online to change bill mode.')
      return
    }

    const newMode = billMode === 0 ? 1 : 0
    const newModeLabel = newMode === 0 ? 'Discount' : 'Peak-Hour'

    // Show confirmation dialog
    const result = await showModeChangeConfirmation('bill mode', newModeLabel)

    if (result.isConfirmed) {
      try {
        await window.electron.businessSetup.updateBillMode(newMode)
        setBillMode(newMode)
        setErrorMessage('')
      } catch (error) {
        console.error('Failed to update bill mode:', error)
        const message = error instanceof Error ? error.message : 'Failed to update bill mode'
        setErrorMessage(message)
        alert(message)
      }
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  // Define table columns
  const tableColumns: Column<Product>[] = useMemo(
    () => [
      {
        key: 'sl',
        header: 'SL',
        width: '5%',
        render: (_product: Product, index?: number) => startIndex + (index ?? 0) + 1,
      },
      {
        key: 'productDescription',
        header: 'Product Description',
        width: '30%',
        render: (product: Product) => (
          <div className="product-name-cell">
            <article>
              <strong>{product.product_name}</strong>
              {product.quantity && <span style={{ marginLeft: '10px' }}>{product.quantity}</span>}
            </article>
            {product.type && (
              <p
                style={{
                  borderRadius: '5px',
                  padding: '2px 6px',
                  background: '#927572',
                  color: '#fff',
                  fontSize: '0.75rem',
                  width: 'fit-content',
                  marginTop: '4px',
                }}
              >
                {product.type}
              </p>
            )}
            {product.generic_name && (
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                {product.company_name ? product.company_name : product.generic_name}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'company',
        header: 'Company Name',
        width: '20%',
        render: (product: Product) => product.company_name || '—',
      },
      {
        key: 'mrp',
        header: 'MRP',
        width: '12%',
        render: (product: Product) => formatCurrency(product.mrp),
      },
      {
        key: 'rate',
        header: 'Rate',
        width: '12%',
        render: (product: Product) => formatCurrency(getDisplayedRate(product)),
      },
      {
        key: 'stock',
        header: 'Current Stock',
        width: '11%',
        render: (product: Product) => product.in_stock ?? 0,
      },
      {
        key: 'action',
        header: 'Action',
        width: '10%',
        render: (product: Product) => (
          <button className="edit-button" onClick={() => openPriceModal(product)}>
            Edit
          </button>
        ),
      },
    ],
    [priceType, startIndex]
  )

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>loading products...</p>
      </div>
    )
  }

  return (
    <div className="products-container">
      <div className="products-welcome">
        <h1>All Stock</h1>
        <div className="products-welcome-meta">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span className="products-last-sync">Last Sync: {lastSync || 'Loading...'}</span>
          </div>
          {!isOnline && (
            <span className="offline-indicator" style={{ color: '#ef4444', marginLeft: '1rem' }}>
              ⚠ Offline
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div
          className="error-banner"
          style={{
            padding: '12px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #fecaca',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Sale Mode and Bill Mode Controls */}
      <div
        className="business-setup-controls"
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Sale Mode Dropdown */}
        <div className="filter-group filter-select-group">
          <label style={{ fontWeight: 600, marginRight: '8px', marginTop: '7px' }}>
            Sale Mode:
          </label>
          <Select
            className="react-select-container"
            classNamePrefix="react-select"
            options={[
              { value: 0, label: 'Discount' },
              { value: 1, label: 'Peak-Hour' },
            ]}
            value={{ value: saleMode, label: saleMode === 0 ? 'Discount' : 'Peak-Hour' }}
            onChange={async (option) => {
              if (option && option.value !== saleMode) {
                const newModeLabel = option.value === 0 ? 'Discount' : 'Peak-Hour'
                const result = await showModeChangeConfirmation('sale mode', newModeLabel)
                if (result.isConfirmed) {
                  try {
                    await window.electron.businessSetup.updateSaleMode(option.value)
                    setSaleMode(option.value)
                    setErrorMessage('')
                  } catch (error) {
                    console.error('Error updating sale mode:', error)
                    setErrorMessage('Failed to update sale mode')
                  }
                }
              }
            }}
            isSearchable={false}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </div>

        {/* Bill Mode Dropdown */}
        <div className="filter-group filter-select-group">
          <label style={{ fontWeight: 600, marginRight: '8px', marginTop: '7px' }}>
            Bill Mode:
          </label>
          <Select
            className="react-select-container"
            classNamePrefix="react-select"
            options={[
              { value: 0, label: 'Discount' },
              { value: 1, label: 'Peak-Hour' },
            ]}
            value={{ value: billMode, label: billMode === 0 ? 'Discount' : 'Peak-Hour' }}
            onChange={async (option) => {
              if (option && option.value !== billMode) {
                const newModeLabel = option.value === 0 ? 'Discount' : 'Peak-Hour'
                const result = await showModeChangeConfirmation('bill mode', newModeLabel)
                if (result.isConfirmed) {
                  try {
                    await window.electron.businessSetup.updateBillMode(option.value)
                    setBillMode(option.value)
                    setErrorMessage('')
                  } catch (error) {
                    console.error('Error updating bill mode:', error)
                    setErrorMessage('Failed to update bill mode')
                  }
                }
              }
            }}
            isSearchable={false}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <img src={Search} alt="search" />
          <input
            type="text"
            placeholder="search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group filter-select-group">
          <img src={Company} alt="search" />
          <Select
            className="react-select-container-company"
            classNamePrefix="react-select"
            options={companyOptions}
            value={selectedCompanyOption}
            onChange={handleCompanyChange}
            isClearable
            placeholder="All Company"
            noOptionsMessage={() => 'No companies found'}
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </div>

        <div className="filter-info">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of{' '}
          {filteredProducts.length} Products
        </div>
      </div>

      <div className="products-table-section">
        <Table
          columns={tableColumns}
          data={paginatedProducts}
          keyExtractor={(product) => product.id.toString()}
          emptyMessage="no products found"
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          totalItems={filteredProducts.length}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {isModalOpen && selectedProduct && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget && !isSavingPrices) {
              closePriceModal()
            }
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="modal-header">
              <h2>Update Price</h2>
              <p className="modal-subtitle">{selectedProduct.product_name}</p>
            </div>
            <div className="modal-body">
              <p className="modal-offer">
                Mediboy offer price:{' '}
                <strong>{formatCurrency(selectedProduct.mediboy_offer_price)}</strong>
              </p>
              <label className="modal-label">
                Discount Price/Unit (BDT)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  placeholder="leave empty to clear"
                />
              </label>
              <label className="modal-label">
                Peak-Hour Price/Unit (BDT)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={peakHourInput}
                  onChange={(e) => setPeakHourInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  placeholder="leave empty to clear"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="modal-close" onClick={closePriceModal} disabled={isSavingPrices}>
                Close
              </button>
              <button
                className="modal-update"
                onClick={handlePriceUpdate}
                disabled={isSavingPrices}
              >
                {isSavingPrices ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
