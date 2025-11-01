import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import Company from '../../../assets/company.svg'
import Discount from '../../../assets/discount.svg'
import Search from '../../../assets/search.svg'
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
  const hasLoadedRef = useRef(false)
  const latestSyncRequestRef = useRef(syncRequestId)

  const updateLastSyncTimestamp = useCallback(async () => {
    try {
      const value = await window.electron.getLastSync()
      if (value) {
        const parsed = new Date(value)
        setLastSync(Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString())
      } else {
        setLastSync('')
      }
    } catch (error) {
      console.error('failed to load last sync timestamp:', error)
    }
  }, [])

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
      await updateLastSyncTimestamp()
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
      await updateLastSyncTimestamp()

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

    // search filter - check product name and generic name
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          (product.product_name ?? '').toLowerCase().includes(term) ||
          (product.generic_name ?? '').toLowerCase().includes(term) ||
          (product.company_name ?? '').toLowerCase().includes(term) ||
          String(product.in_stock ?? '')
            .toLowerCase()
            .includes(term)
      )
    }

    // company filter
    if (selectedCompany) {
      filtered = filtered.filter((product) => product.company_id === selectedCompany)
    }

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

    const offerPrice = selectedProduct.mediboy_offer_price
    if (
      offerPrice !== null &&
      offerPrice !== undefined &&
      (discountPrice <= offerPrice || peakHourPrice <= offerPrice)
    ) {
      alert('discount and peak-hour prices must be greater than the Mediboy offer price')
      return
    }

    setIsSavingPrices(true)
    try {
      const updatedProduct = await window.electron.updateProductPrices(selectedProduct.id, {
        discount_price: discountPrice,
        peak_hour_price: peakHourPrice,
      })

      if (updatedProduct) {
        setProducts((prevProducts) =>
          prevProducts.map((product) =>
            product.id === updatedProduct.id ? { ...product, ...updatedProduct } : product
          )
        )
      }

      closePriceModal()
    } catch (error) {
      console.error('failed to update prices:', error)
      const message = error instanceof Error ? error.message : 'failed to update prices'
      alert(message)
    } finally {
      setIsSavingPrices(false)
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
            <span className="product-name">{product.product_name}</span>
            {product.generic_name && (
              <span className="product-generic">{product.generic_name}</span>
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
          {lastSync && <span className="products-last-sync">last sync: {lastSync}</span>}
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

        <div className="filter-group filter-discount filter-select-group">
          <img src={Discount} alt="search" />
          <Select
            className="react-select-container"
            classNamePrefix="react-select"
            options={priceTypeOptions}
            value={priceTypeOptions.find((option) => option.value === priceType) ?? null}
            onChange={(option: SingleValue<SelectOption<PriceMode>>) => {
              setPriceType(option?.value ?? 'discount')
            }}
            isSearchable={false}
            placeholder="Price Type"
            menuPortalTarget={document.body}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </div>

        <div className="filter-group filter-select-group">
          <img src={Company} alt="search" />
          <Select
            className="react-select-container"
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
          <div className="modal-content">
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
