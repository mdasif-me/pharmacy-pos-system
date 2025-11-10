/**
 * Sale Items table for tracking individual items in a sale
 * Migration: 007_create_sale_items_table
 */

export const migration_007 = {
  version: 7,
  name: '007_create_sale_items_table',

  up: [
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_id INTEGER NOT NULL,
      product_stock_id INTEGER,
      product_id INTEGER NOT NULL,
      mrp REAL NOT NULL,
      sale_price REAL NOT NULL,
      qty INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_sales ON sale_items(sales_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_batch ON sale_items(product_stock_id)`,
  ],

  down: [
    'DROP INDEX IF EXISTS idx_sale_items_batch',
    'DROP INDEX IF EXISTS idx_sale_items_product',
    'DROP INDEX IF EXISTS idx_sale_items_sales',
    'DROP TABLE IF EXISTS sale_items',
  ],
}
