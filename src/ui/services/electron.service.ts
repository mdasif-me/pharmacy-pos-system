// electron service - typed IPC wrapper for frontend

import {
  ProductCreateDTO,
  ProductEntity,
  ProductSearchParams,
  ProductUpdateDTO,
} from '../../electron/types/entities/product.types'
import { SyncStatus } from '../../electron/types/entities/sync.types'

// Type-safe window.electron interface
interface ElectronAPI {
  // Product operations
  products: {
    search: (params: ProductSearchParams) => Promise<ProductEntity[]>
    getById: (id: number) => Promise<ProductEntity | undefined>
    getAll: () => Promise<ProductEntity[]>
    create: (data: ProductCreateDTO) => Promise<ProductEntity>
    update: (id: number, data: ProductUpdateDTO) => Promise<ProductEntity | undefined>
    delete: (id: number) => Promise<boolean>
    updateStock: (id: number, quantity: number) => Promise<ProductEntity | undefined>
    getLowStock: (threshold?: number) => Promise<ProductEntity[]>
    getStats: () => Promise<ProductStats>
    import: (products: ProductCreateDTO[]) => Promise<ImportResult>
  }

  // Auth operations
  auth: {
    login: (credentials: LoginCredentials) => Promise<AuthResponse>
    logout: () => Promise<void>
    register: (data: RegisterData) => Promise<AuthResponse>
    getCurrentUser: () => Promise<AuthToken | null>
    isAuthenticated: () => Promise<boolean>
  }

  // Sync operations
  sync: {
    start: () => Promise<void>
    stop: () => Promise<void>
    getStatus: () => Promise<SyncStatus>
    push: () => Promise<SyncResult>
    pull: () => Promise<SyncResult>
    retryFailed: () => Promise<void>
    clearQueue: () => Promise<void>
  }

  // Search operations
  search: {
    search: (query: string, params?: ProductSearchParams) => Promise<ProductEntity[]>
    autocomplete: (query: string, limit?: number) => Promise<string[]>
    popular: (limit?: number) => Promise<ProductEntity[]>
    recent: (limit?: number) => Promise<ProductEntity[]>
    rebuildIndex: () => Promise<void>
  }
}

// Type definitions
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  pharmacyName: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: {
    id: number
    username: string
    email: string
  }
  message?: string
}

export interface AuthToken {
  token: string
  user: {
    id: number
    username: string
    email: string
  }
}

export interface ProductStats {
  total: number
  inStock: number
  lowStock: number
  outOfStock: number
  totalValue: number
}

export interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: string[]
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: string[]
}

// Electron service class
class ElectronService {
  private get api(): ElectronAPI {
    if (!window.electron) {
      throw new Error('Electron API not available')
    }
    return window.electron as unknown as ElectronAPI
  }

  // Product methods
  async searchProducts(params: ProductSearchParams): Promise<ProductEntity[]> {
    return this.api.products.search(params)
  }

  async getProductById(id: number): Promise<ProductEntity | undefined> {
    return this.api.products.getById(id)
  }

  async getAllProducts(): Promise<ProductEntity[]> {
    return this.api.products.getAll()
  }

  async createProduct(data: ProductCreateDTO): Promise<ProductEntity> {
    return this.api.products.create(data)
  }

  async updateProduct(id: number, data: ProductUpdateDTO): Promise<ProductEntity | undefined> {
    return this.api.products.update(id, data)
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.api.products.delete(id)
  }

  async updateStock(id: number, quantity: number): Promise<ProductEntity | undefined> {
    return this.api.products.updateStock(id, quantity)
  }

  async getLowStockProducts(threshold = 10): Promise<ProductEntity[]> {
    return this.api.products.getLowStock(threshold)
  }

  async getProductStats(): Promise<ProductStats> {
    return this.api.products.getStats()
  }

  async importProducts(products: ProductCreateDTO[]): Promise<ImportResult> {
    return this.api.products.import(products)
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.api.auth.login(credentials)
  }

  async logout(): Promise<void> {
    return this.api.auth.logout()
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    return this.api.auth.register(data)
  }

  async getCurrentUser(): Promise<AuthToken | null> {
    return this.api.auth.getCurrentUser()
  }

  async isAuthenticated(): Promise<boolean> {
    return this.api.auth.isAuthenticated()
  }

  // Sync methods
  async startSync(): Promise<void> {
    return this.api.sync.start()
  }

  async stopSync(): Promise<void> {
    return this.api.sync.stop()
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return this.api.sync.getStatus()
  }

  async pushToServer(): Promise<SyncResult> {
    return this.api.sync.push()
  }

  async pullFromServer(): Promise<SyncResult> {
    return this.api.sync.pull()
  }

  async retryFailedSync(): Promise<void> {
    return this.api.sync.retryFailed()
  }

  async clearSyncQueue(): Promise<void> {
    return this.api.sync.clearQueue()
  }

  // Search methods
  async search(query: string, params?: ProductSearchParams): Promise<ProductEntity[]> {
    return this.api.search.search(query, params)
  }

  async autocomplete(query: string, limit = 10): Promise<string[]> {
    return this.api.search.autocomplete(query, limit)
  }

  async getPopularProducts(limit = 10): Promise<ProductEntity[]> {
    return this.api.search.popular(limit)
  }

  async getRecentProducts(limit = 10): Promise<ProductEntity[]> {
    return this.api.search.recent(limit)
  }

  async rebuildSearchIndex(): Promise<void> {
    return this.api.search.rebuildIndex()
  }
}

// Export singleton instance
export const electronService = new ElectronService()
