import { ProductEntity } from '../../types/entities/product.types'
import { HttpClient } from './http.client'

export interface ProductApiResponse {
  success: boolean
  message: string
  products: any[]
  total?: number
}

export class ProductApiService {
  constructor(private http: HttpClient) {}

  /**
   * fetch all products from api
   * @param page - page number
   * @param limit - items per page
   * @param lastSyncDate - optional date to filter products updated after this date (format: YYYY-MM-DD HH:MM:SS)
   */
  async fetchAllProducts(page = 1, limit = 100, lastSyncDate?: string): Promise<any[]> {
    const params: any = {}

    // If lastSyncDate is provided, add it as a query parameter
    if (lastSyncDate) {
      params.last_sync_at = lastSyncDate
      console.log('[ProductApiService] Fetching products updated after:', lastSyncDate)
    }

    const response = await this.http.get<any>(`/pharmacy/get-real-time-stock-product`, { params })

    if (response && response.data && Array.isArray(response.data)) {
      console.log(
        `[ProductApiService] Fetched ${response.data.length} products${
          lastSyncDate ? ' (incremental sync)' : ' (full sync)'
        }`
      )
      return response.data
    }

    throw new Error('Failed to fetch products')
  }

  /**
   * fetch product by id
   */
  async fetchProductById(id: number): Promise<any> {
    const response = await this.http.get<ProductApiResponse>(`/products/${id}`)

    if (response.success && response.products.length > 0) {
      return response.products[0]
    }

    throw new Error(response.message || 'Product not found')
  }

  /**
   * search products
   */
  async searchProducts(query: string): Promise<any[]> {
    const response = await this.http.get<ProductApiResponse>(`/products/search`, {
      params: { query },
    })

    if (response.success) {
      return response.products
    }

    throw new Error(response.message || 'Search failed')
  }

  /**
   * create product
   */
  async createProduct(product: Partial<ProductEntity>): Promise<any> {
    const response = await this.http.post<ProductApiResponse>('/products', product)

    if (response.success) {
      return response.products[0]
    }

    throw new Error(response.message || 'Failed to create product')
  }

  /**
   * update product
   */
  async updateProduct(id: number, product: Partial<ProductEntity>): Promise<any> {
    const response = await this.http.put<ProductApiResponse>(`/products/${id}`, product)

    if (response.success) {
      return response.products[0]
    }

    throw new Error(response.message || 'Failed to update product')
  }

  /**
   * delete product
   */
  async deleteProduct(id: number): Promise<boolean> {
    const response = await this.http.delete<ProductApiResponse>(`/products/${id}`)
    return response.success
  }

  /**
   * update stock
   */
  async updateStock(id: number, quantity: number): Promise<any> {
    const response = await this.http.patch<ProductApiResponse>(`/products/${id}/stock`, {
      quantity,
    })

    if (response.success) {
      return response.products[0]
    }

    throw new Error(response.message || 'Failed to update stock')
  }

  /**
   * batch sync products
   */
  async batchSync(products: ProductEntity[]): Promise<any[]> {
    const response = await this.http.post<ProductApiResponse>('/products/batch-sync', {
      products,
    })

    if (response.success) {
      return response.products
    }

    throw new Error(response.message || 'Batch sync failed')
  }
}
