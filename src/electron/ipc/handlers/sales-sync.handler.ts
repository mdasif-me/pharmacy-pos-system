import { Database } from 'better-sqlite3'
import { ipcMain } from 'electron'
import { SalesSyncService } from '../../services/sales-sync.service'
import { IPC_CHANNELS } from '../channels'

export class SalesSyncIpcHandler {
  private salesSyncService: SalesSyncService

  constructor(db: Database) {
    this.salesSyncService = new SalesSyncService(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Sync all unsynced sales
    ipcMain.handle(IPC_CHANNELS.SALES.SYNC_ALL, async () => {
      try {
        console.log('[SalesSyncIpcHandler] Syncing all unsynced sales...')
        const result = await this.salesSyncService.syncAllSales()
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesSyncIpcHandler] Error syncing all sales:', error)
        throw error
      }
    })

    // Sync a single sale
    ipcMain.handle(IPC_CHANNELS.SALES.SYNC_SINGLE, async (_, saleId: number) => {
      try {
        console.log('[SalesSyncIpcHandler] Syncing sale', saleId)
        await this.salesSyncService.syncSingleSale(saleId)
        return { success: true, data: { saleId } }
      } catch (error: any) {
        console.error('[SalesSyncIpcHandler] Error syncing sale:', error)
        throw error
      }
    })

    // Retry failed sales
    ipcMain.handle(IPC_CHANNELS.SALES.RETRY_FAILED, async () => {
      try {
        console.log('[SalesSyncIpcHandler] Retrying failed sales...')
        const result = await this.salesSyncService.retryFailedSales()
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesSyncIpcHandler] Error retrying failed sales:', error)
        throw error
      }
    })
  }
}
