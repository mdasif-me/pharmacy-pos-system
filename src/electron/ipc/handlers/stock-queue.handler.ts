import { Database } from 'better-sqlite3'
import { BrowserWindow, ipcMain } from 'electron'
import { ProductRepository } from '../../database/repositories/product.repository'
import { AddStockPayload, StockQueueService } from '../../services/stock-queue.service'
import { IPC_CHANNELS } from '../channels'

export class StockQueueIpcHandler {
  private stockQueueService: StockQueueService
  private productRepo: ProductRepository

  constructor(db: Database) {
    this.stockQueueService = new StockQueueService(db)
    this.productRepo = new ProductRepository(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Add stock offline
    ipcMain.handle(IPC_CHANNELS.STOCK_QUEUE.ADD_OFFLINE, async (_, payload: AddStockPayload) => {
      try {
        const result = this.stockQueueService.addStockOffline(payload)

        // Update local product stock immediately
        try {
          const product = this.productRepo.findById(payload.product_id)
          if (product) {
            const currentStock = product.in_stock || 0
            const newStock = currentStock + payload.qty
            this.productRepo.updateStock(payload.product_id, newStock)

            // Notify all renderer windows about the stock update
            this.notifyStockUpdate(payload.product_id, product.product_name, newStock)

            console.log(
              `[StockQueueHandler] Updated local stock for product ${payload.product_id}: ${currentStock} -> ${newStock}`
            )
          }
        } catch (updateError) {
          console.error('[StockQueueHandler] Error updating local stock:', updateError)
          // Don't throw - queue entry created, local update is secondary
        }

        return { success: true, data: result }
      } catch (error: any) {
        console.error('Error adding stock to queue:', error)
        throw error
      }
    })

    // Sync single stock item
    ipcMain.handle(IPC_CHANNELS.STOCK_QUEUE.SYNC_SINGLE, async (_, stockId: number) => {
      try {
        return await this.stockQueueService.syncStockItem(stockId)
      } catch (error: any) {
        console.error('Error syncing stock item:', error)
        throw error
      }
    })

    // Sync all unsynced items
    ipcMain.handle(IPC_CHANNELS.STOCK_QUEUE.SYNC_ALL, async () => {
      try {
        return await this.stockQueueService.syncAllUnsynced()
      } catch (error: any) {
        console.error('Error syncing all stock items:', error)
        throw error
      }
    })

    // Get recent stock items
    ipcMain.handle(IPC_CHANNELS.STOCK_QUEUE.GET_RECENT, async (_, limit?: number) => {
      try {
        return this.stockQueueService.getRecentStockItems(limit)
      } catch (error: any) {
        console.error('Error getting recent stock items:', error)
        throw error
      }
    })

    // Get unsynced count
    ipcMain.handle(IPC_CHANNELS.STOCK_QUEUE.GET_UNSYNCED_COUNT, async () => {
      try {
        return this.stockQueueService.getUnsyncedCount()
      } catch (error: any) {
        console.error('Error getting unsynced count:', error)
        throw error
      }
    })

    // Get unsynced and today's items
    ipcMain.handle(IPC_CHANNELS.STOCK_QUEUE.GET_UNSYNCED_AND_TODAY, async () => {
      try {
        return this.stockQueueService.getUnsyncedAndTodayItems()
      } catch (error: any) {
        console.error('Error getting unsynced and today items:', error)
        throw error
      }
    })
  }

  /**
   * Notify UI about stock update via IPC
   */
  private notifyStockUpdate(productId: number, productName: string, newStock: number): void {
    console.log(
      `[StockQueueHandler] Notifying stock update - Product: ${productName}, New Stock: ${newStock}`
    )

    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('stock-updated', {
        productId,
        productName,
        newStock,
        timestamp: new Date().toISOString(),
      })
    })
  }
}
