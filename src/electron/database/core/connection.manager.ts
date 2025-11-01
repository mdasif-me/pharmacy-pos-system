// connection.manager.ts - Database connection manager

import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export class DatabaseManager {
  private static instance: DatabaseManager
  private db: Database.Database

  private constructor(dbPath: string) {
    // Ensure directory exists
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Create/open database
    this.db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    })

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    console.log(`Database connected: ${dbPath}`)
  }

  public static getInstance(dbPath: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(dbPath)
    }
    return DatabaseManager.instance
  }

  public getDatabase(): Database.Database {
    return this.db
  }

  public close(): void {
    if (this.db) {
      this.db.close()
      console.log('Database connection closed')
    }
  }
}
