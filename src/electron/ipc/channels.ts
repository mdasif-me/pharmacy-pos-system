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

  // socket channels
  SOCKET: {
    IS_CONNECTED: 'socket:isConnected',
    GET_ID: 'socket:getId',
    RECONNECT: 'socket:reconnect',
  },
} as const

export type IpcChannel = string
