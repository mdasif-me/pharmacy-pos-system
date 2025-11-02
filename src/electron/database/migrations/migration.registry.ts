/**
 * Migration registry and runner
 */

import { Database } from 'better-sqlite3'

import { migration_001 } from './001_initial_schema.js'
import { migration_002 } from './002_add_indexes.js'
import { migration_003 } from './003_add_stock_queue.js'
import { migration_004 } from './004_create_business_setups.js'

export interface Migration {
  version: number
  name: string
  up: string[]
  down: string[]
}

// Register all migrations in order
export const migrations: Migration[] = [migration_001, migration_002, migration_003, migration_004]

export class MigrationManager {
  constructor(private db: Database) {}

  /**
   * Initialize migrations table
   */
  private initMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  /**
   * Get current database version
   */
  private getCurrentVersion(): number {
    const row = this.db.prepare('SELECT MAX(version) as version FROM migrations').get() as {
      version: number | null
    }

    return row?.version ?? 0
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    this.initMigrationsTable()

    const currentVersion = this.getCurrentVersion()
    const pendingMigrations = migrations.filter((m) => m.version > currentVersion)

    if (pendingMigrations.length === 0) {
      console.log('✓ Database is up to date')
      return
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`)

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.name}`)

        // Run migration in transaction
        this.db.transaction(() => {
          // Execute all UP statements
          for (const sql of migration.up) {
            this.db.exec(sql)
          }

          // Record migration
          this.db
            .prepare('INSERT INTO migrations (version, name) VALUES (?, ?)')
            .run(migration.version, migration.name)
        })()

        console.log(`✓ Migration ${migration.version} applied successfully`)
      } catch (error) {
        console.error(`✗ Failed to apply migration ${migration.version}:`, error)
        throw error
      }
    }

    console.log('✓ All migrations completed successfully')
  }

  /**
   * Rollback to specific version
   */
  async rollbackTo(targetVersion: number): Promise<void> {
    const currentVersion = this.getCurrentVersion()

    if (targetVersion >= currentVersion) {
      console.log('Nothing to rollback')
      return
    }

    const migrationsToRollback = migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version) // Reverse order

    console.log(`Rolling back ${migrationsToRollback.length} migrations...`)

    for (const migration of migrationsToRollback) {
      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`)

        this.db.transaction(() => {
          // Execute all DOWN statements
          for (const sql of migration.down) {
            this.db.exec(sql)
          }

          // Remove migration record
          this.db.prepare('DELETE FROM migrations WHERE version = ?').run(migration.version)
        })()

        console.log(`✓ Migration ${migration.version} rolled back`)
      } catch (error) {
        console.error(`✗ Failed to rollback migration ${migration.version}:`, error)
        throw error
      }
    }

    console.log('✓ Rollback completed')
  }
}
