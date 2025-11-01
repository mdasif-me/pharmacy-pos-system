// useSync hook - synchronization management

import { useCallback, useEffect, useRef, useState } from 'react'
import { SyncStatus } from '../../electron/types/entities/sync.types'
import { electronService, SyncResult } from '../services/electron.service'

export interface SyncState {
  status: SyncStatus | null
  isLoading: boolean
  error: string | null
  lastSync: Date | null
}

export function useSync(autoStart = true, pollInterval = 5000) {
  const [state, setState] = useState<SyncState>({
    status: null,
    isLoading: false,
    error: null,
    lastSync: null,
  })

  const pollTimerRef = useRef<number | null>(null)

  // Load sync status and start background sync
  useEffect(() => {
    loadStatus()

    if (autoStart) {
      startBackgroundSync()
    }

    // Poll for status updates
    if (pollInterval > 0) {
      pollTimerRef.current = setInterval(() => {
        loadStatus()
      }, pollInterval)
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [autoStart, pollInterval])

  const loadStatus = useCallback(async () => {
    try {
      const status = await electronService.getSyncStatus()
      setState((prev) => ({
        ...prev,
        status,
        error: null,
      }))
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }, [])

  const startBackgroundSync = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      await electronService.startSync()
      await loadStatus()
      setState((prev) => ({ ...prev, isLoading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start sync',
      }))
    }
  }, [loadStatus])

  const stopBackgroundSync = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      await electronService.stopSync()
      await loadStatus()
      setState((prev) => ({ ...prev, isLoading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to stop sync',
      }))
    }
  }, [loadStatus])

  const pushToServer = useCallback(async (): Promise<SyncResult> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const result = await electronService.pushToServer()
      setState((prev) => ({
        ...prev,
        isLoading: false,
        lastSync: new Date(),
      }))
      await loadStatus()
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Push failed'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [errorMessage],
      }
    }
  }, [loadStatus])

  const pullFromServer = useCallback(async (): Promise<SyncResult> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const result = await electronService.pullFromServer()
      setState((prev) => ({
        ...prev,
        isLoading: false,
        lastSync: new Date(),
      }))
      await loadStatus()
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Pull failed'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [errorMessage],
      }
    }
  }, [loadStatus])

  const retryFailed = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      await electronService.retryFailedSync()
      await loadStatus()
      setState((prev) => ({ ...prev, isLoading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Retry failed',
      }))
    }
  }, [loadStatus])

  const clearQueue = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      await electronService.clearSyncQueue()
      await loadStatus()
      setState((prev) => ({ ...prev, isLoading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Clear queue failed',
      }))
    }
  }, [loadStatus])

  return {
    ...state,
    startSync: startBackgroundSync,
    stopSync: stopBackgroundSync,
    pushToServer,
    pullFromServer,
    retryFailed,
    clearQueue,
    refresh: loadStatus,
  }
}
