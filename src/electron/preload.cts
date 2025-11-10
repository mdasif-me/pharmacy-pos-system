const { contextBridge, ipcRenderer } = require('electron')

// Helper to invoke IPC calls
const invoke = (channel: string, ...args: any[]): Promise<any> =>
  ipcRenderer.invoke(channel, ...args)

// Expose electron API to renderer process
// Maps old UI methods to new IPC channels for backward compatibility
contextBridge.exposeInMainWorld('electron', {
  // Authentication - backward compatible with old UI
  login: (credentials: any) => invoke('auth:login', credentials),
  logout: () => invoke('auth:logout'),
  getAuthToken: () => invoke('auth:getCurrentUser'),
  isAuthenticated: () => invoke('auth:isAuthenticated'),

  // Products - backward compatible with old UI
  syncProducts: () => invoke('sync:pull'),
  getAllProducts: async () => {
    const result = await invoke('product:getAll', 1, 100000)
    // Extract products array from the paginated response
    return result?.products || []
  },
  searchProducts: (searchTerm: string) => invoke('search:search', { query: searchTerm, limit: 50 }),
  getProductsByCompany: (companyId: number) => invoke('product:search', { companyId }),
  getProductsByType: (type: string) => invoke('product:search', { type }),
  getProductsByCategory: (categoryId: number) => invoke('product:search', { categoryId }),
  getUniqueCompanies: () => invoke('product:getUniqueCompanies'),
  getUniqueTypes: () => invoke('product:getStats'),
  getUniqueCategories: () => invoke('product:getStats'),

  // Stock management - backward compatible with old UI
  updateProductStock: (productId: number, newStock: number) =>
    invoke('product:updateStock', productId, newStock),
  updateProductPrices: (productId: number, payload: any) =>
    invoke('product:update', productId, payload),

  // Add stock and broadcast to API
  addStock: (payload: any) => invoke('stock:addAndBroadcast', payload),

  // Stock Queue - Offline-first stock management
  stockQueue: {
    addOffline: (payload: any) => invoke('stock-queue:addOffline', payload),
    syncSingle: (stockId: number) => invoke('stock-queue:syncSingle', stockId),
    syncAll: () => invoke('stock-queue:syncAll'),
    getRecent: (limit?: number) => invoke('stock-queue:getRecent', limit),
    getUnsyncedCount: () => invoke('stock-queue:getUnsyncedCount'),
    getUnsyncedAndToday: () => invoke('stock-queue:getUnsyncedAndToday'),
  },

  // Sales Management
  sales: {
    create: (payload: any) => invoke('sales:create', payload),
    get: (saleId: number) => invoke('sales:get', saleId),
    getByCustomer: (phoneNumber: string) => invoke('sales:getByCustomer', phoneNumber),
    getByDateRange: (fromDate: string, toDate: string) =>
      invoke('sales:getByDateRange', { fromDate, toDate }),
    getAll: (limit?: number, offset?: number) =>
      invoke('sales:getAll', { limit: limit || 100, offset: offset || 0 }),
    getUnsynced: () => invoke('sales:getUnsynced'),
    getUnsyncedCount: () => invoke('sales:getUnsyncedCount'),
    markSynced: (saleId: number) => invoke('sales:markSynced', saleId),
    getStats: (fromDate?: string, toDate?: string) =>
      invoke('sales:getStats', { fromDate, toDate }),
    delete: (saleId: number) => invoke('sales:delete', saleId),
    syncAll: () => invoke('sales:syncAll'),
    syncSingle: (saleId: number) => invoke('sales:syncSingle', saleId),
    retryFailed: () => invoke('sales:retryFailed'),
  },

  // Batch Management
  batches: {
    getByProduct: (productId: number) => invoke('batches:getByProduct', productId),
    getAvailable: (productId: number) => invoke('batches:getAvailable', productId),
    getByStatus: (status: string) => invoke('batches:getByStatus', status),
    getExpiring: (expDate: string) => invoke('batches:getExpiring', expDate),
    getAll: (limit?: number, offset?: number) =>
      invoke('batches:getAll', { limit: limit || 100, offset: offset || 0 }),
    updateStatus: (batchId: number, status: string) =>
      invoke('batches:updateStatus', { batchId, status }),
  },

  // Sale Items
  saleItems: {
    getBySale: (saleId: number) => invoke('sale-items:getBySale', saleId),
    getBySaleWithProduct: (saleId: number) => invoke('sale-items:getBySaleWithProduct', saleId),
  },

  // Socket.IO connection status
  socket: {
    isConnected: () => invoke('socket:isConnected'),
    getId: () => invoke('socket:getId'),
    reconnect: () => invoke('socket:reconnect'),
  },

  // Business Setup - Sale mode, Bill mode, Price updates
  businessSetup: {
    get: () => invoke('business-setup:get'),
    updateSaleMode: (saleMode: number) => invoke('business-setup:updateSaleMode', saleMode),
    updateBillMode: (billMode: number) => invoke('business-setup:updateBillMode', billMode),
    updatePrice: (productId: number, discountPrice: number, peakHourPrice: number) =>
      invoke('business-setup:updatePrice', productId, discountPrice, peakHourPrice),
    getSaleMode: () => invoke('business-setup:getSaleMode'),
    getBillMode: () => invoke('business-setup:getBillMode'),
  },

  // Event listeners for real-time updates
  onStockUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('stock-updated', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('stock-updated')
  },
  onSaleModeUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('sale-mode-updated', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('sale-mode-updated')
  },
  onBillModeUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('bill-mode-updated', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('bill-mode-updated')
  },
  onPriceUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('price-updated', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('price-updated')
  },
})
