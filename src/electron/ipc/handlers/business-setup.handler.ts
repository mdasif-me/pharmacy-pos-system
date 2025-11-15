import { Database } from 'better-sqlite3'
import { BrowserWindow, ipcMain } from 'electron'
import { BusinessSetupService } from '../../services/business-setup.service'
import { IPC_CHANNELS } from '../channels'

export class BusinessSetupIpcHandler {
  private businessSetupService: BusinessSetupService

  constructor(db: Database) {
    this.businessSetupService = new BusinessSetupService(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Get business setup
    ipcMain.handle(IPC_CHANNELS.BUSINESS_SETUP.GET, async () => {
      try {
        return this.businessSetupService.getSetup()
      } catch (error: any) {
        console.error('Error getting business setup:', error)
        throw error
      }
    })

    // Update sale mode
    ipcMain.handle(IPC_CHANNELS.BUSINESS_SETUP.UPDATE_SALE_MODE, async (_, saleMode: number) => {
      try {
        await this.businessSetupService.updateSaleMode(saleMode)

        // Notify all renderer windows
        this.notifySaleModeUpdate(saleMode)

        return { success: true }
      } catch (error: any) {
        console.error('Error updating sale mode:', error)
        throw error
      }
    })

    // Update bill mode
    ipcMain.handle(IPC_CHANNELS.BUSINESS_SETUP.UPDATE_BILL_MODE, async (_, billMode: number) => {
      try {
        await this.businessSetupService.updateBillMode(billMode)

        // Notify all renderer windows
        this.notifyBillModeUpdate(billMode)

        return { success: true }
      } catch (error: any) {
        console.error('Error updating bill mode:', error)
        throw error
      }
    })

    // Update product price
    ipcMain.handle(
      IPC_CHANNELS.BUSINESS_SETUP.UPDATE_PRICE,
      async (_, productId: number, discountPrice: number, peakHourPrice: number) => {
        try {
          await this.businessSetupService.updateProductPrice(
            productId,
            discountPrice,
            peakHourPrice
          )

          // Notify all renderer windows
          this.notifyPriceUpdate(productId, discountPrice, peakHourPrice)

          return { success: true }
        } catch (error: any) {
          console.error('Error updating product price:', error)
          throw error
        }
      }
    )

    // Get sale mode
    ipcMain.handle(IPC_CHANNELS.BUSINESS_SETUP.GET_SALE_MODE, async () => {
      try {
        return this.businessSetupService.getSaleMode()
      } catch (error: any) {
        console.error('Error getting sale mode:', error)
        throw error
      }
    })

    // Get bill mode
    ipcMain.handle(IPC_CHANNELS.BUSINESS_SETUP.GET_BILL_MODE, async () => {
      try {
        return this.businessSetupService.getBillMode()
      } catch (error: any) {
        console.error('Error getting bill mode:', error)
        throw error
      }
    })

    // Get sale price for a product based on sale mode
    ipcMain.handle(
      IPC_CHANNELS.BUSINESS_SETUP.GET_SALE_PRICE,
      async (_, productId: number, customSalePrice?: number) => {
        try {
          return this.businessSetupService.getSalePrice(productId, customSalePrice)
        } catch (error: any) {
          console.error('Error getting sale price:', error)
          throw error
        }
      }
    )
  }

  /**
   * Notify all windows about sale mode update
   */
  private notifySaleModeUpdate(saleMode: number): void {
    console.log(`[BusinessSetupHandler] Notifying sale mode update: ${saleMode}`)
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('sale-mode-updated', { saleMode })
    })
  }

  /**
   * Notify all windows about bill mode update
   */
  private notifyBillModeUpdate(billMode: number): void {
    console.log(`[BusinessSetupHandler] Notifying bill mode update: ${billMode}`)
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('bill-mode-updated', { billMode })
    })
  }

  /**
   * Notify all windows about price update
   */
  private notifyPriceUpdate(productId: number, discountPrice: number, peakHourPrice: number): void {
    console.log(`[BusinessSetupHandler] Notifying price update for product ${productId}`)
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('price-updated', {
        productId,
        discountPrice,
        peakHourPrice,
      })
    })
  }
}
