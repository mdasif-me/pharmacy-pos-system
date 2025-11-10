import { Database } from 'better-sqlite3'
import { SaleEntity, SaleSearchParams } from '../../types/entities/sale.types'
import { BaseRepository } from './base.repository'

export class SalesRepository extends BaseRepository<SaleEntity> {
  constructor(db: Database) {
    super(db, 'sales')
  }

  protected prepareStatements(): void {
    this.insertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        customer_phone_number, grand_total, grand_discount_total,
        is_sync, mediboy_customer_id, sale_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    this.selectStmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
    this.deleteStmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
  }

  /**
   * Create a sale entry
   */
  create(sale: Omit<SaleEntity, 'id' | 'created_at' | 'updated_at'>): SaleEntity {
    const result = this.insertStmt!.run(
      sale.customer_phone_number ?? null,
      sale.grand_total,
      sale.grand_discount_total,
      sale.is_sync ?? 0,
      sale.mediboy_customer_id ?? null,
      sale.sale_date
    )

    const id = result.lastInsertRowid as number
    const now = new Date().toISOString()

    return {
      ...sale,
      id,
      created_at: now,
      updated_at: now,
    }
  }

  /**
   * Update a sale entry
   */
  update(id: number, updates: Partial<SaleEntity>): SaleEntity | undefined {
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
   * Get unsynced sales
   */
  getUnsynced(): SaleEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE is_sync = 0 ORDER BY created_at ASC`
    return this.db.prepare(sql).all() as SaleEntity[]
  }

  /**
   * Mark sale as synced
   */
  markAsSynced(saleId: number): SaleEntity | undefined {
    const now = new Date().toISOString()
    return this.update(saleId, {
      is_sync: 1,
      synced_at: now,
    })
  }

  /**
   * Mark sale as sync failed
   */
  markSyncFailed(saleId: number, errorMessage: string): SaleEntity | undefined {
    return this.update(saleId, {
      error_message: errorMessage,
    })
  }

  /**
   * Get sales by customer phone
   */
  getByCustomerPhone(phoneNumber: string): SaleEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE customer_phone_number = ? ORDER BY sale_date DESC`
    return this.db.prepare(sql).all(phoneNumber) as SaleEntity[]
  }

  /**
   * Get sales by customer ID
   */
  getByCustomerId(customerId: number): SaleEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE mediboy_customer_id = ? ORDER BY sale_date DESC`
    return this.db.prepare(sql).all(customerId) as SaleEntity[]
  }

  /**
   * Get sales within date range
   */
  getSalesByDateRange(fromDate: string, toDate: string): SaleEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE sale_date BETWEEN ? AND ?
      ORDER BY sale_date DESC
    `
    return this.db.prepare(sql).all(fromDate, toDate) as SaleEntity[]
  }

  /**
   * Search sales with filters
   */
  search(params: SaleSearchParams): SaleEntity[] {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const values: any[] = []

    if (params.customer_phone_number) {
      sql += ' AND customer_phone_number = ?'
      values.push(params.customer_phone_number)
    }

    if (params.mediboy_customer_id) {
      sql += ' AND mediboy_customer_id = ?'
      values.push(params.mediboy_customer_id)
    }

    if (params.sale_date_from) {
      sql += ' AND sale_date >= ?'
      values.push(params.sale_date_from)
    }

    if (params.sale_date_to) {
      sql += ' AND sale_date <= ?'
      values.push(params.sale_date_to)
    }

    if (params.is_sync !== undefined) {
      sql += ' AND is_sync = ?'
      values.push(params.is_sync)
    }

    const orderBy = params.order_by || 'created_at'
    const orderDir = params.order_dir || 'DESC'
    sql += ` ORDER BY ${orderBy} ${orderDir}`

    if (params.limit) {
      sql += ' LIMIT ?'
      values.push(params.limit)
    }

    if (params.offset) {
      sql += ' OFFSET ?'
      values.push(params.offset)
    }

    return this.db.prepare(sql).all(...values) as SaleEntity[]
  }

  /**
   * Get all sales
   */
  getAll(limit = 100, offset = 0): SaleEntity[] {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    return this.db.prepare(sql).all(limit, offset) as SaleEntity[]
  }

  /**
   * Get sales summary statistics
   */
  getSalesStats(
    fromDate?: string,
    toDate?: string
  ): {
    total_sales: number
    total_amount: number
    total_discount: number
    synced_count: number
  } {
    let sql = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(grand_total) as total_amount,
        SUM(grand_discount_total) as total_discount,
        SUM(CASE WHEN is_sync = 1 THEN 1 ELSE 0 END) as synced_count
      FROM ${this.tableName}
      WHERE 1=1
    `

    const values: any[] = []

    if (fromDate) {
      sql += ' AND sale_date >= ?'
      values.push(fromDate)
    }

    if (toDate) {
      sql += ' AND sale_date <= ?'
      values.push(toDate)
    }

    return this.db.prepare(sql).get(...values) as any
  }
}
