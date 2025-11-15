import { Database } from 'better-sqlite3'
import { ipcMain } from 'electron'
import { CreateSalePayload, SalesService } from '../../services/sales.service'
import { IPC_CHANNELS } from '../channels'

export class SalesIpcHandler {
  private salesService: SalesService

  constructor(db: Database) {
    this.salesService = new SalesService(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Create a new sale
    ipcMain.handle(IPC_CHANNELS.SALES.CREATE, async (_, payload: CreateSalePayload) => {
      try {
        console.log('[SalesIpcHandler] Creating sale with', payload.sale_items.length, 'items')
        const result = this.salesService.createSale(payload)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error creating sale:', error)
        throw error
      }
    })

    // Get sale by ID with items
    ipcMain.handle(IPC_CHANNELS.SALES.GET, async (_, saleId: number) => {
      try {
        const result = this.salesService.getSaleWithItems(saleId)
        if (!result) {
          throw new Error(`Sale ${saleId} not found`)
        }
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error getting sale:', error)
        throw error
      }
    })

    // Get sales by customer phone
    ipcMain.handle(IPC_CHANNELS.SALES.GET_BY_CUSTOMER, async (_, phoneNumber: string) => {
      try {
        const result = this.salesService.getSalesByCustomerPhone(phoneNumber)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error getting customer sales:', error)
        throw error
      }
    })

    // Get sales by date range
    ipcMain.handle(
      IPC_CHANNELS.SALES.GET_BY_DATE_RANGE,
      async (_, { fromDate, toDate }: { fromDate: string; toDate: string }) => {
        try {
          const result = this.salesService.getSalesByDateRange(fromDate, toDate)
          return { success: true, data: result }
        } catch (error: any) {
          console.error('[SalesIpcHandler] Error getting sales by date:', error)
          throw error
        }
      }
    )

    // Get all sales (paginated)
    ipcMain.handle(IPC_CHANNELS.SALES.GET_ALL, async (_, { limit = 100, offset = 0 } = {}) => {
      try {
        const result = this.salesService.getAllSales(limit, offset)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error getting all sales:', error)
        throw error
      }
    })

    // Get unsynced sales
    ipcMain.handle(IPC_CHANNELS.SALES.GET_UNSYNCED, async () => {
      try {
        const result = this.salesService.getUnsyncedSales()
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error getting unsynced sales:', error)
        throw error
      }
    })

    // Get unsynced count
    ipcMain.handle(IPC_CHANNELS.SALES.GET_UNSYNCED_COUNT, async () => {
      try {
        const count = this.salesService.getUnsyncedCount()
        return { success: true, data: { count } }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error getting unsynced count:', error)
        throw error
      }
    })

    // Mark sale as synced
    ipcMain.handle(IPC_CHANNELS.SALES.MARK_SYNCED, async (_, saleId: number) => {
      try {
        const result = this.salesService.markSaleAsSynced(saleId)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error marking sale as synced:', error)
        throw error
      }
    })

    // Get sales statistics
    ipcMain.handle(IPC_CHANNELS.SALES.GET_STATS, async (_, { fromDate, toDate } = {}) => {
      try {
        const result = this.salesService.getSalesStats(fromDate, toDate)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error getting sales stats:', error)
        throw error
      }
    })

    // Delete sale
    ipcMain.handle(IPC_CHANNELS.SALES.DELETE, async (_, saleId: number) => {
      try {
        const result = this.salesService.deleteSale(saleId)
        return { success: true, data: { deleted: result } }
      } catch (error: any) {
        console.error('[SalesIpcHandler] Error deleting sale:', error)
        throw error
      }
    })

    // Create offline sale and broadcast
    ipcMain.handle(
      IPC_CHANNELS.SALES.CREATE_OFFLINE_SALE,
      async (
        _,
        {
          grandTotal,
          grandDiscountTotal,
          customerPhoneNumber,
          saleItems,
        }: {
          grandTotal: number
          grandDiscountTotal: number
          customerPhoneNumber: string
          saleItems: Array<{
            product_id: number
            max_retail_price: number
            sale_price: number
            quantity: number
          }>
        }
      ) => {
        try {
          const result = await this.salesService.createOfflineSaleAndBroadcast(
            grandTotal,
            grandDiscountTotal,
            customerPhoneNumber,
            saleItems
          )
          return result
        } catch (error: any) {
          console.error('[SalesIpcHandler] Error creating offline sale:', error)
          throw error
        }
      }
    )

    // Create direct offline sale (for non-registered customers)
    ipcMain.handle(
      IPC_CHANNELS.SALES.CREATE_DIRECT_OFFLINE,
      async (
        _,
        {
          grandTotal,
          grandDiscountTotal,
          customerPhoneNumber,
          saleItems,
          mediboy_customer_id,
        }: {
          grandTotal: number
          grandDiscountTotal: number
          customerPhoneNumber: string
          mediboy_customer_id?: number | null
          saleItems: Array<{
            product_id: number
            max_retail_price: number
            sale_price: number
            quantity: number
          }>
        }
      ) => {
        try {
          console.log('[SalesIpcHandler] Creating direct offline sale')
          const result = await this.salesService.createDirectOfflineSale(
            grandTotal,
            grandDiscountTotal,
            customerPhoneNumber,
            saleItems,
            mediboy_customer_id
          )
          return result
        } catch (error: any) {
          console.error('[SalesIpcHandler] Error creating direct offline sale:', error)
          throw error
        }
      }
    )
  }
}
