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
    const result = await invoke('product:getAll', 1, 100)
    // Extract products array from the paginated response
    return result?.products || []
  },
  searchProducts: (searchTerm: string) => invoke('search:search', searchTerm),
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
  // TODO: Implement proper last sync timestamp storage
  getLastSync: () => Promise.resolve(null),
})
