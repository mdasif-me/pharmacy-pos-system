import React, { useCallback, useState } from 'react'
import { showError, showSuccess } from '../../../utils/alerts'
import { CreateSaleModal } from './CreateSaleModal'
import { SalesTable } from './SalesTable'
import './SalesView.css'

export const SalesView: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const loadSales = useCallback(async () => {
    try {
      setLoading(true)
      const result = await window.electron.sales.getAll(100, 0)
      setSales(result || [])
    } catch (error) {
      console.error('Failed to load sales:', error)
      showError('Load Error', 'Failed to load sales data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadSales()
  }, [loadSales, refreshKey])

  const handleSaleCreated = useCallback(() => {
    showSuccess('Success', 'Sale created successfully!')
    setShowCreateModal(false)
    setRefreshKey((prev) => prev + 1)
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  const handleSyncAll = useCallback(async () => {
    setSyncing(true)
    try {
      const result = await window.electron.sales.syncAll()
      if (result.data.success > 0) {
        showSuccess('Sync Complete', `Synced ${result.data.success} of ${result.data.total} sales`)
      }
      if (result.data.failed > 0) {
        showError('Sync Failed', `Failed to sync ${result.data.failed} sales`)
      }
      setRefreshKey((prev) => prev + 1)
    } catch (error: any) {
      console.error('Failed to sync sales:', error)
      const errorMsg = error.message || 'Failed to sync sales'
      showError('Sync Error', errorMsg)
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <div className="sales-view">
      <div className="sales-header">
        <h2>Sales Management</h2>
        <div className="sales-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Sale
          </button>
          <button className="btn btn-success" onClick={handleSyncAll} disabled={loading || syncing}>
            {syncing ? 'Syncing...' : 'Sync All'}
          </button>
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <SalesTable sales={sales} loading={loading} />

      {showCreateModal && (
        <CreateSaleModal
          onClose={() => setShowCreateModal(false)}
          onSaleCreated={handleSaleCreated}
        />
      )}
    </div>
  )
}

export default SalesView
