import { ipcMain } from 'electron'
import { OrderService } from '../../services/order.service'
import { IPC_CHANNELS } from '../channels'

export class OrderIpcHandler {
  private orderService: OrderService

  constructor() {
    this.orderService = new OrderService()
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Search order by number
    ipcMain.handle(IPC_CHANNELS.ORDERS.SEARCH_BY_NUMBER, async (_, orderNumber: string) => {
      try {
        console.log('[OrderIpcHandler] Searching for order:', orderNumber)
        const results = await this.orderService.searchOrderByNumber(orderNumber)
        return results
      } catch (error: any) {
        console.error('[OrderIpcHandler] Error searching order:', error)
        throw error
      }
    })

    // Get order details
    ipcMain.handle(IPC_CHANNELS.ORDERS.GET_DETAILS, async (_, orderId: number) => {
      try {
        console.log('[OrderIpcHandler] Getting order details for ID:', orderId)
        const details = await this.orderService.getOrderDetails(orderId)
        return details
      } catch (error: any) {
        console.error('[OrderIpcHandler] Error getting order details:', error)
        throw error
      }
    })

    // Create online sale by order
    ipcMain.handle(
      IPC_CHANNELS.ORDERS.CREATE_ONLINE_SALE,
      async (
        _,
        {
          orderId,
          pickupValue,
          saleItems,
        }: {
          orderId: number
          pickupValue: 'self_pick' | 'rider_pick'
          saleItems: Array<{
            product_id: number
            max_retail_price: number
            sale_price: number
            quantity: number
          }>
        }
      ) => {
        try {
          console.log('[OrderIpcHandler] Creating online sale by order:', orderId)
          const result = await this.orderService.createOnlineSaleByOrder(
            orderId,
            pickupValue,
            saleItems
          )
          return result
        } catch (error: any) {
          console.error('[OrderIpcHandler] Error creating online sale:', error)
          throw error
        }
      }
    )
  }
}
