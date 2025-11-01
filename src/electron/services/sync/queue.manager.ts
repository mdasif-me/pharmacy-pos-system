// queue manager - manage offline action queue

import { Database } from 'better-sqlite3'
import { SyncQueueRepository } from '../../database/repositories/sync-queue.repository'
import { QueueStatus, SyncQueueAction } from '../../types/entities/sync.types'

export interface QueueItem {
  id: number
  entity_type: string
  entity_id: number
  action: SyncQueueAction
  payload: any
  retry_count: number
  created_at: string
}

export class QueueManager {
  private repository: SyncQueueRepository
  private isProcessing = false

  constructor(private db: Database) {
    this.repository = new SyncQueueRepository(db)
  }

  /**
   * add item to queue
   */
  enqueue(entityType: string, entityId: number, action: SyncQueueAction, payload: any): void {
    this.repository.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      payload: JSON.stringify(payload),
      status: QueueStatus.PENDING,
    })
  }

  /**
   * get next batch of items to process
   */
  dequeue(limit = 50): QueueItem[] {
    const items = this.repository.getPending(limit)

    return items.map((item) => ({
      id: item.id,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      action: item.action,
      payload: JSON.parse(item.payload),
      retry_count: item.retry_count || 0,
      created_at: item.created_at || '',
    }))
  }

  /**
   * mark item as completed
   */
  markCompleted(id: number): void {
    this.repository.markAsCompleted(id)
  }

  /**
   * mark item as failed
   */
  markFailed(id: number): void {
    this.repository.markAsFailed(id)
  }

  /**
   * get queue size
   */
  size(): number {
    const stats = this.repository.getStats()
    return stats.pending + stats.processing
  }

  /**
   * get queue stats
   */
  getStats(): {
    pending: number
    processing: number
    failed: number
    completed: number
  } {
    return this.repository.getStats()
  }

  /**
   * clear completed items
   */
  clearCompleted(): number {
    return this.repository.clearCompleted()
  }

  /**
   * retry failed items
   */
  retryFailed(): void {
    this.repository.retryFailed()
  }

  /**
   * clear all queue items
   */
  clearAll(): void {
    // implement if needed
  }

  /**
   * check if queue is empty
   */
  isEmpty(): boolean {
    return this.size() === 0
  }

  /**
   * peek at next item without removing
   */
  peek(): QueueItem | undefined {
    const items = this.dequeue(1)
    return items[0]
  }
}
