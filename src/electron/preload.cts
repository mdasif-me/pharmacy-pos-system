const electron = require('electron')

electron.contextBridge.exposeInMainWorld('electron', {
  // authentication methods
  login: (credentials) => ipcInvoke('login', credentials),
  logout: () => ipcInvoke('logout'),
  getAuthToken: () => ipcInvoke('getAuthToken'),

  // product methods
  syncProducts: () => ipcInvoke('syncProducts'),
  getAllProducts: () => ipcInvoke('getAllProducts'),
  searchProducts: (searchTerm) => ipcInvoke('searchProducts', searchTerm),
  getProductsByCompany: (companyId) => ipcInvoke('getProductsByCompany', companyId),
  getProductsByType: (type) => ipcInvoke('getProductsByType', type),
  getProductsByCategory: (categoryId) => ipcInvoke('getProductsByCategory', categoryId),
  getUniqueCompanies: () => ipcInvoke('getUniqueCompanies'),
  getUniqueTypes: () => ipcInvoke('getUniqueTypes'),
  getUniqueCategories: () => ipcInvoke('getUniqueCategories'),
  updateProductStock: (productId, newStock) => ipcInvoke('updateProductStock', productId, newStock),
  updateProductPrices: (productId, payload) => ipcInvoke('updateProductPrices', productId, payload),
  getLastSync: () => ipcInvoke('getLastSync'),
} satisfies Window['electron'])

function ipcInvoke<Key extends keyof EventPayloadMapping>(
  key: Key,
  ...args: any[]
): Promise<EventPayloadMapping[Key]> {
  return electron.ipcRenderer.invoke(key, ...args)
}
