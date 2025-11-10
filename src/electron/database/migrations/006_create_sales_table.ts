/**
 * Sales table for tracking customer sales/orders
 * Migration: 006_create_sales_table
 */

export const migration_006 = {
  version: 6,
  name: '006_create_sales_table',

  up: [
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone_number TEXT,
      grand_total REAL NOT NULL,
      grand_discount_total REAL NOT NULL,
      is_sync INTEGER NOT NULL DEFAULT 0,
      mediboy_customer_id INTEGER,
      sale_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      error_message TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sales_sync ON sales(is_sync)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_phone_number)`,
  ],

  down: [
    'DROP INDEX IF EXISTS idx_sales_customer',
    'DROP INDEX IF EXISTS idx_sales_date',
    'DROP INDEX IF EXISTS idx_sales_sync',
    'DROP TABLE IF EXISTS sales',
  ],
}
