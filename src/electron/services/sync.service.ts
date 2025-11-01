// sync service - manage offline/online synchronization

import { Database } from 'better-sqlite3'
import { ProductRepository } from '../database/repositories/product.repository'
import { SyncQueueRepository } from '../database/repositories/sync-queue.repository'
import { ProductEntity } from '../types/entities/product.types'
import {
  QueueStatus,
  SyncAction,
  SyncQueueAction,
  SyncQueueEntity,
} from '../types/entities/sync.types'

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
  private isSyncing = false
  private syncInterval?: NodeJS.Timeout

  constructor(private db: Database) {
    this.syncQueue = new SyncQueueRepository(db)
    this.productRepo = new ProductRepository(db)
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
   */
  async pullProducts(products: ProductEntity[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    try {
      this.productRepo.bulkUpsert(products)
      result.synced = products.length
    } catch (error: any) {
      result.success = false
      result.errors.push(error.message)
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
