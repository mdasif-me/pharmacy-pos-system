/**
 * Initial database schema with optimizations
 * Migration: 001_initial_schema
 */

export const migration_001 = {
  version: 1,
  name: '001_initial_schema',

  up: [
    // Companies table
    `CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Categories table
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Products table (optimized)
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      product_name TEXT NOT NULL,
      generic_name TEXT,
      company_id INTEGER NOT NULL,
      category_id INTEGER,
      
      -- Pricing
      mrp REAL NOT NULL,
      sale_price REAL,
      discount_price REAL,
      peak_hour_price REAL,
      mediboy_offer_price REAL,
      
      -- Stock
      in_stock INTEGER DEFAULT 0,
      stock_alert INTEGER DEFAULT 10,
      
      -- Metadata
      type TEXT,
      prescription INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      
      -- Images
      cover_image TEXT,
      image_path TEXT,
      
      -- Sync tracking
      version INTEGER DEFAULT 1,
      last_synced_at TEXT,
      last_modified_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_dirty INTEGER DEFAULT 0,
      
      -- Full JSON for extensibility
      raw_data TEXT,
      
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`,

    // Auth tokens table
    `CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1
    )`,

    // Sync queue table
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT
    )`,

    // Sync metadata table
    `CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL UNIQUE,
      last_sync_at TEXT,
      last_sync_version INTEGER DEFAULT 0,
      total_synced INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0
    )`,
  ],

  down: [
    'DROP TABLE IF EXISTS sync_metadata',
    'DROP TABLE IF EXISTS sync_queue',
    'DROP TABLE IF EXISTS auth_tokens',
    'DROP TABLE IF EXISTS products',
    'DROP TABLE IF EXISTS categories',
    'DROP TABLE IF EXISTS companies',
  ],
}
