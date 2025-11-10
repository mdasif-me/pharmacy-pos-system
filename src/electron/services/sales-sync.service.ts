import axios, { AxiosInstance } from 'axios'
import { Database } from 'better-sqlite3'
import { API_CONFIG } from '../core/config/api.config'
import { SaleItemsRepository } from '../database/repositories/sale-items.repository'
import { SalesService } from './sales.service'
import { StorageService } from './storage.service'

export interface SalesSyncPayload {
  grand_total: number
  grand_discount_total: number
  customer_phone_number?: string
  sale_date: string
  saleItems: Array<{
    product_id: number
    qty: number
    mrp: number
    sale_price: number
    batch_number?: string
  }>
}

export interface SalesSyncResult {
  success: number
  failed: number
  total: number
  errors: Array<{ id: number; error: string }>
}

export class SalesSyncService {
  private axiosInstance: AxiosInstance
  private storageService: StorageService
  private salesService: SalesService
  private saleItemsRepo: SaleItemsRepository
  private readonly syncEndpoint = 'pharmacy/sales'

  constructor(private db: Database) {
    this.storageService = new StorageService()
    this.salesService = new SalesService(db)
    this.saleItemsRepo = new SaleItemsRepository(db)
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
    })
  }

  /**
   * Sync all unsynced sales to API
   */
  async syncAllSales(): Promise<SalesSyncResult> {
    const result: SalesSyncResult = {
      success: 0,
      failed: 0,
      total: 0,
      errors: [],
    }

    try {
      // Get all unsynced sales
      const unsyncedSales = this.salesService.getUnsyncedSales()
      result.total = unsyncedSales.length

      console.log(`[SalesSyncService] Found ${unsyncedSales.length} unsynced sales`)

      for (const sale of unsyncedSales) {
        try {
          await this.syncSingleSale(sale.id)
          result.success++
        } catch (error: any) {
          console.error(`[SalesSyncService] Failed to sync sale ${sale.id}:`, error.message)
          result.failed++
          result.errors.push({
            id: sale.id,
            error: error.message || 'Unknown error',
          })
          // Mark as failed so we can retry later
          this.salesService.markSaleSyncFailed(sale.id, error.message)
        }
      }

      return result
    } catch (error: any) {
      console.error('[SalesSyncService] Error in syncAllSales:', error)
      throw error
    }
  }

  /**
   * Sync a single sale to API
   */
  async syncSingleSale(saleId: number): Promise<void> {
    try {
      // Get sale with items
      const saleWithItems = this.salesService.getSaleWithItems(saleId)
      if (!saleWithItems) {
        throw new Error(`Sale ${saleId} not found`)
      }

      // Get sale items with product details
      const saleItems = this.saleItemsRepo.getBySaleIdWithProduct(saleId)

      // Format payload
      const payload: SalesSyncPayload = {
        grand_total: saleWithItems.grand_total,
        grand_discount_total: saleWithItems.grand_discount_total,
        customer_phone_number: saleWithItems.customer_phone_number,
        sale_date: saleWithItems.sale_date,
        saleItems: saleItems.map((item: any) => ({
          product_id: item.product_id,
          qty: item.qty,
          mrp: item.mrp,
          sale_price: item.sale_price,
          batch_number: item.batch_number || undefined,
        })),
      }

      console.log(
        `[SalesSyncService] Syncing sale ${saleId} with ${payload.saleItems.length} items`
      )

      // Get auth token
      const token = this.storageService.getToken()
      if (!token) {
        throw new Error('No auth token found. User must be authenticated.')
      }

      // Make the request
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }

      const response = await this.axiosInstance.post(this.syncEndpoint, payload, { headers })

      console.log(`[SalesSyncService] Successfully synced sale ${saleId}:`, response.data)

      // Mark as synced
      this.salesService.markSaleAsSynced(saleId)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      console.error(`[SalesSyncService] Failed to sync sale ${saleId}:`, errorMessage)

      // Throw with detailed error for error handling
      const err = new Error(errorMessage)
      ;(err as any).details = error.response?.data?.errors || {}
      throw err
    }
  }

  /**
   * Retry failed sales
   */
  async retryFailedSales(): Promise<SalesSyncResult> {
    // Since we don't have a specific "failed" status, we treat unsynced as potential retries
    return this.syncAllSales()
  }

  /**
   * Format sale items for display
   */
  private formatSaleItems(items: any[]): string {
    return items.map((item) => `${item.product_id}:${item.qty}`).join(', ')
  }
}
