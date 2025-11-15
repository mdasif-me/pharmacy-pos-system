import { Database } from 'better-sqlite3'
import { API_CONFIG } from '../core/config/api.config'
import { BatchesRepository } from '../database/repositories/batches.repository'
import { SaleItemsRepository } from '../database/repositories/sale-items.repository'
import { SalesRepository } from '../database/repositories/sales.repository'
import { SaleItemEntity } from '../types/entities/sale-item.types'
import { SaleEntity } from '../types/entities/sale.types'
import { StorageService } from './storage.service'

export interface CreateSalePayload {
  customer_phone_number?: string
  sale_items: Array<{
    product_id: number
    qty: number
    mrp: number
    sale_price: number
  }>
  grand_total: number
  grand_discount_total: number
  mediboy_customer_id?: number
}

export interface SaleWithItems extends SaleEntity {
  items?: SaleItemEntity[]
}

export class SalesService {
  private salesRepo: SalesRepository
  private saleItemsRepo: SaleItemsRepository
  private batchesRepo: BatchesRepository
  private storageService: StorageService

  constructor(private db: Database) {
    this.salesRepo = new SalesRepository(db)
    this.saleItemsRepo = new SaleItemsRepository(db)
    this.batchesRepo = new BatchesRepository(db)
    this.storageService = new StorageService()
  }

  /**
   * Create a complete sale with items
   * Handles multi-batch sales by allocating from available batches
   */
  createSale(payload: CreateSalePayload): SaleWithItems {
    console.log('[SalesService] Creating sale with', payload.sale_items.length, 'items')

    const transaction = this.db.transaction(() => {
      // Create sale record
      const saleData: Omit<SaleEntity, 'id' | 'created_at' | 'updated_at'> = {
        customer_phone_number: payload.customer_phone_number,
        grand_total: payload.grand_total,
        grand_discount_total: payload.grand_discount_total,
        is_sync: 0, // Not synced initially
        mediboy_customer_id: payload.mediboy_customer_id,
        sale_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      }

      const sale = this.salesRepo.create(saleData)
      console.log('[SalesService] Sale created with ID:', sale.id)

      // Create sale items, handling multi-batch allocations
      const items: SaleItemEntity[] = []

      for (const saleItem of payload.sale_items) {
        const remainingQty = saleItem.qty
        const itemsCreated = this.allocateSaleItemsFromBatches(
          sale.id,
          saleItem.product_id,
          remainingQty,
          saleItem.mrp,
          saleItem.sale_price
        )

        items.push(...itemsCreated)
      }

      console.log('[SalesService] Created', items.length, 'sale items')

      return {
        ...sale,
        items,
      }
    })

    return transaction()
  }

  /**
   * Allocate sale items from available batches
   * Creates multiple sale_items records if product is sold from multiple batches
   */
  private allocateSaleItemsFromBatches(
    saleId: number,
    productId: number,
    totalQty: number,
    mrp: number,
    salePrice: number
  ): SaleItemEntity[] {
    console.log(
      `[SalesService] Allocating ${totalQty} qty of product ${productId} from available batches`
    )

    const items: SaleItemEntity[] = []
    const batches = this.batchesRepo.getAvailableBatches(productId)

    if (batches.length === 0) {
      console.warn('[SalesService] No available batches found for product:', productId)
      // Still create a sale item without batch reference (for future use)
      const item = this.saleItemsRepo.create({
        sales_id: saleId,
        product_stock_id: undefined,
        product_id: productId,
        mrp,
        sale_price: salePrice,
        qty: totalQty,
      })

      items.push(item)
      return items
    }

    let remainingQty = totalQty

    for (const batch of batches) {
      if (remainingQty <= 0) break

      const qtyFromBatch = Math.min(remainingQty, batch.available)

      if (qtyFromBatch > 0) {
        // Create sale item for this batch
        const item = this.saleItemsRepo.create({
          sales_id: saleId,
          product_stock_id: batch.id,
          product_id: productId,
          mrp,
          sale_price: salePrice,
          qty: qtyFromBatch,
        })

        items.push(item)

        // Reduce available quantity from batch
        this.batchesRepo.reduceAvailable(batch.id, qtyFromBatch)

        remainingQty -= qtyFromBatch

        console.log(
          `[SalesService] Allocated ${qtyFromBatch} from batch ${batch.batch_no}, remaining: ${remainingQty}`
        )
      }
    }

    // If there's still remaining qty, create an item without batch reference
    if (remainingQty > 0) {
      console.warn(
        `[SalesService] Not enough stock in batches, creating item for remaining qty: ${remainingQty}`
      )
      const item = this.saleItemsRepo.create({
        sales_id: saleId,
        product_stock_id: undefined,
        product_id: productId,
        mrp,
        sale_price: salePrice,
        qty: remainingQty,
      })

      items.push(item)
    }

    return items
  }

  /**
   * Get sale with its items
   */
  getSaleWithItems(saleId: number): SaleWithItems | undefined {
    const sale = this.salesRepo.findById(saleId)
    if (!sale) return undefined

    const items = this.saleItemsRepo.getBySaleId(saleId)

    return {
      ...sale,
      items,
    }
  }

  /**
   * Get unsynced sales
   */
  getUnsyncedSales(): SaleEntity[] {
    return this.salesRepo.getUnsynced()
  }

  /**
   * Mark sale as synced
   */
  markSaleAsSynced(saleId: number): SaleEntity | undefined {
    return this.salesRepo.markAsSynced(saleId)
  }

  /**
   * Mark sale sync as failed
   */
  markSaleSyncFailed(saleId: number, error: string): SaleEntity | undefined {
    return this.salesRepo.markSyncFailed(saleId, error)
  }

  /**
   * Get sales by customer phone
   */
  getSalesByCustomerPhone(phoneNumber: string): SaleEntity[] {
    return this.salesRepo.getByCustomerPhone(phoneNumber)
  }

  /**
   * Get sales by date range
   */
  getSalesByDateRange(fromDate: string, toDate: string): SaleEntity[] {
    return this.salesRepo.getSalesByDateRange(fromDate, toDate)
  }

  /**
   * Get sales statistics
   */
  getSalesStats(fromDate?: string, toDate?: string) {
    return this.salesRepo.getSalesStats(fromDate, toDate)
  }

  /**
   * Delete a sale and its items
   */
  deleteSale(saleId: number): boolean {
    const transaction = this.db.transaction(() => {
      // Delete all sale items first (cascade handled by DB, but explicit here for clarity)
      const items = this.saleItemsRepo.getBySaleId(saleId)
      for (const item of items) {
        this.saleItemsRepo.delete(item.id)
      }

      // Delete the sale
      return this.salesRepo.delete(saleId)
    })

    return transaction()
  }

  /**
   * Get all sales (paginated)
   */
  getAllSales(limit = 100, offset = 0): SaleEntity[] {
    return this.salesRepo.getAll(limit, offset)
  }

  /**
   * Get unsynced count
   */
  getUnsyncedCount(): number {
    const unsynced = this.getUnsyncedSales()
    return unsynced.length
  }

  /**
   * Helper: Create payload for sale API
   */
  private createSalePayload(
    grandTotal: number,
    grandDiscountTotal: number,
    customerPhoneNumber: string,
    saleItems: Array<{
      product_id: number
      max_retail_price: number
      sale_price: number
      quantity: number
    }>,
    mediboy_customer_id?: number | null
  ) {
    const payload: any = {
      grand_total: grandTotal,
      customer_phoneNumber: customerPhoneNumber,
      grand_discount_total: grandDiscountTotal,
      saleItems: saleItems.map((item) => ({
        product_id: item.product_id,
        max_retail_price: item.max_retail_price,
        sale_price: item.sale_price,
        quantity: item.quantity,
      })),
    }

    // Include mediboy_customer_id if provided
    if (mediboy_customer_id) {
      payload.mediboy_user_id = mediboy_customer_id
    }

    return payload
  }

  /**
   * Helper: Create local sale record in database
   */
  private createLocalSaleRecord(
    customerPhoneNumber: string,
    grandTotal: number,
    grandDiscountTotal: number,
    saleItems: Array<{
      product_id: number
      max_retail_price: number
      sale_price: number
      quantity: number
    }>,
    isSynced: 0 | 1 = 0
  ): number {
    const transaction = this.db.transaction(() => {
      const saleData: Omit<SaleEntity, 'id' | 'created_at' | 'updated_at'> = {
        customer_phone_number: customerPhoneNumber,
        grand_total: grandTotal,
        grand_discount_total: grandDiscountTotal,
        is_sync: isSynced,
        sale_date: new Date().toISOString().split('T')[0],
        ...(isSynced === 1 && { synced_at: new Date().toISOString() }),
      }

      const sale = this.salesRepo.create(saleData)

      // Create sale items
      for (const saleItem of saleItems) {
        if (saleItem.quantity > 0) {
          this.allocateSaleItemsFromBatches(
            sale.id,
            saleItem.product_id,
            saleItem.quantity,
            saleItem.max_retail_price,
            saleItem.sale_price
          )
        }
      }

      return sale.id
    })

    return transaction()
  }

  /**
   * Create offline sale and broadcast to server
   * Used for direct sales to non-registered customers
   */
  async createOfflineSaleAndBroadcast(
    grandTotal: number,
    grandDiscountTotal: number,
    customerPhoneNumber: string,
    saleItems: Array<{
      product_id: number
      max_retail_price: number
      sale_price: number
      quantity: number
    }>
  ): Promise<{ success: boolean; saleId?: number; message: string }> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const payload = this.createSalePayload(
      grandTotal,
      grandDiscountTotal,
      customerPhoneNumber,
      saleItems
    )
    console.log('[SalesService] Broadcasting offline sale to server:', payload)

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-offline-sale-and-broadcast`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SalesService] Broadcast failed:', errorText)

        // Still create local sale even if broadcast fails
        const saleId = this.createLocalSaleRecord(
          customerPhoneNumber,
          grandTotal,
          grandDiscountTotal,
          saleItems,
          0
        )

        return {
          success: false,
          saleId,
          message: 'Sale saved locally but failed to broadcast. Will retry on next sync.',
        }
      }

      // Create local sale record with synced status
      const saleId = this.createLocalSaleRecord(
        customerPhoneNumber,
        grandTotal,
        grandDiscountTotal,
        saleItems,
        1
      )

      console.log('[SalesService] Sale created and broadcasted successfully. Sale ID:', saleId)

      return {
        success: true,
        saleId,
        message: 'Sale completed and sent to server',
      }
    } catch (error: any) {
      console.error('[SalesService] Error broadcasting sale:', error)

      // Create local sale even if network error
      const saleId = this.createLocalSaleRecord(
        customerPhoneNumber,
        grandTotal,
        grandDiscountTotal,
        saleItems,
        0
      )

      throw new Error(
        `Failed to broadcast sale (saved locally). ${error.message}. Sale ID: ${saleId}`
      )
    }
  }

  /**
   * Create direct offline sale and broadcast to API
   * For direct sales to non-registered customers (no local save, API only)
   */
  async createDirectOfflineSale(
    grandTotal: number,
    grandDiscountTotal: number,
    customerPhoneNumber: string,
    saleItems: Array<{
      product_id: number
      max_retail_price: number
      sale_price: number
      quantity: number
    }>,
    mediboy_customer_id?: number | null
  ): Promise<{ success: boolean; saleId?: string; message: string }> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-offline-sale-and-broadcast`
    const payload = this.createSalePayload(
      grandTotal,
      grandDiscountTotal,
      customerPhoneNumber,
      saleItems,
      mediboy_customer_id
    )

    console.log('[SalesService] Broadcasting direct offline sale to server:', payload)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SalesService] Direct broadcast failed:', errorText)
        throw new Error(`Failed to broadcast sale: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[SalesService] Direct sale broadcasted successfully:', data)

      return {
        success: true,
        saleId: data.id || data.sale_id,
        message: 'Sale created and broadcasted successfully',
      }
    } catch (error: any) {
      console.error('[SalesService] Error broadcasting direct sale:', error)
      throw error
    }
  }
}
