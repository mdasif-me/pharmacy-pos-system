/**
 * Base Repository - Abstract CRUD operations
 * All repositories extend this class
 */

import { Database, Statement } from 'better-sqlite3'

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDir?: 'ASC' | 'DESC'
}

export abstract class BaseRepository<T extends { id: number }> {
  protected selectStmt?: Statement
  protected insertStmt?: Statement
  protected updateStmt?: Statement
  protected deleteStmt?: Statement

  constructor(
    protected db: Database,
    protected tableName: string
  ) {
    this.prepareStatements()
  }

  /**
   * Prepare common statements (cached for performance)
   */
  protected prepareStatements(): void {
    // Override in child classes for specific statements
  }

  /**
   * Find entity by ID
   */
  findById(id: number): T | undefined {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`
    return this.db.prepare(sql).get(id) as T | undefined
  }

  /**
   * Find all entities with optional filters
   */
  findAll(options: QueryOptions = {}): T[] {
    const { limit = 100, offset = 0, orderBy = 'id', orderDir = 'ASC' } = options

    const sql = `
      SELECT * FROM ${this.tableName}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `

    return this.db.prepare(sql).all(limit, offset) as T[]
  }

  /**
   * Count total entities
   */
  count(): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`
    const result = this.db.prepare(sql).get() as { count: number }
    return result.count
  }

  /**
   * Check if entity exists
   */
  exists(id: number): boolean {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`
    return this.db.prepare(sql).get(id) !== undefined
  }

  /**
   * Create new entity
   */
  abstract create(data: Partial<T>): T

  /**
   * Update existing entity
   */
  abstract update(id: number, data: Partial<T>): T | undefined

  /**
   * Delete entity
   */
  delete(id: number): boolean {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`
    const result = this.db.prepare(sql).run(id)
    return result.changes > 0
  }

  /**
   * Soft delete (if status column exists)
   */
  softDelete(id: number): boolean {
    const sql = `UPDATE ${this.tableName} SET status = 'deleted' WHERE id = ?`
    const result = this.db.prepare(sql).run(id)
    return result.changes > 0
  }

  /**
   * Execute query and get single result
   */
  protected queryOne<R = T>(sql: string, params: any[] = []): R | undefined {
    return this.db.prepare(sql).get(...params) as R | undefined
  }

  /**
   * Execute query and get all results
   */
  protected queryAll<R = T>(sql: string, params: any[] = []): R[] {
    return this.db.prepare(sql).all(...params) as R[]
  }

  /**
   * Execute query (no result)
   */
  protected execute(sql: string, params: any[] = []): any {
    return this.db.prepare(sql).run(...params)
  }

  /**
   * Begin transaction
   */
  protected transaction<R>(callback: () => R): R {
    return this.db.transaction(callback)()
  }

  /**
   * Build WHERE clause from filters
   */
  protected buildWhereClause(filters: Record<string, any>): { where: string; params: any[] } {
    const conditions: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`)
        params.push(value)
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    return { where, params }
  }

  /**
   * Build pagination clause
   */
  protected buildPaginationClause(options: QueryOptions): { clause: string; params: any[] } {
    const { limit = 100, offset = 0 } = options
    return {
      clause: 'LIMIT ? OFFSET ?',
      params: [limit, offset],
    }
  }

  /**
   * Build ORDER BY clause
   */
  protected buildOrderByClause(options: QueryOptions): string {
    const { orderBy = 'id', orderDir = 'ASC' } = options
    return `ORDER BY ${orderBy} ${orderDir}`
  }
}
