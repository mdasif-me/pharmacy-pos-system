export const migration_003 = {
  name: 'add_stock_queue',
  up: [
    `
    CREATE TABLE IF NOT EXISTS add_stock_queues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      stock_mrp REAL NOT NULL,
      purchase_price REAL NOT NULL,
      discount_price REAL NOT NULL,
      peak_hour_price REAL NOT NULL,
      offer_price REAL NOT NULL,
      perc_off REAL NOT NULL DEFAULT 0,
      batch_no TEXT NOT NULL,
      expire_date TEXT NOT NULL,
      qty INTEGER NOT NULL,
      stock_alert INTEGER NOT NULL DEFAULT 0,
      shelf TEXT,
      is_sync INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT,
      error_message TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
    `CREATE INDEX IF NOT EXISTS idx_stock_queue_sync ON add_stock_queues(is_sync)`,
    `CREATE INDEX IF NOT EXISTS idx_stock_queue_product ON add_stock_queues(product_id)`,
  ],
}
