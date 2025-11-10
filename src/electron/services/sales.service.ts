import { Database } from 'better-sqlite3'
import { BatchesRepository } from '../database/repositories/batches.repository'
import { SaleItemsRepository } from '../database/repositories/sale-items.repository'
import { SalesRepository } from '../database/repositories/sales.repository'
import { SaleItemEntity } from '../types/entities/sale-item.types'
import { SaleEntity } from '../types/entities/sale.types'

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

  constructor(private db: Database) {
    this.salesRepo = new SalesRepository(db)
    this.saleItemsRepo = new SaleItemsRepository(db)
    this.batchesRepo = new BatchesRepository(db)
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
}
