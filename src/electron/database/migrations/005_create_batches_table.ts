/**
 * Batches table for tracking product stock batches
 * Migration: 005_create_batches_table
 */

export const migration_005 = {
  version: 5,
  name: '005_create_batches_table',

  up: [
    `CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_stock_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      batch_no TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 0,
      qty_stock INTEGER NOT NULL DEFAULT 0,
      exp DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Boxed',
      sync_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(batch_no, product_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_batches_batch_no ON batches(batch_no)`,
    `CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)`,
    `CREATE INDEX IF NOT EXISTS idx_batches_exp ON batches(exp)`,
  ],

  down: [
    'DROP INDEX IF EXISTS idx_batches_exp',
    'DROP INDEX IF EXISTS idx_batches_status',
    'DROP INDEX IF EXISTS idx_batches_batch_no',
    'DROP INDEX IF EXISTS idx_batches_product',
    'DROP TABLE IF EXISTS batches',
  ],
}
