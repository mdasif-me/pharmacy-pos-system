import { Database } from 'better-sqlite3'
import { API_CONFIG } from '../core/config/api.config'
import {
  StockQueueEntity,
  StockQueueRepository,
  StockQueueWithProduct,
} from '../database/repositories/stock-queue.repository'
import { StorageService } from './storage.service'

export interface AddStockPayload {
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

export class StockQueueService {
  private stockQueueRepo: StockQueueRepository
  private storageService: StorageService

  constructor(private db: Database) {
    this.stockQueueRepo = new StockQueueRepository(db)
    this.storageService = new StorageService()
  }

  /**
   * Add stock offline-first (save to queue)
   */
  addStockOffline(payload: AddStockPayload): StockQueueEntity {
    console.log('[StockQueueService] Adding stock to offline queue:', payload.product_id)

    const stockEntry: Omit<StockQueueEntity, 'id'> = {
      ...payload,
      is_sync: 0,
      created_at: new Date().toISOString(),
      synced_at: null,
      error_message: null,
    }

    const result = this.stockQueueRepo.addToQueue(stockEntry)
    console.log('[StockQueueService] Stock added to queue with ID:', result.id)

    return result
  }

  /**
   * Add already-synced stock to queue (for online mode)
   * Used when stock is added online and synced immediately
   */
  addStockSynced(payload: AddStockPayload): StockQueueEntity {
    console.log('[StockQueueService] Adding synced stock to queue:', payload.product_id)

    const now = new Date().toISOString()
    const stockEntry: Omit<StockQueueEntity, 'id'> = {
      ...payload,
      is_sync: 1,
      created_at: now,
      synced_at: now,
      error_message: null,
    }

    const result = this.stockQueueRepo.addToQueue(stockEntry)
    console.log('[StockQueueService] Synced stock added to queue with ID:', result.id)

    return result
  }

  /**
   * Sync a single stock item
   */
  async syncStockItem(stockId: number): Promise<{ success: boolean; error?: string }> {
    const stock = this.stockQueueRepo.findById(stockId)

    if (!stock) {
      return { success: false, error: 'Stock item not found' }
    }

    if (stock.is_sync === 1) {
      return { success: true }
    }

    try {
      await this.broadcastStockToAPI(stock)
      this.stockQueueRepo.markAsSynced(stockId)
      console.log('[StockQueueService] Successfully synced stock ID:', stockId)
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error'
      this.stockQueueRepo.markSyncFailed(stockId, errorMessage)
      console.error('[StockQueueService] Failed to sync stock ID:', stockId, errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Sync all unsynced stock items
   */
  async syncAllUnsynced(): Promise<{
    total: number
    success: number
    failed: number
    errors: Array<{ id: number; error: string }>
  }> {
    const unsyncedItems = this.stockQueueRepo.getUnsynced()
    console.log('[StockQueueService] Syncing', unsyncedItems.length, 'unsynced items')

    const result = {
      total: unsyncedItems.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: number; error: string }>,
    }

    for (const stock of unsyncedItems) {
      const syncResult = await this.syncStockItem(stock.id)

      if (syncResult.success) {
        result.success++
      } else {
        result.failed++
        result.errors.push({ id: stock.id, error: syncResult.error || 'Unknown error' })
      }
    }

    console.log('[StockQueueService] Sync complete:', result)
    return result
  }

  /**
   * Get recent stock items with product details
   */
  getRecentStockItems(limit = 20): StockQueueWithProduct[] {
    return this.stockQueueRepo.getRecentWithProduct(limit)
  }

  /**
   * Get count of unsynced items
   */
  getUnsyncedCount(): number {
    return this.stockQueueRepo.getUnsyncedCount()
  }

  /**
   * Get all unsynced items and today's items
   */
  getUnsyncedAndTodayItems(): StockQueueWithProduct[] {
    return this.stockQueueRepo.getUnsyncedAndTodayItems()
  }

  /**
   * Broadcast stock to API
   */
  private async broadcastStockToAPI(stock: StockQueueEntity): Promise<void> {
    const token = this.storageService.getToken()

    if (!token) {
      throw new Error('Authentication required')
    }

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-add-stock-and-broadcast`

    const payload = {
      product_id: stock.product_id,
      stock_mrp: stock.stock_mrp,
      purchase_price: stock.purchase_price,
      discount_price: stock.discount_price,
      peak_hour_price: stock.peak_hour_price,
      offer_price: stock.offer_price,
      perc_off: stock.perc_off,
      batch_no: stock.batch_no,
      expire_date: stock.expire_date,
      qty: stock.qty,
      stock_alert: stock.stock_alert,
      shelf: stock.shelf,
    }

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
    console.log('[StockQueueService] API response:', result)
  }

  /**
   * Cleanup old synced items
   */
  cleanupOldSyncedItems(daysOld = 30): number {
    return this.stockQueueRepo.cleanupOldSyncedItems(daysOld)
  }
}
