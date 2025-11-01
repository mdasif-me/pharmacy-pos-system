import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Rotate from '../../../assets/rotate.svg'
import Search from '../../../assets/search.svg'
import Wifi from '../../../assets/wifi.svg'
import { broadcastStockUpdate, StockBroadcastPayload } from '../../../services/broadcastService'
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
  })
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [lastSync, setLastSync] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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
      const value = await window.electron.getLastSync()
      console.log('value', value)
      if (!value) {
        setLastSync('')
        return
      }
      const parsed = new Date(value)
      setLastSync(Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString())
    } catch (error) {
      console.error('failed to load last sync timestamp:', error)
    }
  }, [])

  useEffect(() => {
    loadLastSync()
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

    const productId = selectedProduct.id
    const quantity = Number.parseInt(singleForm.qty, 10)
    const discountPrice = Number.parseFloat(singleForm.sale)
    const peakHourPrice = Number.parseFloat(singleForm.pSale)
    const mediboyOfferPrice = Number.parseFloat(singleForm.mOffer)
    const syncSourceDate = singleForm.btcDate || bulkForm.btcDate
    const syncDate = syncSourceDate ? new Date(syncSourceDate) : new Date()

    if (
      Number.isNaN(quantity) ||
      Number.isNaN(discountPrice) ||
      Number.isNaN(peakHourPrice) ||
      Number.isNaN(mediboyOfferPrice)
    ) {
      setErrorMessage('fill out stock quantity and pricing before submitting')
      return
    }

    if (quantity <= 0) {
      setErrorMessage('quantity must be greater than zero')
      return
    }

    if (Number.isNaN(syncDate.getTime())) {
      setErrorMessage('enter a valid BTC date')
      return
    }

    const payload: StockBroadcastPayload = {
      product_id: productId,
      in_stock: quantity,
      discount_price: discountPrice,
      peak_hour_price: peakHourPrice,
      mediboy_offer_price: mediboyOfferPrice,
      sync_at: syncDate.toISOString(),
    }

    setIsBroadcasting(true)
    try {
      await broadcastStockUpdate(payload)
      setStatusMessage('stock broadcast queued successfully')
      resetForms()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unable to broadcast stock update'
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
                      console.log('product', product)
                      return (
                        <li
                          key={product.id}
                          className="search-suggestion"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            handleSelectProduct(product)
                          }}
                        >
                          <span className="search-suggestion-name">{product.product_name}</span>
                          <span className="search-suggestion-meta">
                            {product.company_name || 'Unknown Company'} ·{' '}
                            {formatCurrency(product.mrp)}
                          </span>
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
                        <td>{selectedProduct.company_name || '—'}</td>
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
                    <h2>Buy%</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.buyPercent}
                      onChange={handleBulkChange('buyPercent')}
                    />
                  </div>
                  <div className="add-stock-input">
                    <h2>Sale%</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.salePercent}
                      onChange={handleBulkChange('salePercent')}
                    />
                  </div>
                  <div className="add-stock-input">
                    <h2>P-Sale%</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.peakSalePercent}
                      onChange={handleBulkChange('peakSalePercent')}
                    />
                  </div>
                  <div className="add-stock-input-offer">
                    <h2>M-Offer %</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bulkForm.mediboyOfferPercent}
                      onChange={handleBulkChange('mediboyOfferPercent')}
                    />
                  </div>
                </div>

                <div className="input-date-section">
                  <div className="add-stock-input-date">
                    <h2>Exp</h2>
                    <input
                      type="date"
                      value={bulkForm.expiry}
                      onChange={handleBulkChange('expiry')}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>
                  <div className="add-stock-input-date">
                    <h2>BTC</h2>
                    <input
                      type="date"
                      value={bulkForm.btcDate}
                      onChange={handleBulkChange('btcDate')}
                      placeholder="GB-YYYY/MM/DD"
                    />
                  </div>
                </div>
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
                    />
                  </div>
                  <div className="add-stock-input-offer">
                    <h2>M-Offer*</h2>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={singleForm.mOffer}
                      onChange={handleSingleChange('mOffer')}
                      required
                    />
                  </div>
                </div>

                <div className="input-section">
                  <div className="add-stock-bottom-input-date">
                    <h2>Exp*</h2>
                    <input
                      type="date"
                      value={singleForm.expiry}
                      onChange={handleSingleChange('expiry')}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>
                  <div className="add-stock-input-checkbox">
                    <input
                      type="checkbox"
                      checked={singleForm.autoBtc}
                      onChange={handleAutoBtcToggle}
                    />
                    <h2>Auto BTC</h2>
                  </div>
                  <div className="add-stock-bottom-input-date">
                    <h2>BTC</h2>
                    <input
                      type="date"
                      value={singleForm.btcDate}
                      onChange={handleSingleChange('btcDate')}
                      placeholder="GB-YYYY/MM/DD"
                      required
                    />
                  </div>
                </div>

                <div className="input-section">
                  <div style={{ width: '100%' }}>
                    <div className="add-stock-bottom-input-date">
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
                  </div>
                </div>

                <div className="add-input-stock">
                  <button type="submit" disabled={isBroadcasting || !selectedProduct}>
                    {isBroadcasting ? 'Submitting...' : 'ADD STOCK'}
                  </button>
                </div>
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

      <header className="dashboard-header">
        <button className="status-button" type="button">
          <img src={Wifi} alt="Wi-Fi" width="40" />
        </button>
        <article>
          <h3>Updated At</h3>
          <p>{lastSync || 'not synced yet'}</p>
        </article>
        <button
          className={`sync-control ${isSyncing ? 'spin' : ''}`}
          onClick={handleSyncProducts}
          disabled={isSyncing}
          type="button"
        >
          <img src={Rotate} alt="Sync" />
        </button>
      </header>
    </div>
  )
}
