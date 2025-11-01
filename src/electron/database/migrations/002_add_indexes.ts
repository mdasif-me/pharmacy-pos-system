/**
 * Add performance indexes
 * Migration: 002_add_indexes
 */

export const migration_002 = {
  version: 2,
  name: '002_add_indexes',

  up: [
    // Products indexes
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name)',
    'CREATE INDEX IF NOT EXISTS idx_products_generic ON products(generic_name)',
    'CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_stock ON products(in_stock)',
    'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
    'CREATE INDEX IF NOT EXISTS idx_products_dirty ON products(is_dirty)',
    'CREATE INDEX IF NOT EXISTS idx_products_sync ON products(last_synced_at)',

    // Companies indexes
    'CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)',

    // Categories indexes
    'CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)',

    // Sync queue indexes
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)',
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at)',

    // Auth tokens indexes
    'CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON auth_tokens(is_active)',

    // Full-Text Search (FTS5) for products
    `CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
      product_name,
      generic_name,
      content=products,
      content_rowid=id
    )`,

    // Triggers to keep FTS in sync
    `CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(rowid, product_name, generic_name)
      VALUES (new.id, new.product_name, new.generic_name);
    END`,

    `CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products BEGIN
      UPDATE products_fts
      SET product_name = new.product_name, generic_name = new.generic_name
      WHERE rowid = new.id;
    END`,

    `CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
      DELETE FROM products_fts WHERE rowid = old.id;
    END`,
  ],

  down: [
    'DROP TRIGGER IF EXISTS products_fts_delete',
    'DROP TRIGGER IF EXISTS products_fts_update',
    'DROP TRIGGER IF EXISTS products_fts_insert',
    'DROP TABLE IF EXISTS products_fts',
    'DROP INDEX IF EXISTS idx_auth_tokens_active',
    'DROP INDEX IF EXISTS idx_auth_tokens_user',
    'DROP INDEX IF EXISTS idx_sync_queue_created',
    'DROP INDEX IF EXISTS idx_sync_queue_entity',
    'DROP INDEX IF EXISTS idx_sync_queue_status',
    'DROP INDEX IF EXISTS idx_categories_name',
    'DROP INDEX IF EXISTS idx_companies_name',
    'DROP INDEX IF EXISTS idx_products_sync',
    'DROP INDEX IF EXISTS idx_products_dirty',
    'DROP INDEX IF EXISTS idx_products_status',
    'DROP INDEX IF EXISTS idx_products_stock',
    'DROP INDEX IF EXISTS idx_products_category',
    'DROP INDEX IF EXISTS idx_products_company',
    'DROP INDEX IF EXISTS idx_products_generic',
    'DROP INDEX IF EXISTS idx_products_name',
  ],
}
