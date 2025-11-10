import axios, { AxiosInstance } from 'axios'
import { API_CONFIG } from '../core/config/api.config'
import { StorageService } from './storage.service'

export interface AddStockBroadcastPayload {
  product_id: number
  stock_mrp: number
  purchase_price: number
  discount_price: number
  peak_hour_price: number
  offer_price: number
  perc_off: number
  batch_no: string
  expire_date: string // YYYY/MM/DD format
  qty: number
  stock_alert?: number
  shelf?: string | null
}

export class AddStockBroadcastService {
  private axiosInstance: AxiosInstance
  private storageService: StorageService
  private readonly addStockEndpoint = 'pharmacy/real-time-add-stock-and-broadcast'

  constructor() {
    this.storageService = new StorageService()
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
    })
  }

  /**
   * Broadcast stock addition to API
   */
  async broadcastAddStock(payload: AddStockBroadcastPayload): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      console.log('[AddStockBroadcastService] Broadcasting stock to API:', {
        endpoint: this.addStockEndpoint,
        product_id: payload.product_id,
      })

      // Get auth token from storage
      const token = this.storageService.getToken()
      if (!token) {
        throw new Error('No auth token found. User must be authenticated.')
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }

      // Make the request
      const response = await this.axiosInstance.post(this.addStockEndpoint, payload, { headers })

      console.log('[AddStockBroadcastService] Successfully broadcasted stock:', {
        product_id: payload.product_id,
        response: response.data,
      })

      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      console.error('[AddStockBroadcastService] Failed to broadcast stock:', {
        product_id: payload.product_id,
        error: errorMessage,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Format expire date from YYYY-MM-DD to YYYY/MM/DD
   */
  formatExpireDate(expireDate: string): string {
    // If already in YYYY/MM/DD format, return as is
    if (expireDate.includes('/')) {
      return expireDate
    }

    // Convert from YYYY-MM-DD to YYYY/MM/DD
    const parts = expireDate.split('-')
    if (parts.length === 3) {
      return parts.join('/')
    }

    return expireDate
  }

  /**
   * Prepare payload in correct format for API
   */
  preparePayload(data: any): AddStockBroadcastPayload {
    return {
      product_id: data.product_id,
      stock_mrp: data.stock_mrp,
      purchase_price: data.purchase_price,
      discount_price: data.discount_price,
      peak_hour_price: data.peak_hour_price,
      offer_price: data.offer_price,
      perc_off: data.perc_off,
      batch_no: data.batch_no,
      expire_date: this.formatExpireDate(data.expire_date),
      qty: data.qty,
      stock_alert: data.stock_alert,
      shelf: data.shelf || null,
    }
  }
}
