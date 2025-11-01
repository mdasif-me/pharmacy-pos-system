// migration.manager.ts - Database migration manager

import Database from 'better-sqlite3'
import { migration_001 } from '../migrations/001_initial_schema'
import { migration_002 } from '../migrations/002_add_indexes'

export interface Migration {
  id: number
  name: string
  up: (db: Database.Database) => void
}

export class MigrationManager {
  private db: Database.Database
  private migrations: Migration[] = [
    {
      id: 1,
      name: migration_001.name,
      up: (db) => {
        migration_001.up.forEach((sql) => db.exec(sql))
      },
    },
    {
      id: 2,
      name: migration_002.name,
      up: (db) => {
        migration_002.up.forEach((sql) => db.exec(sql))
      },
    },
  ]

  constructor(db: Database.Database) {
    this.db = db
    this.createMigrationsTable()
  }

  private createMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  private getMigrationStatus(id: number): boolean {
    const result = this.db.prepare('SELECT id FROM migrations WHERE id = ?').get(id)
    return !!result
  }

  private recordMigration(id: number, name: string): void {
    this.db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(id, name)
  }

  public async runMigrations(): Promise<void> {
    console.log('Running database migrations...')

    for (const migration of this.migrations) {
      if (!this.getMigrationStatus(migration.id)) {
        console.log(`Running migration: ${migration.name}`)
        try {
          migration.up(this.db)
          this.recordMigration(migration.id, migration.name)
          console.log(`✓ Migration ${migration.name} completed`)
        } catch (error) {
          console.error(`✗ Migration ${migration.name} failed:`, error)
          throw error
        }
      } else {
        console.log(`⊙ Migration ${migration.name} already applied`)
      }
    }

    console.log('All migrations completed')
  }
}
