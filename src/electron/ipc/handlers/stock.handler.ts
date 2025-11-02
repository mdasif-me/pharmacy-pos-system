import { Database } from 'better-sqlite3'
import { BrowserWindow, ipcMain } from 'electron'
import { API_CONFIG } from '../../core/config/api.config'
import { ProductRepository } from '../../database/repositories/product.repository'
import { StorageService } from '../../services/storage.service'
import { IPC_CHANNELS } from '../channels'

export interface StockBroadcastPayload {
  product_id: number
  stock_mrp: number
  purchase_price: number
  discount_price: number
  peak_hour_price: number
  offer_price: number
  perc_off: number
  batch_no: string
  expire_date: string
  qty: number
  stock_alert: number
  shelf: string | null
}

export class StockIpcHandler {
  private storageService: StorageService
  private productRepo: ProductRepository

  constructor(private db: Database) {
    this.storageService = new StorageService()
    this.productRepo = new ProductRepository(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Add stock and broadcast to all clients
    ipcMain.handle(
      IPC_CHANNELS.STOCK.ADD_AND_BROADCAST,
      async (_, payload: StockBroadcastPayload) => {
        try {
          const token = this.storageService.getToken()

          if (!token) {
            throw new Error('Authentication required')
          }

          const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-add-stock-and-broadcast`

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText || `Failed with status ${response.status}`)
          }

          const result = await response.json()

          // Update local product stock
          try {
            const product = this.productRepo.findById(payload.product_id)
            if (product) {
              const currentStock = product.in_stock || 0
              const newStock = currentStock + payload.qty
              this.productRepo.updateStock(payload.product_id, newStock)

              // Notify all renderer windows about the stock update
              this.notifyStockUpdate(payload.product_id, product.product_name, newStock)

              console.log(
                `[StockHandler] Updated local stock for product ${payload.product_id}: ${currentStock} -> ${newStock}`
              )
            }
          } catch (updateError) {
            console.error('[StockHandler] Error updating local stock:', updateError)
            // Don't throw - API call succeeded, local update is secondary
          }

          return { success: true, data: result }
        } catch (error: any) {
          console.error('Error broadcasting stock:', error)
          throw error
        }
      }
    )
  }

  /**
   * Notify UI about stock update via IPC
   */
  private notifyStockUpdate(productId: number, productName: string, newStock: number): void {
    console.log(
      `[StockHandler] Notifying stock update - Product: ${productName}, New Stock: ${newStock}`
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
