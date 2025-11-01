// sync queue repository - manage offline actions

import { Database } from 'better-sqlite3'
import { DB_TABLES } from '../../core/constants/database.constants'
import { SyncQueueEntity } from '../../types/entities/sync.types'
import { BaseRepository } from './base.repository'

export class SyncQueueRepository extends BaseRepository<SyncQueueEntity> {
  constructor(db: Database) {
    super(db, DB_TABLES.SYNC_QUEUE)
  }

  /**
   * add action to sync queue
   */
  create(data: Partial<SyncQueueEntity>): SyncQueueEntity {
    const sql = `
      INSERT INTO ${this.tableName} (
        entity_type, entity_id, action, payload, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
    const result = this.execute(sql, [
      data.entity_type,
      data.entity_id,
      data.action,
      data.payload,
      data.status || 'pending',
      data.created_at || new Date().toISOString(),
    ])

    return {
      id: result.lastInsertRowid as number,
      ...data,
    } as SyncQueueEntity
  }

  /**
   * update sync queue item
   */
  update(id: number, data: Partial<SyncQueueEntity>): SyncQueueEntity | undefined {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    values.push(id)

    const sql = `
      UPDATE ${this.tableName}
      SET ${fields.join(', ')}
      WHERE id = ?
    `

    const result = this.execute(sql, values)
    if (result.changes > 0) {
      return this.findById(id)
    }
    return undefined
  }

  /**
   * get pending sync items
   */
  getPending(limit = 100): SyncQueueEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ?
    `
    return this.queryAll(sql, [limit])
  }

  /**
   * get failed sync items
   */
  getFailed(): SyncQueueEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'failed'
      ORDER BY created_at ASC
    `
    return this.queryAll(sql, [])
  }

  /**
   * mark as processing
   */
  markAsProcessing(id: number): void {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'processing'
      WHERE id = ?
    `
    this.execute(sql, [id])
  }

  /**
   * mark as completed
   */
  markAsCompleted(id: number): void {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'completed', synced_at = ?
      WHERE id = ?
    `
    this.execute(sql, [new Date().toISOString(), id])
  }

  /**
   * mark as failed
   */
  markAsFailed(id: number): void {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'failed', retry_count = retry_count + 1
      WHERE id = ?
    `
    this.execute(sql, [id])
  }

  /**
   * clear completed items
   */
  clearCompleted(): number {
    const sql = `DELETE FROM ${this.tableName} WHERE status = 'completed'`
    const result = this.execute(sql, [])
    return result.changes
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
    const sql = `
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM ${this.tableName}
    `
    return this.queryOne(sql, []) || { pending: 0, processing: 0, failed: 0, completed: 0 }
  }

  /**
   * retry failed items
   */
  retryFailed(): void {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'pending', retry_count = 0
      WHERE status = 'failed' AND retry_count < 3
    `
    this.execute(sql, [])
  }
}
