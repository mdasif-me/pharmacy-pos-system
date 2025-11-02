export const migration_004 = {
  version: 4,
  name: '004_create_business_setups',
  up: [
    `CREATE TABLE IF NOT EXISTS business_setups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_mode TINYINT DEFAULT 0,
      bill_mode TINYINT DEFAULT 0,
      sync_at TEXT DEFAULT NULL
    )`,
    // Insert default row if not exists
    `INSERT INTO business_setups (sale_mode, bill_mode, sync_at)
      SELECT 0, 0, NULL WHERE NOT EXISTS (SELECT 1 FROM business_setups)`,
  ],
  down: ['DROP TABLE IF EXISTS business_setups'],
}
