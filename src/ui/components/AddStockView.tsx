import React, { useCallback, useEffect, useState } from 'react'
import Rotate from '../assets/rotate.svg'
import Wifi from '../assets/wifi.svg'
import Search from '../assets/search.svg'
import { broadcastStockUpdate, StockBroadcastPayload } from '../services/broadcastService'
import './AddStockView.css'
type AddStockForm = {
  productId: string
  inStock: string
  discountPrice: string
  peakHourPrice: string
  mediboyOfferPrice: string
  syncAt: string
}

const initialFormState: AddStockForm = {
  productId: '',
  inStock: '',
  discountPrice: '',
  peakHourPrice: '',
  mediboyOfferPrice: '',
  syncAt: '',
}

export const AddStockView: React.FC = () => {
  const [formState, setFormState] = useState<AddStockForm>(initialFormState)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [lastSync, setLastSync] = useState('')

  const handleChange =
    (field: keyof AddStockForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const parsePayload = (): StockBroadcastPayload | null => {
    const productId = Number(formState.productId)
    const inStock = Number(formState.inStock)
    const discountPrice = Number(formState.discountPrice)
    const peakHourPrice = Number(formState.peakHourPrice)
    const mediboyOfferPrice = Number(formState.mediboyOfferPrice)

    if (
      Number.isNaN(productId) ||
      Number.isNaN(inStock) ||
      Number.isNaN(discountPrice) ||
      Number.isNaN(peakHourPrice) ||
      Number.isNaN(mediboyOfferPrice)
    ) {
      setErrorMessage('validate form fields before broadcasting')
      return null
    }

    if (!formState.syncAt) {
      setErrorMessage('provide a sync timestamp')
      return null
    }

    const syncDate = new Date(formState.syncAt)
    if (Number.isNaN(syncDate.getTime())) {
      setErrorMessage('enter a valid sync timestamp')
      return null
    }

    // convert local datetime into ISO string so backend receives consistent value
    const syncAtIso = syncDate.toISOString()

    return {
      product_id: productId,
      in_stock: inStock,
      discount_price: discountPrice,
      peak_hour_price: peakHourPrice,
      mediboy_offer_price: mediboyOfferPrice,
      sync_at: syncAtIso,
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage('')
    setErrorMessage('')

    const payload = parsePayload()
    if (!payload) {
      return
    }

    setIsBroadcasting(true)
    try {
      await broadcastStockUpdate(payload)
      setStatusMessage('broadcast queued for add stock event')
      setFormState(initialFormState)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unable to broadcast'
      setErrorMessage(message)
    } finally {
      setIsBroadcasting(false)
    }
  }

  const handleReset = () => {
    setFormState(initialFormState)
    setStatusMessage('')
    setErrorMessage('')
  }

  const loadLastSync = useCallback(async () => {
    try {
      const value = await window.electron.getLastSync()
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

  return (
    <div className="full-view">
      {syncError && (
        <div className="form-status">
          {syncError && <p className="form-status-error">{syncError}</p>}
        </div>
      )}
      <section className="add-stock-panel">
        <div className="add-stock-panel-header">
          <h3>Add Stock</h3>
        </div>
       <div className='add-stock-header'>
      <form className="form-grid">
           <div className='formSearch'>
             <div className='searchIcon'>
              <img src={Search} alt="" />
            </div>
            <input
              type="text"
              placeholder="Search product..."
              required
            />
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
                  <tr>
                    <td>
                      <div className="product-name-cell">
                        <span className="Product Description">Product Description	text</span>
                      </div>
                    </td>
                    <td>Company Name	text</td>
                    <td>MRP text</td>
                  </tr>
            </tbody>
          </table>
        </div>
      </form>
      <section className='full-input-section'>
        <form className="input-row">
        <div className='input-heder'>
          <div className='input-heder-stock'>Bulk Stock Helper</div>
          <div className='input-heder-note'>
            Note :
          </div>
        </div>
         <div className='input-section'>
          <div className='add-stock-input'>
            <h2>Buy%</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
          <div className='add-stock-input'>
            <h2>Sale%</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
          <div className='add-stock-input'>
            <h2>P-Sale%</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
          <div className='add-stock-input-offer'>
            <h2>M-Offer %</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
         <div className='add-stock-input'>
         </div>
         </div>

           <div className='input-date-section'>
            <div className='add-stock-input-date'>
            <h2>Exp</h2>
            <input
              type="date"
              min="0"
              required
            />
         </div>
            <div className='add-stock-input-date'>
            <h2>BTC</h2>
            <input
              type="date"
              min="0"
              required
            />
         </div>
          </div>
      </form>
      <form className="input-row">
        <div className='input-heder'>
          <div className='input-heder-stock'>Single Stock</div>
          <div className='input-heder-note'>
            Note :
          </div>
        </div>
         <div className='input-section'>
          <div className='add-stock-input'>
            <h2>Buy*</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
          <div className='add-stock-input'>
            <h2>Sale*</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
          <div className='add-stock-input'>
            <h2>P-Sale*</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
          <div className='add-stock-input-offer'>
            <h2>M-Offer*</h2>
            <input
              type="number"
              min="0"
              required
            />
         </div>
         </div>

           <div className='input-date-section'>
            <div className='add-stock-bottom-input-date'>
            <h2>Exp*</h2>
            <input
              type="date"
              min="0"
              required
            />
         </div>
            <div className='add-stock-bottom-input-date'>
            <h2>BTC</h2>
            <input
              type="date"
              min="0"
              required
            />
            </div>
          </div>
          <div className='add-stock-input-checkbox'>
            <input
              type="checkbox"
              required
            />
              <h2>Auto BTC</h2>
         </div>
         <div className='add-stock-input-date'>
            <h2>QTY*</h2>
            <input
              type="number"
              min="0"
              required
            />
            </div>
      </form>
      <div className='add-input-stock'>
        <button>ADD STOCK</button>
      </div>
      </section>
       </div>



        {(statusMessage || errorMessage) && (
          <div className="form-status">
            {statusMessage && <p className="form-status-success">{statusMessage}</p>}
            {errorMessage && <p className="form-status-error">{errorMessage}</p>}
          </div>
        )}
      </section>
      <header className="dashboard-header">
        <button>
          <img src={Wifi} alt="Wi-Fi" width="40" />
        </button>
        <article>
          <h3>Updated At</h3>
          <p>{lastSync || 'not synced yet'}</p>
        </article>
        <button
          className={isSyncing ? 'spin' : ''}
          onClick={handleSyncProducts}
          disabled={isSyncing}
        >
          <img src={Rotate} alt="Sync" />
        </button>
      </header>
    </div>
  )
}
