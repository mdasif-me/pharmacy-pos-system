import { Database } from 'better-sqlite3'
import {
  SaleItemEntity,
  SaleItemSearchParams,
  SaleItemWithProduct,
} from '../../types/entities/sale-item.types'
import { BaseRepository } from './base.repository'

export class SaleItemsRepository extends BaseRepository<SaleItemEntity> {
  constructor(db: Database) {
    super(db, 'sale_items')
  }

  protected prepareStatements(): void {
    this.insertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        sales_id, product_stock_id, product_id, mrp, sale_price, qty
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)

    this.selectStmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
    this.deleteStmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
  }

  /**
   * Create a sale item entry
   */
  create(saleItem: Omit<SaleItemEntity, 'id' | 'created_at'>): SaleItemEntity {
    const result = this.insertStmt!.run(
      saleItem.sales_id,
      saleItem.product_stock_id ?? null,
      saleItem.product_id,
      saleItem.mrp,
      saleItem.sale_price,
      saleItem.qty
    )

    const id = result.lastInsertRowid as number
    const now = new Date().toISOString()

    return {
      ...saleItem,
      id,
      created_at: now,
    }
  }

  /**
   * Update a sale item entry
   */
  update(id: number, updates: Partial<SaleItemEntity>): SaleItemEntity | undefined {
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

    values.push(id)

    const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`
    const result = this.db.prepare(sql).run(...values)

    if (result.changes > 0) {
      return this.findById(id)
    }

    return undefined
  }

  /**
   * Get all items for a sale
   */
  getBySaleId(saleId: number): SaleItemEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE sales_id = ? ORDER BY id ASC`
    return this.db.prepare(sql).all(saleId) as SaleItemEntity[]
  }

  /**
   * Get sale items with product details
   */
  getBySaleIdWithProduct(saleId: number): SaleItemWithProduct[] {
    const sql = `
      SELECT 
        si.*,
        p.product_name,
        p.generic_name,
        b.batch_no
      FROM ${this.tableName} si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN batches b ON si.product_stock_id = b.id
      WHERE si.sales_id = ?
      ORDER BY si.id ASC
    `
    return this.db.prepare(sql).all(saleId) as SaleItemWithProduct[]
  }

  /**
   * Get items by product ID
   */
  getByProductId(productId: number): SaleItemEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE product_id = ? ORDER BY created_at DESC`
    return this.db.prepare(sql).all(productId) as SaleItemEntity[]
  }

  /**
   * Get items by batch/product_stock_id
   */
  getByBatchId(productStockId: number): SaleItemEntity[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE product_stock_id = ? ORDER BY created_at DESC`
    return this.db.prepare(sql).all(productStockId) as SaleItemEntity[]
  }

  /**
   * Search sale items
   */
  search(params: SaleItemSearchParams): SaleItemEntity[] {
    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`
    const values: any[] = []

    sql += ' AND sales_id = ?'
    values.push(params.sales_id)

    if (params.product_id) {
      sql += ' AND product_id = ?'
      values.push(params.product_id)
    }

    if (params.product_stock_id) {
      sql += ' AND product_stock_id = ?'
      values.push(params.product_stock_id)
    }

    sql += ' ORDER BY id ASC'

    if (params.limit) {
      sql += ' LIMIT ?'
      values.push(params.limit)
    }

    if (params.offset) {
      sql += ' OFFSET ?'
      values.push(params.offset)
    }

    return this.db.prepare(sql).all(...values) as SaleItemEntity[]
  }

  /**
   * Get total quantity sold for a product
   */
  getTotalQtySoldByProduct(productId: number): number {
    const sql = `SELECT SUM(qty) as total FROM ${this.tableName} WHERE product_id = ?`
    const result = this.db.prepare(sql).get(productId) as { total: number | null }
    return result.total ?? 0
  }

  /**
   * Get all items and sum by product
   */
  getAll(limit = 100, offset = 0): SaleItemEntity[] {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    return this.db.prepare(sql).all(limit, offset) as SaleItemEntity[]
  }
}
