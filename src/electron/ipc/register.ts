import { Database } from 'better-sqlite3'
import { AuthIpcHandler } from './handlers/auth.handler'
import { BatchesIpcHandler } from './handlers/batches.handler'
import { BusinessSetupIpcHandler } from './handlers/business-setup.handler'
import { OrderIpcHandler } from './handlers/order.handler'
import { ProductIpcHandler } from './handlers/product.handler'
import { SaleItemsIpcHandler } from './handlers/sale-items.handler'
import { SalesSyncIpcHandler } from './handlers/sales-sync.handler'
import { SalesIpcHandler } from './handlers/sales.handler'
import { SearchIpcHandler } from './handlers/search.handler'
import { StockQueueIpcHandler } from './handlers/stock-queue.handler'
import { SyncIpcHandler } from './handlers/sync.handler'

export function registerIpcHandlers(db: Database, apiBaseUrl: string): void {
  // register all handlers
  new ProductIpcHandler(db)
  new SyncIpcHandler(db)
  new SearchIpcHandler(db)
  new AuthIpcHandler(apiBaseUrl)
  new StockQueueIpcHandler(db)
  new SalesIpcHandler(db)
  new SalesSyncIpcHandler(db)
  new BatchesIpcHandler(db)
  new SaleItemsIpcHandler(db)
  new BusinessSetupIpcHandler(db)
  new OrderIpcHandler()

  console.log('✓ All IPC handlers registered')
}
