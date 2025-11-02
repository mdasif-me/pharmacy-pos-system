import { Database } from 'better-sqlite3'
import { API_CONFIG } from '../core/config/api.config'
import { BusinessSetupRepository } from '../database/repositories/business-setup.repository'
import { ProductRepository } from '../database/repositories/product.repository'
import { StorageService } from './storage.service'

export class BusinessSetupService {
  private businessSetupRepo: BusinessSetupRepository
  private productRepo: ProductRepository
  private storageService: StorageService

  constructor(private db: Database) {
    this.businessSetupRepo = new BusinessSetupRepository(db)
    this.productRepo = new ProductRepository(db)
    this.storageService = new StorageService()
  }

  /**
   * Get current business setup
   */
  getSetup() {
    return this.businessSetupRepo.getSetup()
  }

  /**
   * Update sale mode and broadcast to all clients
   */
  async updateSaleMode(saleMode: number): Promise<void> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    // Format sync_at as YYYY-MM-DD HH:MM:SS
    const now = new Date()
    const syncAt = now.toISOString().slice(0, 19).replace('T', ' ')

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-sale-mode-update-broadcast`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sale_mode: saleMode,
        sync_at: syncAt,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed with status ${response.status}`)
    }

    // Update local database
    this.businessSetupRepo.updateSaleMode(saleMode, syncAt)
    console.log(`[BusinessSetupService] Sale mode updated to ${saleMode} at ${syncAt}`)
  }

  /**
   * Update bill mode and broadcast to all clients
   */
  async updateBillMode(billMode: number): Promise<void> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-bill-mode-update-broadcast`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bill_mode: billMode,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed with status ${response.status}`)
    }

    // Update local database
    this.businessSetupRepo.updateBillMode(billMode)
    console.log(`[BusinessSetupService] Bill mode updated to ${billMode}`)
  }

  /**
   * Update product prices (discount and peak-hour) and broadcast
   */
  async updateProductPrice(
    productId: number,
    discountPrice: number,
    peakHourPrice: number
  ): Promise<void> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    // Validate against mediboy_offer_price
    const product = this.productRepo.findById(productId)
    if (!product) {
      throw new Error('Product not found')
    }

    const mediboyOfferPrice = product.mediboy_offer_price || 0

    if (discountPrice >= mediboyOfferPrice && mediboyOfferPrice > 0) {
      throw new Error(
        `Discount price (${discountPrice}) cannot equal or exceed mediboy offer price (${mediboyOfferPrice})`
      )
    }

    if (peakHourPrice >= mediboyOfferPrice && mediboyOfferPrice > 0) {
      throw new Error(
        `Peak hour price (${peakHourPrice}) cannot equal or exceed mediboy offer price (${mediboyOfferPrice})`
      )
    }

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-update-price-and-broadcast`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        product_id: productId,
        discount_price: discountPrice,
        peak_hour_price: peakHourPrice,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed with status ${response.status}`)
    }

    // Update local database
    this.productRepo.update(productId, {
      discount_price: discountPrice,
      peak_hour_price: peakHourPrice,
    })

    console.log(
      `[BusinessSetupService] Product ${productId} prices updated - Discount: ${discountPrice}, Peak Hour: ${peakHourPrice}`
    )
  }

  /**
   * Get current sale mode
   */
  getSaleMode(): number {
    return this.businessSetupRepo.getSaleMode()
  }

  /**
   * Get current bill mode
   */
  getBillMode(): number {
    return this.businessSetupRepo.getBillMode()
  }
}
