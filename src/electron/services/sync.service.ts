import { Database } from 'better-sqlite3'
import { CompanyRepository } from '../database/repositories/company.repository'
import { ProductRepository } from '../database/repositories/product.repository'
import { SyncQueueRepository } from '../database/repositories/sync-queue.repository'
import { ProductEntity } from '../types/entities/product.types'
import {
  QueueStatus,
  SyncAction,
  SyncQueueAction,
  SyncQueueEntity,
} from '../types/entities/sync.types'
import { ProductApiService } from './api/product.api.service'
import { StorageService } from './storage.service'

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: string[]
}

export interface SyncOptions {
  batchSize?: number
  maxRetries?: number
}

export class SyncService {
  private syncQueue: SyncQueueRepository
  private productRepo: ProductRepository
  private companyRepo: CompanyRepository
  private isSyncing = false
  private syncInterval?: NodeJS.Timeout

  constructor(
    private db: Database,
    private productApi: ProductApiService,
    private storageService: StorageService
  ) {
    this.syncQueue = new SyncQueueRepository(db)
    this.productRepo = new ProductRepository(db)
    this.companyRepo = new CompanyRepository(db)
  }

  /**
   * start background sync (every 5 minutes)
   */
  startBackgroundSync(intervalMs = 300000): void {
    if (this.syncInterval) {
      return
    }

    this.syncInterval = setInterval(async () => {
      await this.syncPendingActions()
    }, intervalMs)
  }

  /**
   * stop background sync
   */
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
  }

  /**
   * sync all pending actions
   */
  async syncPendingActions(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Sync already in progress'],
      }
    }

    this.isSyncing = true
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    try {
      const { batchSize = 50 } = options
      const pending = this.syncQueue.getPending(batchSize)

      for (const item of pending) {
        try {
          await this.processSyncItem(item)
          this.syncQueue.markAsCompleted(item.id)
          result.synced++
        } catch (error: any) {
          this.syncQueue.markAsFailed(item.id)
          result.failed++
          result.errors.push(`${item.entity_type} ${item.entity_id}: ${error.message}`)
        }
      }

      // clear old completed items
      this.syncQueue.clearCompleted()
    } catch (error: any) {
      result.success = false
      result.errors.push(error.message)
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * add action to sync queue
   */
  queueAction(entityType: string, entityId: number, action: SyncQueueAction, payload: any): void {
    this.syncQueue.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      payload: JSON.stringify(payload),
      status: QueueStatus.PENDING,
    })
  }

  /**
   * push local products to server
   */
  async pushProducts(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    try {
      const dirtyProducts = this.productRepo.getDirtyProducts()

      for (const product of dirtyProducts) {
        this.queueAction('product', product.id, SyncAction.UPDATE, product)
        result.synced++
      }
    } catch (error: any) {
      result.success = false
      result.errors.push(error.message)
    }

    return result
  }

  /**
   * pull products from server
   * Supports incremental sync by fetching only products updated after last sync
   */
  async pullProducts(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    try {
      // Get last sync date from storage
      const lastSyncDate = this.storageService.getLastSync()

      // Fetch products from API with optional lastSyncDate filter
      const apiProducts = await this.productApi.fetchAllProducts(1, 100, lastSyncDate || undefined)

      if (!Array.isArray(apiProducts) || apiProducts.length === 0) {
        console.log('[SyncService] No new products to sync')
        result.errors.push(
          lastSyncDate ? 'No products updated since last sync' : 'No products received from API'
        )
        result.success = true // Not an error if there are no new products
        return result
      }

      console.log(`[SyncService] Received ${apiProducts.length} products from API`)

      // Map API products to database format - sync ALL products
      const mappedProducts: Partial<ProductEntity>[] = apiProducts.map((product) => {
        const company = this.companyRepo.getOrCreate(product.company?.name || 'Unknown')

        // Ensure stock_alert is a valid small integer
        let stockAlert = 10 // Default value
        if (product.current_stock?.stock_alert) {
          const alertValue = Number(product.current_stock.stock_alert)
          // Validate: stock_alert should be a small number (0-100 reasonable range)
          if (!Number.isNaN(alertValue) && alertValue >= 0 && alertValue <= 1000) {
            stockAlert = alertValue
          }
        }

        return {
          id: product.id,
          product_name: product.productName,
          generic_name: product.genericName,
          company_id: company.id,
          category_id: undefined, // Set to undefined since categories aren't provided in API
          mrp: parseFloat(product.retail_max_price || 0),
          sale_price: product.current_stock?.sale_price || product.retail_max_price,
          discount_price: product.current_stock?.discount_price,
          peak_hour_price: product.current_stock?.peak_hour_price,
          mediboy_offer_price: product.current_stock?.mediboy_offer_price,
          in_stock: product.current_stock?.in_stock || 0,
          stock_alert: stockAlert,
          type: product.type,
          prescription: product.prescription === 'yes' ? 1 : 0,
          status: product.status || 'active',
          cover_image: product.coverImage,
          image_path: product.product_cover_image_path,
          version: 1,
          last_synced_at: product.last_sync_at,
          last_modified_at: product.updated_at || new Date().toISOString(),
          is_dirty: 0,
          raw_data: JSON.stringify(product),
        }
      })

      // Count products with stock for logging
      const productsWithStock = mappedProducts.filter((p) => (p.in_stock ?? 0) > 0)
      console.log(
        `[SyncService] Syncing ${mappedProducts.length} products (${productsWithStock.length} have stock > 0)`
      )

      // Log some examples
      if (productsWithStock.length > 0) {
        console.log(
          '[SyncService] Sample products with stock:',
          productsWithStock.slice(0, 3).map((p) => ({
            id: p.id,
            name: p.product_name,
            in_stock: p.in_stock,
          }))
        )
      }

      // Bulk insert/update products - sync ALL products from API
      this.productRepo.bulkUpsert(mappedProducts as ProductEntity[])
      result.synced = mappedProducts.length

      // Save last sync timestamp after successful sync
      try {
        this.storageService.setLastSync(new Date().toISOString())
        console.log('Last sync timestamp saved successfully')
      } catch (syncError) {
        console.error('Error saving last sync timestamp:', syncError)
        // Don't fail the entire sync just because timestamp save failed
      }
    } catch (error: any) {
      result.success = false
      result.errors.push(error.message || 'Unknown error during sync')
      console.error('Sync error:', error)
    }

    return result
  }

  /**
   * get sync stats
   */
  getSyncStats(): {
    pending: number
    processing: number
    failed: number
    completed: number
    isDirty: boolean
  } {
    const queueStats = this.syncQueue.getStats()
    const dirtyCount = this.productRepo.getDirtyProducts().length

    return {
      ...queueStats,
      isDirty: dirtyCount > 0,
    }
  }

  /**
   * retry failed sync actions
   */
  async retryFailed(): Promise<SyncResult> {
    this.syncQueue.retryFailed()
    return this.syncPendingActions()
  }

  /**
   * clear sync queue
   */
  clearQueue(): void {
    this.syncQueue.clearCompleted()
  }

  // private helpers

  /**
   * process individual sync item
   */
  private async processSyncItem(item: SyncQueueEntity): Promise<void> {
    // mark as processing
    this.syncQueue.markAsProcessing(item.id)

    // parse payload
    const payload = JSON.parse(item.payload)

    // process based on entity type
    switch (item.entity_type) {
      case 'product':
        await this.syncProduct(item.action, payload)
        break
      // add more entity types as needed
      default:
        throw new Error(`Unknown entity type: ${item.entity_type}`)
    }
  }

  /**
   * sync product to server
   */
  private async syncProduct(action: SyncQueueAction, product: ProductEntity): Promise<void> {
    // todo: implement actual api call
    // for now, just simulate
    await new Promise((resolve) => setTimeout(resolve, 100))

    // mark product as synced
    this.productRepo.markSynced([product.id])
  }
}
