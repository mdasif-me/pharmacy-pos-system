/**
 * Database configuration and constants
 */

export const DATABASE_CONFIG = {
  NAME: 'pharmacy-pos.db',
  VERSION: 1,

  // Connection pool settings
  CONNECTION_POOL: {
    MIN: 1,
    MAX: 10,
    IDLE_TIMEOUT: 30000, // 30 seconds
  },

  // Query timeouts
  TIMEOUT: {
    DEFAULT: 5000, // 5 seconds
    LONG_RUNNING: 30000, // 30 seconds
  },

  // Batch operation limits
  BATCH_SIZE: {
    INSERT: 500,
    UPDATE: 500,
    DELETE: 500,
  },

  // Cache settings
  CACHE: {
    TTL: 300000, // 5 minutes
    MAX_SIZE: 1000, // items
  },
} as const

export const TABLE_NAMES = {
  PRODUCTS: 'products',
  PRODUCTS_FTS: 'products_fts',
  COMPANIES: 'companies',
  CATEGORIES: 'categories',
  AUTH_TOKENS: 'auth_tokens',
  SYNC_QUEUE: 'sync_queue',
  SYNC_METADATA: 'sync_metadata',
} as const

// alias for backward compatibility
export const DB_TABLES = TABLE_NAMES

export const INDEX_NAMES = {
  PRODUCTS_SEARCH: 'idx_products_search',
  PRODUCTS_COMPANY: 'idx_products_company',
  PRODUCTS_CATEGORY: 'idx_products_category',
  PRODUCTS_STOCK: 'idx_products_stock',
  PRODUCTS_DIRTY: 'idx_products_dirty',
  PRODUCTS_SYNC: 'idx_products_sync',
  COMPANIES_NAME: 'idx_companies_name',
  CATEGORIES_NAME: 'idx_categories_name',
  SYNC_QUEUE_STATUS: 'idx_sync_queue_status',
  SYNC_QUEUE_ENTITY: 'idx_sync_queue_entity',
} as const
