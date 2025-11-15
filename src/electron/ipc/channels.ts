export const IPC_CHANNELS = {
  // product channels
  PRODUCT: {
    SEARCH: 'product:search',
    GET_BY_ID: 'product:getById',
    GET_ALL: 'product:getAll',
    CREATE: 'product:create',
    UPDATE: 'product:update',
    DELETE: 'product:delete',
    UPDATE_STOCK: 'product:updateStock',
    GET_LOW_STOCK: 'product:getLowStock',
    GET_STATS: 'product:getStats',
    GET_UNIQUE_COMPANIES: 'product:getUniqueCompanies',
    IMPORT: 'product:import',
  },

  // auth channels
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    REGISTER: 'auth:register',
    GET_CURRENT_USER: 'auth:getCurrentUser',
    IS_AUTHENTICATED: 'auth:isAuthenticated',
  },

  // sync channels
  SYNC: {
    START: 'sync:start',
    STOP: 'sync:stop',
    GET_STATUS: 'sync:getStatus',
    PUSH: 'sync:push',
    PULL: 'sync:pull',
    RETRY_FAILED: 'sync:retryFailed',
    CLEAR_QUEUE: 'sync:clearQueue',
    GET_LAST_SYNC: 'sync:getLastSync',
  },

  // search channels
  SEARCH: {
    SEARCH: 'search:search',
    AUTOCOMPLETE: 'search:autocomplete',
    POPULAR: 'search:popular',
    RECENT: 'search:recent',
    REBUILD_INDEX: 'search:rebuildIndex',
  },

  // stock channels
  STOCK: {
    ADD_AND_BROADCAST: 'stock:addAndBroadcast',
  },

  // stock queue channels
  STOCK_QUEUE: {
    ADD_OFFLINE: 'stock-queue:addOffline',
    SYNC_SINGLE: 'stock-queue:syncSingle',
    SYNC_ALL: 'stock-queue:syncAll',
    GET_RECENT: 'stock-queue:getRecent',
    GET_UNSYNCED_COUNT: 'stock-queue:getUnsyncedCount',
    GET_UNSYNCED_AND_TODAY: 'stock-queue:getUnsyncedAndToday',
  },

  // sales channels
  SALES: {
    CREATE: 'sales:create',
    CREATE_OFFLINE_SALE: 'sales:createOfflineSale',
    CREATE_DIRECT_OFFLINE: 'sales:createDirectOffline',
    GET: 'sales:get',
    GET_BY_CUSTOMER: 'sales:getByCustomer',
    GET_BY_DATE_RANGE: 'sales:getByDateRange',
    GET_ALL: 'sales:getAll',
    GET_UNSYNCED: 'sales:getUnsynced',
    GET_UNSYNCED_COUNT: 'sales:getUnsyncedCount',
    MARK_SYNCED: 'sales:markSynced',
    GET_STATS: 'sales:getStats',
    DELETE: 'sales:delete',
    SYNC_ALL: 'sales:syncAll',
    SYNC_SINGLE: 'sales:syncSingle',
    RETRY_FAILED: 'sales:retryFailed',
  },

  // batch channels
  BATCHES: {
    GET_BY_PRODUCT: 'batches:getByProduct',
    GET_AVAILABLE: 'batches:getAvailable',
    GET_BY_STATUS: 'batches:getByStatus',
    GET_EXPIRING: 'batches:getExpiring',
    GET_ALL: 'batches:getAll',
    UPDATE_STATUS: 'batches:updateStatus',
  },

  // sale items channels
  SALE_ITEMS: {
    GET_BY_SALE: 'sale-items:getBySale',
    GET_BY_SALE_WITH_PRODUCT: 'sale-items:getBySaleWithProduct',
  },
  SOCKET: {
    IS_CONNECTED: 'socket:isConnected',
    GET_ID: 'socket:getId',
    RECONNECT: 'socket:reconnect',
  },

  // business setup channels
  BUSINESS_SETUP: {
    GET: 'business-setup:get',
    UPDATE_SALE_MODE: 'business-setup:updateSaleMode',
    UPDATE_BILL_MODE: 'business-setup:updateBillMode',
    UPDATE_PRICE: 'business-setup:updatePrice',
    GET_SALE_MODE: 'business-setup:getSaleMode',
    GET_BILL_MODE: 'business-setup:getBillMode',
    GET_SALE_PRICE: 'business-setup:getSalePrice',
  },

  // order channels
  ORDERS: {
    SEARCH_BY_NUMBER: 'orders:searchByNumber',
    GET_DETAILS: 'orders:getDetails',
    CREATE_ONLINE_SALE: 'orders:createOnlineSale',
  },

  // user channels
  USER: {
    SEARCH_BY_PHONE: 'user:searchByPhoneNumber',
    GET_BY_ID: 'user:getById',
    GET_ALL: 'user:getAll',
    SEARCH: 'user:search',
    CACHE_LOCALLY: 'user:cacheLocally',
  },
} as const

export type IpcChannel = string
