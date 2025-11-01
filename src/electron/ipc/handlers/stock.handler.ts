import { ipcMain } from 'electron'
import { API_CONFIG } from '../../core/config/api.config'
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

  constructor() {
    this.storageService = new StorageService()
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
          return { success: true, data: result }
        } catch (error: any) {
          console.error('Error broadcasting stock:', error)
          throw error
        }
      }
    )
  }
}
