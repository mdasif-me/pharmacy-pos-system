import { Database } from 'better-sqlite3'
import { BatchEntity, BatchSearchParams } from '../../types/entities/batch.types'
import { BaseRepository } from './base.repository'

export class BatchesRepository extends BaseRepository<BatchEntity> {
  constructor(db: Database) {
    super(db, 'batches')
  }

  protected prepareStatements(): void {
    this.insertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        product_stock_id, product_id, batch_no, available, qty_stock, exp, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    this.selectStmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
    this.deleteStmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
  }

  /**
   * Create a batch entry
   */
  create(batch: Omit<BatchEntity, 'id' | 'created_at' | 'updated_at'>): BatchEntity {
    const result = this.insertStmt!.run(
      batch.product_stock_id,
      batch.product_id,
      batch.batch_no,
      batch.available ?? 0,
      batch.qty_stock,
      batch.exp,
      batch.status || 'Boxed'
    )

    const id = result.lastInsertRowid as number
    const now = new Date().toISOString()

    return {
      ...batch,
      id,
      created_at: now,
      updated_at: now,
    }
  }

  /**
   * Update a batch entry
   */
  update(id: number, updates: Partial<BatchEntity>): BatchEntity | undefined {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)

    const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`
    const result = this.db.prepare(sql).run(...values)

    if (result.changes > 0) {
      return this.findById(id)
    }

    return undefined
  }

  /**
   * Get batches by product ID
   */
  getByProductId(productId: number): BatchEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE product_id = ? ORDER BY created_at DESC`
    return this.db.prepare(sql).all(productId) as BatchEntity[]
  }

  /**
   * Get batch by batch number
   */
  getByBatchNo(batchNo: string): BatchEntity | undefined {
    const sql = `SELECT * FROM ${this.tableName} WHERE batch_no = ?`
    return this.db.prepare(sql).get(batchNo) as BatchEntity | undefined
  }

  /**
   * Get batches by status
   */
  getByStatus(status: string): BatchEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY exp ASC`
    return this.db.prepare(sql).all(status) as BatchEntity[]
  }

  /**
   * Get batches expiring before date
   */
  getExpiringBefore(expDate: string): BatchEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE exp <= ? ORDER BY exp ASC`
    return this.db.prepare(sql).all(expDate) as BatchEntity[]
  }

  /**
   * Get available batches for a product (with available qty > 0)
   */
  getAvailableBatches(productId: number): BatchEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE product_id = ? AND available > 0
      ORDER BY exp ASC
    `
    return this.db.prepare(sql).all(productId) as BatchEntity[]
  }

  /**
   * Reduce available quantity from batch
   */
  reduceAvailable(batchId: number, qty: number): BatchEntity | undefined {
    const batch = this.findById(batchId)
    if (!batch) return undefined

    const newAvailable = Math.max(0, batch.available - qty)
    return this.update(batchId, { available: newAvailable })
  }

  /**
   * Search batches with filters
   */
  search(params: BatchSearchParams): BatchEntity[] {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const values: any[] = []

    if (params.product_id) {
      sql += ' AND product_id = ?'
      values.push(params.product_id)
    }

    if (params.batch_no) {
      sql += ' AND batch_no LIKE ?'
      values.push(`%${params.batch_no}%`)
    }

    if (params.status) {
      sql += ' AND status = ?'
      values.push(params.status)
    }

    if (params.exp_before) {
      sql += ' AND exp <= ?'
      values.push(params.exp_before)
    }

    sql += ' ORDER BY exp ASC'

    if (params.limit) {
      sql += ' LIMIT ?'
      values.push(params.limit)
    }

    if (params.offset) {
      sql += ' OFFSET ?'
      values.push(params.offset)
    }

    return this.db.prepare(sql).all(...values) as BatchEntity[]
  }

  /**
   * Get all batches
   */
  getAll(limit = 100, offset = 0): BatchEntity[] {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    return this.db.prepare(sql).all(limit, offset) as BatchEntity[]
  }
}
