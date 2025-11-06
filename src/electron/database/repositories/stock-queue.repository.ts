import { Database } from 'better-sqlite3'
import { BaseRepository } from './base.repository'

export interface StockQueueEntity {
  id: number
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
  is_sync: number // 0 = not synced, 1 = synced
  created_at?: string
  synced_at?: string | null
  error_message?: string | null
}

export interface StockQueueWithProduct extends StockQueueEntity {
  product_name?: string
  company_name?: string
  generic_name?: string
  mrp?: number
  type?: string
  in_stock?: number
}

export class StockQueueRepository extends BaseRepository<StockQueueEntity> {
  constructor(db: Database) {
    super(db, 'add_stock_queues')
  }

  protected prepareStatements(): void {
    this.insertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        product_id, stock_mrp, purchase_price, discount_price,
        peak_hour_price, offer_price, perc_off, batch_no,
        expire_date, qty, stock_alert, shelf, is_sync
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
  }

  /**
   * Add stock to queue (offline-first)
   */
  addToQueue(
    stock: Omit<StockQueueEntity, 'id' | 'created_at' | 'synced_at' | 'error_message'>
  ): StockQueueEntity {
    const result = this.insertStmt!.run(
      stock.product_id,
      stock.stock_mrp,
      stock.purchase_price,
      stock.discount_price,
      stock.peak_hour_price,
      stock.offer_price,
      stock.perc_off,
      stock.batch_no,
      stock.expire_date,
      stock.qty,
      stock.stock_alert,
      stock.shelf,
      stock.is_sync || 0
    )

    const id = result.lastInsertRowid as number
    return {
      ...stock,
      id,
      created_at: new Date().toISOString(),
      synced_at: null,
      error_message: null,
    }
  }

  /**
   * Create a stock queue entry (BaseRepository requirement)
   */
  create(stock: Omit<StockQueueEntity, 'id'>): StockQueueEntity {
    return this.addToQueue(stock)
  }

  /**
   * Update a stock queue entry (BaseRepository requirement)
   */
  update(id: number, updates: Partial<StockQueueEntity>): StockQueueEntity | undefined {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) {
      return this.findById(id)
    }

    values.push(id)
    const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`
    const result = this.db.prepare(sql).run(...values)

    if (result.changes > 0) {
      return this.findById(id)
    }

    return undefined
  }

  /**
   * Get all unsynced stock items
   */
  getUnsynced(): StockQueueEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE is_sync = 0 ORDER BY created_at ASC`
    return this.db.prepare(sql).all() as StockQueueEntity[]
  }

  /**
   * Get recent stock items with product details (all items, newest first)
   */
  getRecentWithProduct(limit = 20): StockQueueWithProduct[] {
    const sql = `
      SELECT 
        sq.*,
        p.product_name,
        c.name as company_name,
        p.generic_name,
        p.mrp,
        p.type,
        p.in_stock
      FROM ${this.tableName} sq
      LEFT JOIN products p ON sq.product_id = p.id
      LEFT JOIN companies c ON p.company_id = c.id
      ORDER BY sq.created_at DESC
      LIMIT 100
    `

    console.log('[StockQueueRepository] Fetching all recent stock items')
    const result = this.db.prepare(sql).all() as StockQueueWithProduct[]
    console.log('[StockQueueRepository] Found', result.length, 'items total')

    return result
  }

  /**
   * Get all unsynced items and today's items with product details
   */
  getUnsyncedAndTodayItems(): StockQueueWithProduct[] {
    // Get today's date boundaries in local timezone
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const todayEnd = tomorrow.toISOString()

    console.log('[StockQueueRepository] Date range:', { todayStart, todayEnd })

    const sql = `
      SELECT 
        sq.*,
        p.product_name,
        c.name as company_name,
        p.generic_name,
        p.mrp,
        p.type,
        p.in_stock
      FROM ${this.tableName} sq
      LEFT JOIN products p ON sq.product_id = p.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE sq.is_sync = 0 OR (sq.created_at >= ? AND sq.created_at < ?)
      ORDER BY sq.created_at DESC
    `

    console.log('[StockQueueRepository] Fetching unsynced and today items')
    const result = this.db.prepare(sql).all(todayStart, todayEnd) as StockQueueWithProduct[]
    console.log('[StockQueueRepository] Found', result.length, 'items (unsynced + today)')

    // Debug: Check if there are ANY items in the table
    const totalCount = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).get() as {
      count: number
    }
    const unsyncedCount = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_sync = 0`)
      .get() as { count: number }
    console.log(
      '[StockQueueRepository] Total items in queue:',
      totalCount.count,
      'Unsynced:',
      unsyncedCount.count
    )

    return result
  }

  /**
   * Mark stock as synced
   */
  markAsSynced(id: number): boolean {
    const sql = `
      UPDATE ${this.tableName}
      SET is_sync = 1, synced_at = ?, error_message = NULL
      WHERE id = ?
    `
    const result = this.db.prepare(sql).run(new Date().toISOString(), id)
    return result.changes > 0
  }

  /**
   * Mark stock sync as failed
   */
  markSyncFailed(id: number, errorMessage: string): boolean {
    const sql = `
      UPDATE ${this.tableName}
      SET error_message = ?
      WHERE id = ?
    `
    const result = this.db.prepare(sql).run(errorMessage, id)
    return result.changes > 0
  }

  /**
   * Get count of unsynced items
   */
  getUnsyncedCount(): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_sync = 0`
    const result = this.db.prepare(sql).get() as { count: number }
    return result.count
  }

  /**
   * Delete synced items older than specified days
   */
  cleanupOldSyncedItems(daysOld = 30): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const sql = `
      DELETE FROM ${this.tableName}
      WHERE is_sync = 1 AND synced_at < ?
    `
    const result = this.db.prepare(sql).run(cutoffDate.toISOString())
    return result.changes
  }
}
