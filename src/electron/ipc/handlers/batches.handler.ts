import { Database } from 'better-sqlite3'
import { ipcMain } from 'electron'
import { BatchesRepository } from '../../database/repositories/batches.repository'
import { IPC_CHANNELS } from '../channels'

export class BatchesIpcHandler {
  private batchesRepo: BatchesRepository

  constructor(db: Database) {
    this.batchesRepo = new BatchesRepository(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Get batches by product
    ipcMain.handle(IPC_CHANNELS.BATCHES.GET_BY_PRODUCT, async (_, productId: number) => {
      try {
        const result = this.batchesRepo.getByProductId(productId)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[BatchesIpcHandler] Error getting batches by product:', error)
        throw error
      }
    })

    // Get available batches for a product
    ipcMain.handle(IPC_CHANNELS.BATCHES.GET_AVAILABLE, async (_, productId: number) => {
      try {
        const result = this.batchesRepo.getAvailableBatches(productId)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[BatchesIpcHandler] Error getting available batches:', error)
        throw error
      }
    })

    // Get batches by status
    ipcMain.handle(IPC_CHANNELS.BATCHES.GET_BY_STATUS, async (_, status: string) => {
      try {
        const result = this.batchesRepo.getByStatus(status)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[BatchesIpcHandler] Error getting batches by status:', error)
        throw error
      }
    })

    // Get expiring batches
    ipcMain.handle(IPC_CHANNELS.BATCHES.GET_EXPIRING, async (_, expDate: string) => {
      try {
        const result = this.batchesRepo.getExpiringBefore(expDate)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[BatchesIpcHandler] Error getting expiring batches:', error)
        throw error
      }
    })

    // Get all batches (paginated)
    ipcMain.handle(IPC_CHANNELS.BATCHES.GET_ALL, async (_, { limit = 100, offset = 0 } = {}) => {
      try {
        const result = this.batchesRepo.getAll(limit, offset)
        return { success: true, data: result }
      } catch (error: any) {
        console.error('[BatchesIpcHandler] Error getting all batches:', error)
        throw error
      }
    })

    // Update batch status
    ipcMain.handle(
      IPC_CHANNELS.BATCHES.UPDATE_STATUS,
      async (_, { batchId, status }: { batchId: number; status: string }) => {
        try {
          const result = this.batchesRepo.update(batchId, { status })
          if (!result) {
            throw new Error(`Batch ${batchId} not found`)
          }
          return { success: true, data: result }
        } catch (error: any) {
          console.error('[BatchesIpcHandler] Error updating batch status:', error)
          throw error
        }
      }
    )
  }
}
