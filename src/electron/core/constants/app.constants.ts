/**
 * Application-wide constants
 */

export const APP_CONSTANTS = {
  APP_NAME: 'Pharmacy POS',
  APP_VERSION: '2.0.0',

  // Search
  SEARCH: {
    MIN_CHARS: 2,
    DEBOUNCE_MS: 300,
    MAX_RESULTS: 100,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 500,
  },

  // Sync
  SYNC: {
    INTERVAL_MS: 300000, // 5 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 5000,
    CHUNK_SIZE: 1000,
  },

  // Stock
  STOCK: {
    LOW_STOCK_THRESHOLD: 10,
    OUT_OF_STOCK: 0,
  },
} as const

export const DATE_FORMATS = {
  DISPLAY: 'YYYY-MM-DD HH:mm:ss',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
} as const
