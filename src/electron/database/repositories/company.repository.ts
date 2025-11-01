// company repository - crud for companies

import { Database } from 'better-sqlite3'
import { DB_TABLES } from '../../core/constants/database.constants'
import { BaseRepository } from './base.repository'

export interface CompanyEntity {
  id: number
  name: string
  created_at?: string
}

export class CompanyRepository extends BaseRepository<CompanyEntity> {
  constructor(db: Database) {
    super(db, DB_TABLES.COMPANIES)
  }

  /**
   * create new company
   */
  create(data: Partial<CompanyEntity>): CompanyEntity {
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
   * update company
   */
  update(id: number, data: Partial<CompanyEntity>): CompanyEntity | undefined {
    const sql = `UPDATE ${this.tableName} SET name = ? WHERE id = ?`
    const result = this.execute(sql, [data.name, id])

    if (result.changes > 0) {
      return this.findById(id)
    }
    return undefined
  }

  /**
   * find company by name
   */
  findByName(name: string): CompanyEntity | undefined {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = ?`
    return this.queryOne(sql, [name])
  }

  /**
   * search companies by name
   */
  search(query: string, limit = 50): CompanyEntity[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE name LIKE ?
      ORDER BY name ASC
      LIMIT ?
    `
    return this.queryAll(sql, [`%${query}%`, limit])
  }

  /**
   * get or create company
   */
  getOrCreate(name: string): CompanyEntity {
    const existing = this.findByName(name)
    if (existing) {
      return existing
    }
    return this.create({ name })
  }

  /**
   * bulk insert companies
   */
  bulkInsert(companies: string[]): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ${this.tableName} (name)
      VALUES (?)
    `)

    const transaction = this.db.transaction((names: string[]) => {
      for (const name of names) {
        stmt.run(name)
      }
    })

    transaction(companies)
  }
}
