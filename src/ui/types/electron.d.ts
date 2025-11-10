/// <reference types="vite/client" />

declare global {
  interface Window {
    electron: {
      // Authentication
      login: (credentials: any) => Promise<any>
      logout: () => Promise<void>
      getAuthToken: () => Promise<any>
      isAuthenticated: () => Promise<boolean>

      // Products
      syncProducts: () => Promise<any>
      getAllProducts: () => Promise<any[]>
      searchProducts: (searchTerm: string) => Promise<any[]>
      getProductsByCompany: (companyId: number) => Promise<any[]>
      getProductsByType: (type: string) => Promise<any[]>
      getProductsByCategory: (categoryId: number) => Promise<any[]>
      getUniqueCompanies: () => Promise<any[]>
      getUniqueTypes: () => Promise<any>
      getUniqueCategories: () => Promise<any>

      // Stock management
      updateProductStock: (productId: number, newStock: number) => Promise<any>
      updateProductPrices: (productId: number, payload: any) => Promise<any>
      addStock: (payload: any) => Promise<any>

      // Stock Queue
      stockQueue: {
        addOffline: (payload: any) => Promise<any>
        syncSingle: (stockId: number) => Promise<any>
        syncAll: () => Promise<any>
        getRecent: (limit?: number) => Promise<any[]>
        getUnsyncedCount: () => Promise<number>
        getUnsyncedAndToday: () => Promise<any[]>
      }

      // Sales Management
      sales: {
        create: (payload: any) => Promise<any>
        get: (saleId: number) => Promise<any>
        getByCustomer: (phoneNumber: string) => Promise<any[]>
        getByDateRange: (fromDate: string, toDate: string) => Promise<any[]>
        getAll: (limit?: number, offset?: number) => Promise<any[]>
        getUnsynced: () => Promise<any[]>
        getUnsyncedCount: () => Promise<number>
        markSynced: (saleId: number) => Promise<void>
        getStats: (fromDate?: string, toDate?: string) => Promise<any>
        delete: (saleId: number) => Promise<void>
      }

      // Batch Management
      batches: {
        getByProduct: (productId: number) => Promise<any[]>
        getAvailable: (productId: number) => Promise<any[]>
        getByStatus: (status: string) => Promise<any[]>
        getExpiring: (expDate: string) => Promise<any[]>
        getAll: (limit?: number, offset?: number) => Promise<any[]>
        updateStatus: (batchId: number, status: string) => Promise<any>
      }

      // Sale Items
      saleItems: {
        getBySale: (saleId: number) => Promise<any[]>
        getBySaleWithProduct: (saleId: number) => Promise<any[]>
      }

      // Socket.IO connection status
      socket: {
        isConnected: () => Promise<boolean>
        getId: () => Promise<string>
        reconnect: () => Promise<void>
      }

      // Business Setup
      businessSetup: {
        get: () => Promise<any>
        updateSaleMode: (saleMode: number) => Promise<any>
        updateBillMode: (billMode: number) => Promise<any>
        updatePrice: (
          productId: number,
          discountPrice: number,
          peakHourPrice: number
        ) => Promise<any>
        getSaleMode: () => Promise<number>
        getBillMode: () => Promise<number>
      }

      // Event listeners
      onStockUpdated: (callback: (data: any) => void) => () => void
      onSaleModeUpdated: (callback: (data: any) => void) => () => void
      onBillModeUpdated: (callback: (data: any) => void) => () => void
      onPriceUpdated: (callback: (data: any) => void) => () => void
    }
  }
}

export {}
