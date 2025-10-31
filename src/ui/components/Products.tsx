import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Select, { SingleValue } from 'react-select'
import Company from '../assets/company.svg'
import Discount from '../assets/discount.svg'
import Search from '../assets/search.svg'
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

const billModeOptions: SelectOption<PriceMode>[] = [
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
  }, [products, searchTerm, selectedCompany])

  useEffect(() => {
    onSyncStatusChange?.({ isSyncing, lastSync })
  }, [isSyncing, lastSync, onSyncStatusChange])

  const syncProducts = useCallback(async () => {
    try {
      setIsSyncing(true)

      // fetch latest products from api and store locally
      const apiProducts = await window.electron.syncProducts()
      setProducts(apiProducts ?? [])

      // refresh filter options after sync
      const [companiesData] = await Promise.all([window.electron.getUniqueCompanies()])

      setCompanies(companiesData ?? [])
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
      setProducts(localProducts ?? [])

      // load filter options
      const [companiesData, typesData] = await Promise.all([
        window.electron.getUniqueCompanies(),
        window.electron.getUniqueTypes(),
      ])

      setCompanies(companiesData ?? [])
      await updateLastSyncTimestamp()

      // if no local products, sync from api
      if (localProducts.length === 0) {
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
    let filtered = [...products]

    // search filter - check product name and generic name
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          (product.productName ?? '').toLowerCase().includes(term) ||
          (product.genericName ?? '').toLowerCase().includes(term) ||
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

  const companyOptions = useMemo<SelectOption<number>[]>(
    () =>
      companies.map((company) => ({
        value: company.company_id,
        label: company.company_name,
      })),
    [companies]
  )

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
          />
        </div>
        <div className="filter-info">
          Showing {filteredProducts.length} of {products.length} Products
        </div>
      </div>

      <div className="products-table-wrapper">
        {filteredProducts.length > 0 ? (
          <table className="products-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Type</th>
                <th>MRP/UNIT</th>
                <th>{priceType === 'discount' ? 'Discount Price/UNIT' : 'Peak-Hour Price/UNIT'}</th>
                <th>Company Name</th>
                <th>Current Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const categoryLabel =
                  product.category_name ||
                  (product.category_id ? `Category ${product.category_id}` : '')

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name-cell">
                        <span className="product-name">{product.productName}</span>
                        {product.genericName && (
                          <span className="product-generic">{product.genericName}</span>
                        )}
                        {categoryLabel && <span className="product-category">{categoryLabel}</span>}
                      </div>
                    </td>
                    <td>{product.type || '—'}</td>
                    <td>{formatCurrency(product.retail_max_price)}</td>
                    <td>{formatCurrency(getDisplayedRate(product))}</td>
                    <td>{product.company_name || '—'}</td>
                    <td>{product.in_stock ?? 0}</td>
                    <td>
                      <button className="edit-button" onClick={() => openPriceModal(product)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-products">
            <p>no products found</p>
            {products.length === 0 && (
              <button onClick={syncProducts} className="sync-button">
                sync products from server
              </button>
            )}
          </div>
        )}
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
              <p className="modal-subtitle">{selectedProduct.productName}</p>
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
