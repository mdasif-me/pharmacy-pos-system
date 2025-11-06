import React, { useCallback, useEffect, useState } from 'react'
import './RecentStockView.css'

interface StockQueueItem {
  id: number
  product_id: number
  product_name?: string
  company_name?: string
  generic_name?: string
  mrp?: number
  type?: string
  stock_mrp: number
  purchase_price: number
  discount_price: number
  qty: number
  batch_no: string
  expire_date: string
  is_sync: number
  created_at: string
  synced_at?: string | null
  error_message?: string | null
}

interface SyncResult {
  total: number
  success: number
  failed: number
  errors: Array<{ id: number; error: string }>
}

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '—'
  return `৳${Number(value).toFixed(2)}`
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleString()
  } catch {
    return '—'
  }
}

export const RecentStockView: React.FC = () => {
  const [recentStock, setRecentStock] = useState<StockQueueItem[]>([])
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncingItemId, setSyncingItemId] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  console.log('[RecentStock] Component rendered, items count:', recentStock.length)

  const loadRecentStock = useCallback(async () => {
    try {
      console.log('[RecentStock] Loading recent stock...')
      // Get all unsynced and today's items
      const items = await window.electron.stockQueue.getUnsyncedAndToday()
      console.log('[RecentStock] Loaded items:', items.length)
      setRecentStock(items)
    } catch (error) {
      console.error('Failed to load recent stock:', error)
    }
  }, [])

  const loadUnsyncedCount = useCallback(async () => {
    try {
      const count = await window.electron.stockQueue.getUnsyncedCount()
      setUnsyncedCount(count)
    } catch (error) {
      console.error('Failed to load unsynced count:', error)
    }
  }, [])

  const handleSyncAll = useCallback(async () => {
    if (unsyncedCount === 0) {
      setStatusMessage('No items to sync')
      return
    }

    if (!isOnline) {
      setErrorMessage('Cannot sync while offline. Please check your internet connection.')
      return
    }

    setIsSyncing(true)
    setStatusMessage('')
    setErrorMessage('')

    try {
      const result: SyncResult = await window.electron.stockQueue.syncAll()

      if (result.success > 0) {
        setStatusMessage(`Synced ${result.success} of ${result.total} items successfully`)
      }

      if (result.failed > 0) {
        setErrorMessage(`Failed to sync ${result.failed} items. Check console for details.`)
        console.error('Sync errors:', result.errors)
      }

      await loadRecentStock()
      await loadUnsyncedCount()
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to sync all items')
    } finally {
      setIsSyncing(false)
    }
  }, [unsyncedCount, isOnline, loadRecentStock, loadUnsyncedCount])

  useEffect(() => {
    loadRecentStock()
    loadUnsyncedCount()

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadRecentStock()
      loadUnsyncedCount()
    }, 30000)

    // Track online/offline status
    const handleOnline = async () => {
      setIsOnline(true)
      console.log('[RecentStock] Connection restored - Attempting auto-sync')
      // Auto-sync when connection is restored
      setTimeout(async () => {
        try {
          const count = await window.electron.stockQueue.getUnsyncedCount()
          if (count > 0) {
            const result: SyncResult = await window.electron.stockQueue.syncAll()
            if (result.success > 0) {
              setStatusMessage(`Auto-synced ${result.success} items after reconnection`)
            }
            await loadRecentStock()
            await loadUnsyncedCount()
          }
        } catch (error) {
          console.error('[RecentStock] Auto-sync failed:', error)
        }
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('[RecentStock] Connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadRecentStock, loadUnsyncedCount])

  const handleSyncSingle = async (stockId: number) => {
    setSyncingItemId(stockId)
    setStatusMessage('')
    setErrorMessage('')

    try {
      const result = await window.electron.stockQueue.syncSingle(stockId)

      if (result.success) {
        setStatusMessage(`Stock item #${stockId} synced successfully`)
        await loadRecentStock()
        await loadUnsyncedCount()
      } else {
        setErrorMessage(`Failed to sync: ${result.error}`)
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to sync stock item')
    } finally {
      setSyncingItemId(null)
    }
  }

  return (
    <div className="recent-stock-container">
      <div className="recent-stock-header">
        <h3>Recent Stock</h3>
        <div className="sync-controls">
          {!isOnline && <span className="offline-badge">⚠ Offline</span>}
          {unsyncedCount > 0 && <span className="unsynced-badge">{unsyncedCount} Unsynced</span>}
          <button
            className="sync-all-button"
            onClick={handleSyncAll}
            disabled={isSyncing || unsyncedCount === 0 || !isOnline}
            title={!isOnline ? 'Cannot sync while offline' : ''}
          >
            {isSyncing ? 'Syncing...' : `Sync All (${unsyncedCount})`}
          </button>
        </div>
      </div>

      {(statusMessage || errorMessage) && (
        <div className="status-messages">
          {statusMessage && <p className="status-success">{statusMessage}</p>}
          {errorMessage && <p className="status-error">{errorMessage}</p>}
        </div>
      )}

      <div className="recent-stock-table-wrapper">
        <table className="recent-stock-table">
          <thead>
            <tr>
              <th>Product Description</th>
              <th>Company Name</th>
              <th>MRP</th>
              <th>Stock (Qty)</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentStock.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#999' }}>
                  No recent stock
                </td>
              </tr>
            ) : (
              recentStock.map((item) => (
                <tr key={item.id} className={item.is_sync === 0 ? 'unsynced' : 'synced'}>
                  <td>
                    <div className="product-info">
                      <strong>{item.product_name || `Product #${item.product_id}`}</strong>
                      {item.type && <span className="product-type">{item.type}</span>}
                      {item.generic_name && (
                        <div className="product-generic">{item.generic_name}</div>
                      )}
                    </div>
                  </td>
                  <td>{item.company_name || '—'}</td>
                  <td>{formatCurrency(item.mrp || item.stock_mrp)}</td>
                  <td className="stock-qty">
                    <span className="qty-badge">{item.qty}</span>
                  </td>
                  <td>{item.batch_no}</td>
                  <td>
                    {item.is_sync === 1 ? (
                      <span className="status-badge synced">✓ Synced</span>
                    ) : (
                      <span className="status-badge pending">⏳ Pending</span>
                    )}
                    {item.error_message && (
                      <div className="error-tooltip" title={item.error_message}>
                        ⚠ Error
                      </div>
                    )}
                  </td>
                  <td>
                    {item.is_sync === 0 && (
                      <button
                        className="sync-button"
                        onClick={() => handleSyncSingle(item.id)}
                        disabled={syncingItemId === item.id || !isOnline}
                        title={!isOnline ? 'Cannot sync while offline' : ''}
                      >
                        {syncingItemId === item.id ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
