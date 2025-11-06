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

    if (lastSyncDate) {
      params.last_sync_at = lastSyncDate
    }
    const response = await this.http.get<any>(`/pharmacy/get-real-time-stock-product`, { params })
    if (response && response.data && Array.isArray(response.data)) {
      return response.data
    }

    throw new Error('Failed to fetch products')
  }

  /**
   * fetch product by id
   * @param id - product id
   * @returns product data if found, otherwise throws an error
   * @throws {Error} if product not found
   */
  async fetchProductById(id: number): Promise<any> {
    const response = await this.http.get<ProductApiResponse>(`/products/${id}`)

    if (response.success && response.products.length > 0) {
      return response.products[0]
    }

    throw new Error(response.message || 'Product not found')
  }

  /**
   * Search products by name, description, or code
   * @param query - search query
   * @returns array of products if search successful, otherwise throws an error
   * @throws {Error} if search fails
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
   * Create a new product
   * @param product - product data to be created
   * @returns created product data if successful, otherwise throws an error
   * @throws {Error} if creation fails
   */
  async createProduct(product: Partial<ProductEntity>): Promise<any> {
    const response = await this.http.post<ProductApiResponse>('/products', product)

    if (response.success) {
      return response.products[0]
    }

    throw new Error(response.message || 'Failed to create product')
  }

  /**
   * Update an existing product
   * @param id - product id to update
   * @param product - product data to update
   * @returns updated product data if successful, otherwise throws an error
   * @throws {Error} if update fails
   */
  async updateProduct(id: number, product: Partial<ProductEntity>): Promise<any> {
    const response = await this.http.put<ProductApiResponse>(`/products/${id}`, product)

    if (response.success) {
      return response.products[0]
    }

    throw new Error(response.message || 'Failed to update product')
  }

  /**
   * Delete a product by its id
   * @param id - product id to delete
   * @returns true if deletion successful, otherwise false
   * @throws {Error} if deletion fails
   */
  async deleteProduct(id: number): Promise<boolean> {
    const response = await this.http.delete<ProductApiResponse>(`/products/${id}`)
    return response.success
  }

  /**
   * Update the stock of a product
   * @param id - product id to update stock of
   * @param quantity - new stock quantity
   * @returns updated product data if successful, otherwise throws an error
   * @throws {Error} if update stock fails
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
   * Batch sync products to the API
   * @param products - array of products to sync
   * @returns array of synced products if successful, otherwise throws an error
   * @throws {Error} if batch sync fails
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
