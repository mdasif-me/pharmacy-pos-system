import { Database } from 'better-sqlite3'
import { ipcMain } from 'electron'
import { SyncService } from '../../services/sync.service'
import { IPC_CHANNELS } from '../channels'

export class SyncIpcHandler {
  private syncService: SyncService

  constructor(db: Database) {
    this.syncService = new SyncService(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // start background sync
    ipcMain.handle(IPC_CHANNELS.SYNC.START, async () => {
      try {
        this.syncService.startBackgroundSync()
        return { success: true }
      } catch (error: any) {
        console.error('Error starting sync:', error)
        throw error
      }
    })

    // stop background sync
    ipcMain.handle(IPC_CHANNELS.SYNC.STOP, async () => {
      try {
        this.syncService.stopBackgroundSync()
        return { success: true }
      } catch (error: any) {
        console.error('Error stopping sync:', error)
        throw error
      }
    })

    // get sync status
    ipcMain.handle(IPC_CHANNELS.SYNC.GET_STATUS, async () => {
      try {
        return await this.syncService.getSyncStats()
      } catch (error: any) {
        console.error('Error getting sync status:', error)
        throw error
      }
    })

    // push local changes
    ipcMain.handle(IPC_CHANNELS.SYNC.PUSH, async () => {
      try {
        return await this.syncService.pushProducts()
      } catch (error: any) {
        console.error('Error pushing products:', error)
        throw error
      }
    })

    // pull from server
    ipcMain.handle(IPC_CHANNELS.SYNC.PULL, async (_, products: any[]) => {
      try {
        return await this.syncService.pullProducts(products)
      } catch (error: any) {
        console.error('Error pulling products:', error)
        throw error
      }
    })

    // retry failed syncs
    ipcMain.handle(IPC_CHANNELS.SYNC.RETRY_FAILED, async () => {
      try {
        return await this.syncService.retryFailed()
      } catch (error: any) {
        console.error('Error retrying failed syncs:', error)
        throw error
      }
    })

    // clear sync queue
    ipcMain.handle(IPC_CHANNELS.SYNC.CLEAR_QUEUE, async () => {
      try {
        this.syncService.clearQueue()
        return { success: true }
      } catch (error: any) {
        console.error('Error clearing queue:', error)
        throw error
      }
    })
  }
}
