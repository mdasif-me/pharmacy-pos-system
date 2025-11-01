// category repository - crud for categories

import { Database } from 'better-sqlite3'
import { DB_TABLES } from '../../core/constants/database.constants'
import { BaseRepository } from './base.repository'

export interface CategoryEntity {
  id: number
  name: string
  created_at?: string
}

export class CategoryRepository extends BaseRepository<CategoryEntity> {
  constructor(db: Database) {
    super(db, DB_TABLES.CATEGORIES)
  }

  /**
   * create new category
   */
  create(data: Partial<CategoryEntity>): CategoryEntity {
    const sql = `
      INSERT INTO ${this.tableName} (name, created_at)
      VALUES (?, ?)
    `
    const result = this.execute(sql, [data.name, data.created_at || new Date().toISOString()])

    return {
      id: result.lastInsertRowid as number,
      name: data.name!,
      created_at: data.created_at || new Date().toISOString(),
    }
  }

  /**
   * update category
   */
  update(id: number, data: Partial<CategoryEntity>): CategoryEntity | undefined {
    const sql = `UPDATE ${this.tableName} SET name = ? WHERE id = ?`
    const result = this.execute(sql, [data.name, id])

    if (result.changes > 0) {
      return this.findById(id)
    }
    return undefined
  }

  /**
   * find category by name
   */
  findByName(name: string): CategoryEntity | undefined {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = ?`
    return this.queryOne(sql, [name])
  }

  /**
   * search categories by name
   */
  search(query: string, limit = 50): CategoryEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE name LIKE ?
      ORDER BY name ASC
      LIMIT ?
    `
    return this.queryAll(sql, [`%${query}%`, limit])
  }

  /**
   * get or create category
   */
  getOrCreate(name: string): CategoryEntity {
    const existing = this.findByName(name)
    if (existing) {
      return existing
    }
    return this.create({ name })
  }

  /**
   * bulk insert categories
   */
  bulkInsert(categories: string[]): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ${this.tableName} (name)
      VALUES (?)
    `)

    const transaction = this.db.transaction((names: string[]) => {
      for (const name of names) {
        stmt.run(name)
      }
    })

    transaction(categories)
  }
}
