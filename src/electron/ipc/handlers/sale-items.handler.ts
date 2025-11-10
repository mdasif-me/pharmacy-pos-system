import { Database } from 'better-sqlite3'
import { ipcMain } from 'electron'
import { SaleItemsRepository } from '../../database/repositories/sale-items.repository'
import { IPC_CHANNELS } from '../channels'

export class SaleItemsIpcHandler {
  private saleItemsRepo: SaleItemsRepository

  constructor(db: Database) {
    this.saleItemsRepo = new SaleItemsRepository(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Get sale items by sale ID
    ipcMain.handle(IPC_CHANNELS.SALE_ITEMS.GET_BY_SALE, async (_, saleId: number) => {
      try {
        const result = this.saleItemsRepo.getBySaleId(saleId)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SaleItemsIpcHandler] Error getting sale items:', error)
        throw error
      }
    })

    // Get sale items by sale ID with product details
    ipcMain.handle(IPC_CHANNELS.SALE_ITEMS.GET_BY_SALE_WITH_PRODUCT, async (_, saleId: number) => {
      try {
        const result = this.saleItemsRepo.getBySaleIdWithProduct(saleId)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[SaleItemsIpcHandler] Error getting sale items with product:', error)
        throw error
      }
    })
  }
}
