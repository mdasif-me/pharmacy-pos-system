// SyncIndicator - feature component showing sync status

import React from 'react'
import { useSync } from '../../hooks/useSync'
import { Button } from '../common'
import './SyncIndicator.css'

export interface SyncIndicatorProps {
  showDetails?: boolean
  showControls?: boolean
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  showDetails = false,
  showControls = false,
}) => {
  const { status, isLoading, error, lastSync, pushToServer, pullFromServer, startSync, stopSync } =
    useSync(true, 5000)

  const isOnline = typeof navigator !== 'undefined' && navigator.onLine
  const isSyncing = isLoading

  const getStatusColor = () => {
    if (error) return 'red'
    if (isSyncing) return 'yellow'
    if (isOnline) return 'green'
    return 'gray'
  }

  const getStatusText = () => {
    if (error) return 'Sync Error'
    if (isSyncing) return 'Syncing...'
    if (!isOnline) return 'Offline'
    return 'Online'
  }

  const handlePush = async () => {
    const result = await pushToServer()
    if (result.success) {
      alert(`Successfully synced ${result.synced} items`)
    } else {
      alert(`Sync failed: ${result.errors.join(', ')}`)
    }
  }

  const handlePull = async () => {
    const result = await pullFromServer()
    if (result.success) {
      alert(`Successfully pulled ${result.synced} items`)
    } else {
      alert(`Pull failed: ${result.errors.join(', ')}`)
    }
  }

  return (
    <div className="sync-indicator">
      <div className="sync-status">
        <span className={`sync-status-dot sync-status-${getStatusColor()}`} />
        <span className="sync-status-text">{getStatusText()}</span>
        {isSyncing && <span className="sync-spinner">⏳</span>}
      </div>

      {showDetails && status && (
        <div className="sync-details">
          <div className="sync-detail-item">
            <span className="sync-detail-label">Status:</span>
            <span className="sync-detail-value">{status}</span>
          </div>
          {lastSync && (
            <div className="sync-detail-item">
              <span className="sync-detail-label">Last Sync:</span>
              <span className="sync-detail-value">{lastSync.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      {showControls && (
        <div className="sync-controls">
          <Button
            size="small"
            variant="outline"
            onClick={handlePush}
            disabled={!isOnline || isSyncing}
          >
            Push
          </Button>
          <Button
            size="small"
            variant="outline"
            onClick={handlePull}
            disabled={!isOnline || isSyncing}
          >
            Pull
          </Button>
          <Button size="small" variant="success" onClick={startSync} disabled={isLoading}>
            Sync Now
          </Button>
        </div>
      )}

      {error && <div className="sync-error">{error}</div>}
    </div>
  )
}
