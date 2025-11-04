import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Rotate from '../../../assets/rotate.svg'
import Search from '../../../assets/search.svg'
import Wifi from '../../../assets/wifi.svg'
import { RecentStockView } from '../RecentStock/RecentStockView'
import './AddStockView.css'

type BulkFormState = {
  buyPercent: string
  salePercent: string
  expiry: string
  peakSalePercent: string
  mediboyOfferPercent: string
  btcDate: string
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
  batchNo: string
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
  if (Number.isNaN(numericPercent) || !Number.isFinite(numericPercent)) {
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
    batchNo: '',
    stockAlert: '0',
    shelf: '',
  })
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [lastSync, setLastSync] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [refreshKey, setRefreshKey] = useState(0)

  const searchDebounceRef = useRef<number>()
  const searchCloseTimeoutRef = useRef<number>()

  const mrp = selectedProduct ? Number(selectedProduct.retail_max_price ?? 0) : 0

  const bulkDerivedPrices = useMemo(() => {
    if (!selectedProduct || mrp <= 0) {
      return {
        buy: '',
        sale: '',
        peakSale: '',
        offer: '',
      }
    }
    return {
      buy: percentToPrice(bulkForm.buyPercent, mrp),
      sale: percentToPrice(bulkForm.salePercent, mrp),
      peakSale: percentToPrice(bulkForm.peakSalePercent, mrp),
      offer: percentToPrice(bulkForm.mediboyOfferPercent, mrp),
    }
  }, [
    bulkForm.buyPercent,
    bulkForm.salePercent,
    bulkForm.peakSalePercent,
    bulkForm.mediboyOfferPercent,
    mrp,
    selectedProduct,
  ])

  const loadLastSync = useCallback(async () => {
    try {
      // Get latest last_synced_at from products table
      const value = await window.electron.getLatestSyncTime()
      console.log('[AddStock] Latest sync time:', value)

      if (!value) {
        // If no sync time, show current date/time in MM/DD/YYYY HH:MM:SS format
        const now = new Date()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const year = now.getFullYear()
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        setLastSync(`${month}/${day}/${year} ${hours}:${minutes}:${seconds}`)
        return
      }

      setLastSync(value)
    } catch (error) {
      console.error('failed to load last sync timestamp:', error)
      // Show current time on error
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const year = now.getFullYear()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      setLastSync(`${month}/${day}/${year} ${hours}:${minutes}:${seconds}`)
    }
  }, [])

  useEffect(() => {
    loadLastSync()

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
  }, [loadLastSync])

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
    setSingleForm((previous) => ({
      ...previous,
      buy: bulkDerivedPrices.buy || previous.buy,
      sale: bulkDerivedPrices.sale || previous.sale,
      pSale: bulkDerivedPrices.peakSale || previous.pSale,
      mOffer: bulkDerivedPrices.offer || previous.mOffer,
    }))
  }, [
    bulkDerivedPrices.buy,
    bulkDerivedPrices.sale,
    bulkDerivedPrices.peakSale,
    bulkDerivedPrices.offer,
    mrp,
    selectedProduct,
  ])

  const handleSyncProducts = useCallback(async () => {
    setSyncError('')
    setIsSyncing(true)
    try {
      await window.electron.syncProducts()
      await loadLastSync()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to sync products'
      setSyncError(message)
    } finally {
      setIsSyncing(false)
    }
  }, [loadLastSync])

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
    setStatusMessage('')
    setErrorMessage('')
    closeSuggestions()

    setSingleForm((prev) => ({
      ...prev,
      buy: numberToString(product.sale_price) || '',
      sale: numberToString(product.discount_price) || '',
      pSale: numberToString(product.peak_hour_price) || '',
      mOffer: numberToString(product.mediboy_offer_price) || '',
    }))
  }

  const handleBulkChange =
    (field: keyof BulkFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setBulkForm((previous) => ({ ...previous, [field]: value }))
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
      btcDate: checked ? getDateInputValue(new Date()) : '',
    }))
  }

  const resetForms = () => {
    setBulkForm({
      buyPercent: '',
      salePercent: '',
      expiry: '',
      peakSalePercent: '',
      mediboyOfferPercent: '',
      btcDate: '',
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
      batchNo: '',
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
    setStatusMessage('')
    setErrorMessage('')

    if (!selectedProduct) {
      setErrorMessage('select a product before adding stock')
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
    const batchNo = singleForm.batchNo.trim()
    const shelf = singleForm.shelf.trim() || null

    // Get expiry date
    const expiryDate = singleForm.expiry
    if (!expiryDate) {
      setErrorMessage('expiry date is required')
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
      setErrorMessage('fill out all required pricing fields before submitting')
      return
    }

    if (quantity <= 0) {
      setErrorMessage('quantity must be greater than zero')
      return
    }

    if (!batchNo) {
      setErrorMessage('batch number is required')
      return
    }

    // Price validation
    // Peak Hour Price must be >= Sale Price
    if (peakHourPrice < discountPrice) {
      setErrorMessage(
        'পিক আওয়ার প্রাইস কখনোই সেল প্রাইসের চেয়ে কম হতে পারবে না। অনুগ্রহ করে সঠিক মূল্য দিন।'
      )
      return
    }

    // Mediboy Offer Price must be < Sale Price AND < Peak Hour Price
    if (offerPrice >= discountPrice || offerPrice >= peakHourPrice) {
      setErrorMessage(
        'Mediboy অফার প্রাইস অবশ্যই সেল প্রাইস এবং পিক আওয়ার প্রাইস — দুটোই এর চেয়ে কম হতে হবে।'
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
        // Try direct API call first (old mechanism)
        try {
          await window.electron.addStock(payload)
          setStatusMessage('Product stock added and broadcasted successfully')
          setRefreshKey((prev) => prev + 1) // Trigger Recent Stock table refresh
          await loadLastSync() // Refresh sync time
          resetForms()
        } catch (apiError) {
          // If API fails, fall back to queue
          console.warn('API call failed, saving to queue:', apiError)
          await window.electron.stockQueue.addOffline(payload)
          setStatusMessage(
            'Offline mode: Stock saved to queue. Will sync when connection is restored.'
          )
          setRefreshKey((prev) => prev + 1) // Trigger Recent Stock table refresh
          resetForms()
        }
      } else {
        // Offline - save to queue
        await window.electron.stockQueue.addOffline(payload)
        setStatusMessage(
          'Offline mode: Stock saved to queue. Will sync when connection is restored.'
        )
        setRefreshKey((prev) => prev + 1) // Trigger Recent Stock table refresh
        resetForms()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unable to add stock'
      setErrorMessage(message)
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
                      <th>Company Name</th>
                      <th>MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct ? (
                      <tr>
                        <td>
                          <strong>{selectedProduct.product_name}</strong>
                          {selectedProduct.generic_name && (
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                              {selectedProduct.generic_name}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'start' }}>
                          {selectedProduct.company_name || '—'}
                        </td>
                        <td>{formatCurrency(selectedProduct.mrp)}</td>
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
                      placeholder='10'
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
                      placeholder='10'
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
                      placeholder='10'
                    />
                  </div>
                    <div className='add-stock-input-offer-section'>
                    <h2>M-Offer*</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleForm.mOffer}
                      onChange={handleSingleChange('mOffer')}
                      required
                      placeholder='12'
                    />
                  </div>
                </div>

                <div className="input-date-section">
                  <div className="add-stock-bottom-input-date">
                    <h2>Exp*</h2>
                    <input
                      type="text"
                      value={singleForm.expiry}
                      onChange={handleSingleChange('expiry')}
                      placeholder="YYYY/MM/DD"
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
                 <div style={{marginTop:"-20px"}} className="add-stock-input-checkbox">
                    <input
                      type="checkbox"
                      checked={singleForm.autoBtc}
                      onChange={handleAutoBtcToggle}
                    />
                    <h2>Auto BTC</h2>
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
                  {/* <div className="add-stock-input-section">
                    <h2>Batch No*</h2>
                    <input
                      type="text"
                      value={singleForm.batchNo}
                      onChange={handleSingleChange('batchNo')}
                      placeholder="Batch no"
                      required
                    />
                  </div> */}
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
                    <div className='add-stock-input-flex'>
                      <h2>Buy%</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.buyPercent}
                      onChange={handleBulkChange('buyPercent')}
                      placeholder='10'
                    />
                    </div>
                    {bulkForm.buyPercent && bulkDerivedPrices.buy && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px' }}>
                        ≈ ৳{bulkDerivedPrices.buy}
                      </div>
                    )}
                  </div>
                  <div className="add-stock-input">
                    <div className='add-stock-input-flex'>
                      <h2>Sale%</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.salePercent}
                      onChange={handleBulkChange('salePercent')}
                      placeholder='10'
                    />
                    </div>
                    {bulkForm.salePercent && bulkDerivedPrices.sale && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px' }}>
                        ≈ ৳{bulkDerivedPrices.sale}
                      </div>
                    )}
                  </div>
                  <div className="add-stock-input">
                    <div className='add-stock-input-flex'>
                      <h2>P-Sale%</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.peakSalePercent}
                      onChange={handleBulkChange('peakSalePercent')}
                      placeholder='10'
                    />
                    </div>
                    {bulkForm.peakSalePercent && bulkDerivedPrices.peakSale && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px' }}>
                        ≈ ৳{bulkDerivedPrices.peakSale}
                      </div>
                    )}
                  </div>
                  <div className="add-stock-input-offer">
                    <div className='add-stock-input-offer-section'>
                      <h2>M-Offer %</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.mediboyOfferPercent}
                      onChange={handleBulkChange('mediboyOfferPercent')}
                      placeholder='12'
                    />
                    </div>
                    {bulkForm.mediboyOfferPercent && bulkDerivedPrices.offer && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px' }}>
                        ≈ ৳{bulkDerivedPrices.offer}
                      </div>
                    )}
                  </div>
                </div>

                <div className="input-date-section">
                  <div className="add-stock-bottom-input-date">
                    <h2>Exp</h2>
                    <input
                      type="text"
                      value={bulkForm.expiry}
                      onChange={handleBulkChange('expiry')}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>
                  <div className="add-stock-bottom-input-date">
                    <h2>BTC</h2>
                    <input
                      type="text"
                      value={bulkForm.btcDate}
                      onChange={handleBulkChange('btcDate')}
                      placeholder="GB-YYYY/MM/DD"
                    />
                  </div>
                </div>
              </div>
                  <div className='button-section'>
                    <div className='apply-btn'>
                      <input type="checkbox" />
                      <h2>Apply</h2>
                    </div>
                    <h2 className='clear-btn'>Clear</h2>
                  </div>

            </div>
          </form>
        </div>

        {(statusMessage || errorMessage) && (
          <div className="form-status" style={{ marginTop: '16px' }}>
            {statusMessage && <p className="form-status-success">{statusMessage}</p>}
            {errorMessage && <p className="form-status-error">{errorMessage}</p>}
          </div>
        )}
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
          <h3>{isOnline ? 'Updated At' : 'Offline Mode'}</h3>
          <p>{isOnline ? lastSync || 'Not synced yet' : 'Queue mode active'}</p>
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
