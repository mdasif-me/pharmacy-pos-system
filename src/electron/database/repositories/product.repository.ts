import { Database } from 'better-sqlite3'
import { DB_TABLES } from '../../core/constants/database.constants'
import {
  EntityStatus,
  ProductEntity,
  ProductSearchParams,
  ProductWithRelations,
} from '../../types/entities/product.types'
import { BaseRepository, QueryOptions } from './base.repository'

export class ProductRepository extends BaseRepository<ProductEntity> {
  constructor(db: Database) {
    super(db, DB_TABLES.PRODUCTS)
  }

  protected prepareStatements(): void {
    // prepare commonly used statements for performance
    this.selectStmt = this.db.prepare(`
      SELECT * FROM ${this.tableName} WHERE id = ?
    `)

    this.insertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        id, product_name, generic_name, company_id, category_id,
        mrp, sale_price, discount_price, peak_hour_price, mediboy_offer_price,
        in_stock, stock_alert, type, prescription, status,
        cover_image, image_path, version, last_modified_at, is_dirty, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
  }

  /**
   * search products with full-text search
   */
  search(params: ProductSearchParams): ProductEntity[] {
    const { query, limit = 100, offset = 0, inStockOnly = false, categoryId, companyId } = params

    let sql = `
      SELECT 
        p.*, 
        c.name as company_name, 
        cat.name as category_name
      FROM ${this.tableName} p
      LEFT JOIN ${DB_TABLES.COMPANIES} c ON p.company_id = c.id
      LEFT JOIN ${DB_TABLES.CATEGORIES} cat ON p.category_id = cat.id
      WHERE 1=1
    `
    const sqlParams: any[] = []

    // full-text search on product name only
    if (query) {
      sql += ` AND p.product_name LIKE ?`
      const searchTerm = `%${query}%`
      sqlParams.push(searchTerm)
    }

    // filter by stock
    if (inStockOnly) {
      sql += ` AND p.in_stock > 0`
    }

    // filter by category
    if (categoryId) {
      sql += ` AND p.category_id = ?`
      sqlParams.push(categoryId)
    }

    // filter by company
    if (companyId) {
      sql += ` AND p.company_id = ?`
      sqlParams.push(companyId)
    }

    // only active products
    sql += ` AND p.status = 'active'`

    // order by relevance: prioritize products that START with the search term
    // Then by stock, then alphabetically
    if (query) {
      sql += ` ORDER BY 
        CASE 
          WHEN LOWER(p.product_name) LIKE ? THEN 0
          ELSE 1
        END,
        p.in_stock DESC, 
        p.product_name ASC`
      const startsWithTerm = `${query.toLowerCase()}%`
      sqlParams.push(startsWithTerm)
    } else {
      sql += ` ORDER BY p.in_stock DESC, p.product_name ASC`
    }

    // pagination
    sql += ` LIMIT ? OFFSET ?`
    sqlParams.push(limit, offset)

    const results = this.db.prepare(sql).all(...sqlParams) as any[]

    // Parse raw_data to extract quantity, unit_in_pack, and other fields
    return results.map((product) => {
      if (product.raw_data) {
        try {
          const rawData = JSON.parse(product.raw_data as string)
          return {
            ...product,
            quantity: rawData.quantity || product.type || '',
            unit_in_pack: rawData.unit_in_pack || '',
            cart_text: rawData.cart_text || '',
          } as any
        } catch (error) {
          console.error('Failed to parse raw_data for product:', product.id, error)
          return product
        }
      }
      return product
    })
  }

  /**
   * search using fts5 (faster for large datasets)
   */
  searchFTS(query: string, limit = 100): ProductEntity[] {
    const sql = `
      SELECT p.* 
      FROM ${DB_TABLES.PRODUCTS_FTS} fts
      INNER JOIN ${this.tableName} p ON fts.rowid = p.id
      WHERE ${DB_TABLES.PRODUCTS_FTS} MATCH ?
      ORDER BY rank
      LIMIT ?
    `
    return this.db.prepare(sql).all(query, limit) as ProductEntity[]
  }

  /**
   * find product with company and category info
   */
  findWithRelations(id: number): ProductWithRelations | undefined {
    const sql = `
      SELECT 
        p.*,
        c.name as company_name,
        cat.name as category_name
      FROM ${this.tableName} p
      LEFT JOIN ${DB_TABLES.COMPANIES} c ON p.company_id = c.id
      LEFT JOIN ${DB_TABLES.CATEGORIES} cat ON p.category_id = cat.id
      WHERE p.id = ?
    `
    return this.db.prepare(sql).get(id) as ProductWithRelations | undefined
  }

  /**
   * get all products with relations
   */
  findAllWithRelations(options: QueryOptions = {}): ProductWithRelations[] {
    const { limit = 100000, offset = 0, orderBy = 'product_name', orderDir = 'ASC' } = options

    const sql = `
      SELECT 
        p.*,
        c.name as company_name,
        cat.name as category_name
      FROM ${this.tableName} p
      LEFT JOIN ${DB_TABLES.COMPANIES} c ON p.company_id = c.id
      LEFT JOIN ${DB_TABLES.CATEGORIES} cat ON p.category_id = cat.id
      WHERE p.status = 'active' AND p.in_stock > 0
      ORDER BY p.${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `
    const results = this.db.prepare(sql).all(limit, offset) as ProductWithRelations[]

    // Also get total products and stock statistics
    const totalSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE status = 'active'`
    const stockSql = `SELECT COUNT(*) as with_stock FROM ${this.tableName} WHERE status = 'active' AND in_stock > 0`
    const totalResult = this.db.prepare(totalSql).get() as { total: number }
    const stockResult = this.db.prepare(stockSql).get() as { with_stock: number }

    console.log(
      `[ProductRepository] findAllWithRelations: Returning ${results.length} products (Total: ${totalResult.total}, With stock: ${stockResult.with_stock})`
    )

    // Log first few products with stock for debugging
    const withStock = results.filter((p) => p.in_stock > 0).slice(0, 3)
    if (withStock.length > 0) {
      console.log(
        '[ProductRepository] Sample products with stock:',
        withStock.map((p) => ({
          id: p.id,
          name: p.product_name,
          in_stock: p.in_stock,
        }))
      )
    }

    return results
  }

  /**
   * create new product
   */
  create(product: Omit<ProductEntity, 'id'> & { id?: number }): ProductEntity {
    const result = this.insertStmt!.run(
      (product as any).id || null,
      product.product_name,
      product.generic_name || null,
      product.company_id,
      product.category_id || null,
      product.mrp,
      product.sale_price || null,
      product.discount_price || null,
      product.peak_hour_price || null,
      product.mediboy_offer_price || null,
      product.in_stock || 0,
      product.stock_alert || 10,
      product.type || null,
      product.prescription || 0,
      product.status || EntityStatus.ACTIVE,
      product.cover_image || null,
      product.image_path || null,
      product.version || 1,
      product.last_modified_at || new Date().toISOString(),
      product.is_dirty || 0,
      product.raw_data || null
    )

    return { ...product, id: result.lastInsertRowid as number } as ProductEntity
  }

  /**
   * update existing product
   */
  update(id: number, product: Partial<ProductEntity>): ProductEntity | undefined {
    const fields: string[] = []
    const values: any[] = []

    // build dynamic update query
    Object.entries(product).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    // always increment version and mark dirty
    fields.push('version = version + 1')
    fields.push('is_dirty = 1')
    fields.push('last_modified_at = ?')
    values.push(new Date().toISOString())

    values.push(id)

    const sql = `
      UPDATE ${this.tableName}
      SET ${fields.join(', ')}
      WHERE id = ?
    `

    const result = this.db.prepare(sql).run(...values)

    if (result.changes > 0) {
      return this.findById(id)
    }

    return undefined
  }

  /**
   * bulk upsert products (for sync)
   * Only updates products that haven't been modified locally (is_dirty = 0)
   */
  bulkUpsert(products: ProductEntity[]): void {
    const upsertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (
        id, product_name, generic_name, company_id, category_id,
        mrp, sale_price, discount_price, peak_hour_price, mediboy_offer_price,
        in_stock, stock_alert, type, prescription, status,
        cover_image, image_path, version, last_synced_at, last_modified_at, 
        is_dirty, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        product_name = excluded.product_name,
        generic_name = excluded.generic_name,
        company_id = excluded.company_id,
        category_id = COALESCE(excluded.category_id, ${this.tableName}.category_id),
        mrp = excluded.mrp,
        sale_price = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.sale_price
          ELSE excluded.sale_price 
        END,
        discount_price = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.discount_price
          ELSE excluded.discount_price 
        END,
        peak_hour_price = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.peak_hour_price
          ELSE excluded.peak_hour_price 
        END,
        mediboy_offer_price = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.mediboy_offer_price
          ELSE excluded.mediboy_offer_price 
        END,
        in_stock = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.in_stock
          WHEN excluded.in_stock > 0 THEN excluded.in_stock 
          ELSE ${this.tableName}.in_stock 
        END,
        stock_alert = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.stock_alert
          ELSE excluded.stock_alert 
        END,
        type = excluded.type,
        prescription = excluded.prescription,
        status = excluded.status,
        cover_image = excluded.cover_image,
        image_path = excluded.image_path,
        version = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.version
          ELSE excluded.version 
        END,
        last_synced_at = excluded.last_synced_at,
        last_modified_at = CASE 
          WHEN ${this.tableName}.is_dirty = 1 THEN ${this.tableName}.last_modified_at
          ELSE excluded.last_modified_at 
        END,
        raw_data = excluded.raw_data
    `)

    // Get count of locally modified products before sync
    const dirtyCountStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_dirty = 1
    `)
    const dirtyResult = dirtyCountStmt.get() as { count: number }

    if (dirtyResult.count > 0) {
      // Get details of dirty products
      const dirtyProducts = this.db
        .prepare(
          `
        SELECT id, product_name, in_stock FROM ${this.tableName} 
        WHERE is_dirty = 1 LIMIT 5
      `
        )
        .all() as Array<{ id: number; product_name: string; in_stock: number }>

      console.log(
        `[ProductRepository] 🔒 Protecting ${dirtyResult.count} locally edited products during sync`
      )
      console.log('[ProductRepository] Sample protected products:', dirtyProducts)
    }

    // run in transaction for performance
    const transaction = this.db.transaction((prods: ProductEntity[]) => {
      for (const p of prods) {
        upsertStmt.run(
          p.id,
          p.product_name,
          p.generic_name || null,
          p.company_id,
          p.category_id || null,
          p.mrp,
          p.sale_price || null,
          p.discount_price || null,
          p.peak_hour_price || null,
          p.mediboy_offer_price || null,
          p.in_stock || 0,
          p.stock_alert || 10,
          p.type || null,
          p.prescription || 0,
          p.status || 'active',
          p.cover_image || null,
          p.image_path || null,
          p.version || 1,
          p.last_synced_at || null,
          p.last_modified_at || new Date().toISOString(),
          0, // reset dirty flag after sync
          p.raw_data || null
        )
      }
    })

    transaction(products)
  }

  /**
   * get dirty products (pending sync)
   */
  getDirtyProducts(): ProductEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE is_dirty = 1
      ORDER BY last_modified_at ASC
    `
    return this.db.prepare(sql).all() as ProductEntity[]
  }

  /**
   * mark products as synced
   */
  markSynced(ids: number[]): void {
    const placeholders = ids.map(() => '?').join(',')
    const sql = `
      UPDATE ${this.tableName}
      SET is_dirty = 0
      WHERE id IN (${placeholders})
    `
    this.db.prepare(sql).run(...ids)
  }

  /**
   * get low stock products
   */
  getLowStock(): ProductEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE in_stock <= stock_alert
      AND status = 'active'
      ORDER BY in_stock ASC
    `
    return this.db.prepare(sql).all() as ProductEntity[]
  }

  /**
   * update stock quantity
   */
  updateStock(id: number, quantity: number, mode: 'add' | 'set' = 'set'): boolean {
    const sql =
      mode === 'add'
        ? `UPDATE ${this.tableName} SET in_stock = in_stock + ?, is_dirty = 1, last_modified_at = ? WHERE id = ?`
        : `UPDATE ${this.tableName} SET in_stock = ?, is_dirty = 1, last_modified_at = ? WHERE id = ?`

    const result = this.db.prepare(sql).run(quantity, new Date().toISOString(), id)

    return result.changes > 0
  }

  /**
   * get product count by status
   */
  getCountByStatus(status: string = 'active'): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE status = ?`
    const result = this.db.prepare(sql).get(status) as { count: number }
    return result.count
  }

  /**
   * rebuild fts index
   */
  rebuildSearchIndex(): void {
    // rebuild fts5 index
    this.db
      .prepare(`INSERT INTO ${DB_TABLES.PRODUCTS_FTS}(${DB_TABLES.PRODUCTS_FTS}) VALUES('rebuild')`)
      .run()
  }
}
