import React, { useState } from 'react'
import { broadcastStockUpdate, StockBroadcastPayload } from '../services/broadcastService'

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

  return (
    <div className="add-stock-view">
      <section className="panel">
        <div className="panel-header">
          <h3>add stock broadcast</h3>
          <p>push inventory changes to connected devices in real time</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            product id
            <input
              type="number"
              min="0"
              placeholder="enter product id"
              value={formState.productId}
              onChange={handleChange('productId')}
              required
            />
          </label>

          <label>
            in stock
            <input
              type="number"
              min="0"
              placeholder="available units"
              value={formState.inStock}
              onChange={handleChange('inStock')}
              required
            />
          </label>

          <label>
            discount price
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="discount price"
              value={formState.discountPrice}
              onChange={handleChange('discountPrice')}
              required
            />
          </label>

          <label>
            peak-hour price
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="peak-hour price"
              value={formState.peakHourPrice}
              onChange={handleChange('peakHourPrice')}
              required
            />
          </label>

          <label>
            mediboy offer price
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="mediboy offer price"
              value={formState.mediboyOfferPrice}
              onChange={handleChange('mediboyOfferPrice')}
              required
            />
          </label>

          <label>
            sync at
            <input
              type="datetime-local"
              value={formState.syncAt}
              onChange={handleChange('syncAt')}
              required
            />
          </label>

          <div className="form-actions">
            <button
              type="button"
              className="form-reset"
              onClick={handleReset}
              disabled={isBroadcasting}
            >
              clear
            </button>
            <button type="submit" className="form-submit" disabled={isBroadcasting}>
              {isBroadcasting ? 'broadcasting...' : 'broadcast stock'}
            </button>
          </div>
        </form>
        {(statusMessage || errorMessage) && (
          <div className="form-status">
            {statusMessage && <p className="form-status-success">{statusMessage}</p>}
            {errorMessage && <p className="form-status-error">{errorMessage}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
