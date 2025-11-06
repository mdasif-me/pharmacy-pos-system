import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Rotate from '../../../assets/rotate.svg'
import Search from '../../../assets/search.svg'
import Wifi from '../../../assets/wifi.svg'
import { showError, showSuccess } from '../../../utils/alerts'
import { RecentStockView } from '../RecentStock/RecentStockView'
import './AddStockView.css'

type BulkFormState = {
  buyPercent: string
  salePercent: string
  expiry: string
  peakSalePercent: string
  mediboyOfferPercent: string
  btcDate: string
  autoBtc: boolean
  applyBulk: boolean
}

type SingleFormState = {
  buy: string
  sale: string
  expiry: string
  autoBtc: boolean
  pSale: string
  mOffer: string
  promoExpiry: string
  btcDate: string
  qty: string
  stockAlert: string
  shelf: string
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

const getDateInputValue = (date: Date) => date.toISOString().slice(0, 10)

const numberToString = (value?: number | null) => {
  if (value === null || value === undefined) {
    return ''
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : ''
}

const percentToPrice = (percentValue: string, mrp: number) => {
  const numericPercent = Number.parseFloat(percentValue)
  if (Number.isNaN(numericPercent) || !Number.isFinite(numericPercent) || percentValue === '') {
    return ''
  }
  const computed = mrp - mrp * (numericPercent / 100)
  const safeValue = Number.isFinite(computed) ? Math.max(computed, 0) : 0
  return safeValue.toFixed(2)
}

export const AddStockView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [bulkForm, setBulkForm] = useState<BulkFormState>({
    buyPercent: '',
    salePercent: '',
    expiry: '',
    peakSalePercent: '',
    mediboyOfferPercent: '',
    btcDate: '',
    autoBtc: false,
    applyBulk: false,
  })
  const [singleForm, setSingleForm] = useState<SingleFormState>({
    buy: '',
    sale: '',
    expiry: '',
    autoBtc: false,
    pSale: '',
    mOffer: '',
    promoExpiry: '',
    btcDate: '',
    qty: '',
    stockAlert: '0',
    shelf: '',
  })
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [lastSync, setLastSync] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [refreshKey, setRefreshKey] = useState(0)

  const searchDebounceRef = useRef<number>()
  const searchCloseTimeoutRef = useRef<number>()

  const mrp = selectedProduct ? Number(selectedProduct.mrp ?? 0) : 0

  // Load last sync timestamp from products
  const loadLastSyncTimestamp = useCallback(async () => {
    try {
      const products = await window.electron.getAllProducts()
      const productsArray = Array.isArray(products) ? products : []

      if (productsArray.length > 0) {
        const productsWithSyncTime = productsArray.filter((p) => p.last_synced_at)

        if (productsWithSyncTime.length > 0) {
          let mostRecentSyncTime = ''
          for (const product of productsWithSyncTime) {
            if (product.last_synced_at && product.last_synced_at > mostRecentSyncTime) {
              mostRecentSyncTime = product.last_synced_at
            }
          }
          setLastSync(mostRecentSyncTime)
          return
        }
      }

      setLastSync('No last sync info found')
    } catch (error) {
      console.error('[AddStock] Error loading last sync timestamp:', error)
      setLastSync('Error loading sync time')
    }
  }, [])

  const bulkDerivedPrices = useMemo(() => {
    if (!selectedProduct || mrp <= 0) {
      return {
        buy: '',
        sale: '',
        peakSale: '',
        offer: '',
      }
    }

    // Calculate prices for all percentages
    const buyPrice = bulkForm.buyPercent ? percentToPrice(bulkForm.buyPercent, mrp) : ''
    const salePrice = bulkForm.salePercent ? percentToPrice(bulkForm.salePercent, mrp) : ''
    const peakSalePrice = bulkForm.peakSalePercent
      ? percentToPrice(bulkForm.peakSalePercent, mrp)
      : ''
    const offerPrice = bulkForm.mediboyOfferPercent
      ? percentToPrice(bulkForm.mediboyOfferPercent, mrp)
      : ''

    return {
      buy: buyPrice,
      sale: salePrice,
      peakSale: peakSalePrice,
      offer: offerPrice,
    }
  }, [
    bulkForm.buyPercent,
    bulkForm.salePercent,
    bulkForm.peakSalePercent,
    bulkForm.mediboyOfferPercent,
    mrp,
    selectedProduct,
  ])

  // Load last sync timestamp on component mount
  useEffect(() => {
    loadLastSyncTimestamp()
  }, [loadLastSyncTimestamp])

  useEffect(() => {
    // Track online/offline status
    const handleOnline = () => {
      setIsOnline(true)
      console.log('[AddStock] Connection restored - Online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('[AddStock] Connection lost - Offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isSearchOpen) {
      return undefined
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
    }

    setIsSearching(true)
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const query = searchTerm.trim()
        console.log('Searching for:', query)
        const products = await window.electron.searchProducts(query)
        console.log('Search results:', products)
        setSuggestions(products ?? [])
      } catch (error) {
        console.error('product search failed:', error)
        setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current)
      }
    }
  }, [isSearchOpen, searchTerm])

  useEffect(() => {
    if (isSearchOpen) {
      return
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = undefined
    }

    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
      searchCloseTimeoutRef.current = undefined
    }

    setIsSearching(false)
    setSuggestions([])
  }, [isSearchOpen])

  useEffect(() => {
    if (!selectedProduct || mrp <= 0) {
      return
    }

    if (bulkForm.applyBulk) {
      setSingleForm((previous) => ({
        ...previous,
        buy: bulkDerivedPrices.buy || '',
        sale: bulkDerivedPrices.sale || '',
        pSale: bulkDerivedPrices.peakSale || '',
        mOffer: bulkDerivedPrices.offer || '',
        expiry: bulkForm.expiry,
        btcDate: bulkForm.btcDate,
        stockAlert: String(
          selectedProduct.current_stock?.stock_alert ?? selectedProduct.stock_alert ?? 0
        ),
      }))
    } else {
      setSingleForm((previous) => ({
        ...previous,
        buy: '',
        sale: numberToString(selectedProduct.discount_price) || '',
        pSale: numberToString(selectedProduct.peak_hour_price) || '',
        mOffer: numberToString(selectedProduct.mediboy_offer_price) || '',
        expiry: '',
        btcDate: '',
        stockAlert: String(
          selectedProduct.current_stock?.stock_alert ?? selectedProduct.stock_alert ?? 0
        ),
      }))
    }
  }, [
    mrp,
    selectedProduct,
    bulkForm.applyBulk,
    bulkForm.expiry,
    bulkForm.btcDate,
    bulkForm.buyPercent,
    bulkForm.salePercent,
    bulkForm.peakSalePercent,
    bulkForm.mediboyOfferPercent,
  ])

  // Auto-generate BTC for single form when expiry changes and autoBtc is checked
  useEffect(() => {
    if (singleForm.autoBtc && singleForm.expiry) {
      const formattedDate = singleForm.expiry.replace(/-/g, '/')
      const btcValue = `GB-${formattedDate}`
      setSingleForm((previous) => {
        if (previous.btcDate !== btcValue) {
          return {
            ...previous,
            btcDate: btcValue,
          }
        }
        return previous
      })
    }
  }, [singleForm.autoBtc, singleForm.expiry])

  // Auto-generate BTC for bulk form when expiry changes
  useEffect(() => {
    if (bulkForm.expiry) {
      const btcValue = `GB-${bulkForm.expiry}`
      setBulkForm((previous) => {
        if (previous.btcDate !== btcValue) {
          return {
            ...previous,
            btcDate: btcValue,
          }
        }
        return previous
      })
    }
  }, [bulkForm.expiry])

  const handleSyncProducts = useCallback(async () => {
    setSyncError('')
    setIsSyncing(true)
    try {
      await window.electron.syncProducts()
      await loadLastSyncTimestamp()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to sync products'
      setSyncError(message)
    } finally {
      setIsSyncing(false)
    }
  }, [loadLastSyncTimestamp])

  const closeSuggestions = useCallback(() => {
    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
      searchCloseTimeoutRef.current = undefined
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = undefined
    }

    setIsSearchOpen(false)
    setIsSearching(false)
    setSuggestions([])
  }, [])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSearchTerm(product.product_name ?? '')
    setSuggestions([])
    closeSuggestions()
  }

  const handleBulkChange =
    (field: keyof BulkFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value, type, checked } = event.target
      setBulkForm((previous) => ({
        ...previous,
        [field]: type === 'checkbox' ? checked : value,
      }))
    }

  const handleSingleChange =
    (field: keyof Omit<SingleFormState, 'autoBtc'>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setSingleForm((previous) => ({ ...previous, [field]: value }))
    }

  const handleAutoBtcToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked
    setSingleForm((previous) => ({
      ...previous,
      autoBtc: checked,
      btcDate: checked && previous.expiry ? `GB-${previous.expiry}` : '',
    }))
  }

  const resetForms = () => {
    // Only reset single form and product selection, keep bulk values
    setSingleForm({
      buy: '',
      sale: '',
      expiry: '',
      autoBtc: false,
      pSale: '',
      mOffer: '',
      promoExpiry: '',
      btcDate: '',
      qty: '',
      stockAlert: '0',
      shelf: '',
    })
    setSelectedProduct(null)
    setSearchTerm('')
    setSuggestions([])
    closeSuggestions()
  }

  const resetAllForms = () => {
    // Reset everything (for Clear button)
    setBulkForm({
      buyPercent: '',
      salePercent: '',
      expiry: '',
      peakSalePercent: '',
      mediboyOfferPercent: '',
      btcDate: '',
      autoBtc: false,
      applyBulk: false,
    })
    setSingleForm({
      buy: '',
      sale: '',
      expiry: '',
      autoBtc: false,
      pSale: '',
      mOffer: '',
      promoExpiry: '',
      btcDate: '',
      qty: '',
      stockAlert: '0',
      shelf: '',
    })
    setSelectedProduct(null)
    setSearchTerm('')
    setSuggestions([])
    closeSuggestions()
  }

  const handleSearchFocus = () => {
    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
      searchCloseTimeoutRef.current = undefined
    }
    setIsSearchOpen(true)
  }

  const handleSearchBlur = () => {
    if (searchCloseTimeoutRef.current) {
      window.clearTimeout(searchCloseTimeoutRef.current)
    }
    searchCloseTimeoutRef.current = window.setTimeout(() => {
      closeSuggestions()
    }, 150)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSuggestions()
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedProduct) {
      showError('Validation Error', 'select a product before adding stock')
      return
    }

    // Parse all required fields
    const productId = selectedProduct.id
    const quantity = Number.parseInt(singleForm.qty, 10)
    const purchasePrice = Number.parseFloat(singleForm.buy)
    const discountPrice = Number.parseFloat(singleForm.sale)
    const peakHourPrice = Number.parseFloat(singleForm.pSale)
    const offerPrice = Number.parseFloat(singleForm.mOffer)
    const stockAlert = Number.parseInt(singleForm.stockAlert || '0', 10)
    const batchNo = singleForm.btcDate.trim()
    const shelf = singleForm.shelf.trim() || null

    // Get expiry date
    const expiryDate = singleForm.expiry
    if (!expiryDate) {
      showError('Validation Error', 'expiry date is required')
      return
    }

    // Validate numeric fields
    if (
      Number.isNaN(quantity) ||
      Number.isNaN(purchasePrice) ||
      Number.isNaN(discountPrice) ||
      Number.isNaN(peakHourPrice) ||
      Number.isNaN(offerPrice)
    ) {
      showError('Validation Error', 'fill out all required pricing fields before submitting')
      return
    }

    if (quantity <= 0) {
      showError('Validation Error', 'quantity must be greater than zero')
      return
    }

    if (!batchNo) {
      showError('Validation Error', 'BTC (batch number) is required')
      return
    }

    // Price validation
    // Peak Hour Price must be >= Sale Price
    if (peakHourPrice < discountPrice) {
      showError(
        'Price Validation Error',
        'পিক আওয়ার প্রাইস কখনোই সেল প্রাইসের চেয়ে কম হতে পারবে না। অনুগ্রহ করে সঠিক মূল্য দিন।'
      )
      return
    }

    // Mediboy Offer Price must be < Sale Price AND < Peak Hour Price
    if (offerPrice >= discountPrice || offerPrice >= peakHourPrice) {
      showError(
        'Price Validation Error',
        'Mediboy অফার প্রাইস অবশ্যই সেল প্রাইস এবং পিক আওয়ার প্রাইস — দুটোই এর চেয়ে কম হতে হবে।'
      )
      return
    }

    // Calculate percentage off from MRP
    const percOff = mrp > 0 ? ((mrp - discountPrice) / mrp) * 100 : 0

    // Format date as YYYY/MM/DD
    const formattedExpiry = expiryDate.replace(/-/g, '/')

    const payload = {
      product_id: productId,
      stock_mrp: mrp,
      purchase_price: purchasePrice,
      discount_price: discountPrice,
      peak_hour_price: peakHourPrice,
      offer_price: offerPrice,
      perc_off: percOff,
      batch_no: batchNo,
      expire_date: formattedExpiry,
      qty: quantity,
      stock_alert: stockAlert,
      shelf: shelf,
    }

    setIsBroadcasting(true)
    try {
      // Check if online - use direct API, otherwise use queue
      const isOnline = navigator.onLine

      if (isOnline) {
        try {
          await window.electron.addStock(payload)
          showSuccess('Success', 'Product stock added and broadcasted successfully')
          setRefreshKey((prev) => prev + 1)
          resetForms()
        } catch (apiError) {
          console.warn('API call failed, saving to queue:', apiError)
          await window.electron.stockQueue.addOffline(payload)
          showSuccess(
            'Offline Mode',
            'Stock saved to queue. Will sync when connection is restored.'
          )
          setRefreshKey((prev) => prev + 1)
          resetForms()
        }
      } else {
        await window.electron.stockQueue.addOffline(payload)
        showSuccess('Offline Mode', 'Stock saved to queue. Will sync when connection is restored.')
        setRefreshKey((prev) => prev + 1)
        resetForms()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unable to add stock'
      showError('Error', message)
    } finally {
      setIsBroadcasting(false)
    }
  }

  return (
    <div>
      {syncError && (
        <div className="form-status">
          <p className="form-status-error">{syncError}</p>
        </div>
      )}

      <section className="add-stock-section">
        <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '700' }}>Add Stock</h3>
        <div className="add-stock-container">
          <form className="add-stock-form" onSubmit={handleSubmit}>
            {/* Left Column - Search and Product Table */}
            <div className="left-section">
              <div className="formSearch">
                <div className="searchIcon">
                  <img src={Search} alt="search" />
                </div>
                <input
                  type="text"
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyDown={handleSearchKeyDown}
                  autoComplete="off"
                />
                {isSearchOpen && (
                  <ul className="search-suggestions">
                    {isSearching && suggestions.length === 0 && (
                      <li className="search-suggestion loading">searching...</li>
                    )}
                    {!isSearching && suggestions.length === 0 && (
                      <li className="search-suggestion empty">no products found</li>
                    )}
                    {suggestions.map((product) => {
                      return (
                        <li
                          key={product.id}
                          className="search-suggestion"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            handleSelectProduct(product)
                          }}
                        >
                          <div className="search-suggestion-main">
                            <span className="search-suggestion-type">
                              {product.type ? `${product.type.slice(0, 3)}.` : ''}
                            </span>
                            <span className="search-suggestion-name">{product.product_name}</span>
                            {product.quantity && (
                              <span className="search-suggestion-quantity">{product.quantity}</span>
                            )}
                          </div>
                          <div className="search-suggestion-details">
                            <span className="search-suggestion-company">
                              {product.company_name || 'Unknown Company'}
                            </span>
                            <span className="search-suggestion-price">
                              {formatCurrency(product.mrp)}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="products-table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product Description</th>
                      <th>MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct ? (
                      <tr>
                        <td>
                          <article>
                            <strong>{selectedProduct.product_name}</strong>
                            <span style={{ marginLeft: '10px' }}>{selectedProduct.quantity}</span>
                          </article>
                          <p
                            style={{
                              borderRadius: '5px',
                              padding: '2px 6px',
                              background: '#927572',
                              color: '#fff',
                              fontSize: '0.75rem',
                              width: 'fit-content',
                            }}
                          >
                            {selectedProduct.type}
                          </p>
                          {selectedProduct.generic_name && (
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                              {selectedProduct.company_name && `${selectedProduct.company_name}`}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            textAlign: 'left',
                            color: '#046C2E',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                          }}
                        >
                          {formatCurrency(selectedProduct.mrp)}
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>
                          No product selected
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Single Stock */}
              <div className="full-input-section" style={{ marginTop: '12px' }}>
                <div className="input-heder">
                  <div className="input-heder-stock">Single Stock</div>
                  <div className="input-heder-note">
                    Note : If you stock as bulk then price and other input will place auto
                  </div>
                </div>

                <div className="input-section">
                  <div className="add-stock-input">
                    <h2>Buy*</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleForm.buy}
                      onChange={handleSingleChange('buy')}
                      placeholder="10"
                    />
                  </div>
                  <div className="add-stock-input">
                    <h2>Sale*</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleForm.sale}
                      onChange={handleSingleChange('sale')}
                      required
                      placeholder="10"
                    />
                  </div>
                  <div className="add-stock-input">
                    <h2>P-Sale*</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleForm.pSale}
                      onChange={handleSingleChange('pSale')}
                      required
                      placeholder="10"
                    />
                  </div>
                  <div className="add-stock-input-offer-section">
                    <h2>M-Offer*</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleForm.mOffer}
                      onChange={handleSingleChange('mOffer')}
                      required
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="input-date-section">
                  <div className="add-stock-bottom-input-date">
                    <h2>Exp*</h2>
                    <input
                      type="date"
                      value={singleForm.expiry}
                      onChange={handleSingleChange('expiry')}
                      required
                    />
                  </div>

                  <div className="add-stock-bottom-input-date">
                    <h2>BTC</h2>
                    <input
                      type="text"
                      value={singleForm.btcDate}
                      onChange={handleSingleChange('btcDate')}
                      placeholder="GB-YYYY/MM/DD"
                      required
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }} className="add-stock-input-checkbox">
                  <label
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}
                  >
                    <input
                      type="checkbox"
                      checked={singleForm.autoBtc}
                      onChange={handleAutoBtcToggle}
                      style={{ cursor: 'pointer', margin: 0 }}
                    />
                    <h2 style={{ margin: 0 }}>Auto BTC</h2>
                  </label>
                </div>
                <div className="input-section">
                  <div className="add-stock-input-offer">
                    <h2>QTY*</h2>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={singleForm.qty}
                      onChange={handleSingleChange('qty')}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div className="add-stock-input-section">
                    <h2>STK-ALT* </h2>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={singleForm.stockAlert}
                      onChange={handleSingleChange('stockAlert')}
                      placeholder="1000"
                    />
                  </div>
                  <div className="add-stock-input-section">
                    <h2>Shelf</h2>
                    <input
                      type="text"
                      value={singleForm.shelf}
                      onChange={handleSingleChange('shelf')}
                      placeholder="AC-120"
                    />
                  </div>
                </div>

                <div className="add-input-stock">
                  <button type="submit" disabled={isBroadcasting || !selectedProduct}>
                    {isBroadcasting ? 'Submitting...' : 'ADD STOCK'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Bulk Stock Helper and Single Stock */}
            <div className="right-section">
              {/* Bulk Stock Helper */}
              <div className="full-input-section">
                <div className="input-heder">
                  <div className="input-heder-stock">Bulk Stock Helper</div>
                  <div className="input-heder-note">
                    Note : Bulk buy%,Sale%,P-sale%,M-offer% off calculate base on MRP
                  </div>
                </div>

                <div className="input-section">
                  <div className="add-stock-input">
                    <div className="add-stock-input-flex">
                      <h2>Buy%</h2>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkForm.buyPercent}
                        onChange={handleBulkChange('buyPercent')}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="add-stock-input">
                    <div className="add-stock-input-flex">
                      <h2>Sale%</h2>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkForm.salePercent}
                        onChange={handleBulkChange('salePercent')}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="add-stock-input">
                    <div className="add-stock-input-flex">
                      <h2>P-Sale%</h2>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkForm.peakSalePercent}
                        onChange={handleBulkChange('peakSalePercent')}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <div className="add-stock-input-offer">
                    <div className="add-stock-input-offer-section">
                      <h2>M-Offer %</h2>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bulkForm.mediboyOfferPercent}
                        onChange={handleBulkChange('mediboyOfferPercent')}
                        placeholder="12"
                      />
                    </div>
                  </div>
                </div>

                <div className="input-date-section">
                  <div className="add-stock-bottom-input-date">
                    <h2>Exp</h2>
                    <input
                      type="date"
                      value={bulkForm.expiry}
                      onChange={handleBulkChange('expiry')}
                    />
                  </div>
                  <div className="add-stock-bottom-input-date">
                    <h2>BTC</h2>
                    <input
                      type="text"
                      value={bulkForm.btcDate}
                      placeholder="GB-YYYY-MM-DD"
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <div className="button-section">
                <label
                  className="apply-btn"
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}
                >
                  <input
                    type="checkbox"
                    checked={bulkForm.applyBulk}
                    onChange={handleBulkChange('applyBulk')}
                    style={{ cursor: 'pointer', margin: 0 }}
                  />
                  <h2 style={{ margin: 0 }}>Apply</h2>
                </label>
                <button type="button" className="clear-btn" onClick={resetAllForms}>
                  Clear
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
      {/* Recent Stock Table */}
      <RecentStockView key={refreshKey} />
      <header className="dashboard-header">
        <button className="status-button" type="button" title={isOnline ? 'Online' : 'Offline'}>
          <img
            src={Wifi}
            alt="Connection Status"
            width="40"
            style={{ opacity: isOnline ? 1 : 0.3 }}
          />
          {!isOnline && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                background: '#ef4444',
                borderRadius: '50%',
              }}
            />
          )}
        </button>
        <article>
          <h3>{isOnline ? 'Last Sync' : 'Offline Mode'}</h3>
          <p>{isOnline ? lastSync || 'Loading...' : 'Queue mode active'}</p>
        </article>
        <button
          className={`sync-control ${isSyncing ? 'spin' : ''}`}
          onClick={handleSyncProducts}
          disabled={isSyncing || !isOnline}
          type="button"
          title={isOnline ? 'Sync Products' : 'Cannot sync while offline'}
        >
          <img src={Rotate} alt="Sync" />
        </button>
      </header>
    </div>
  )
}
