// ipc register - register all ipc handlers

import { Database } from 'better-sqlite3'
import { AuthIpcHandler } from './handlers/auth.handler'
import { ProductIpcHandler } from './handlers/product.handler'
import { SearchIpcHandler } from './handlers/search.handler'
import { SyncIpcHandler } from './handlers/sync.handler'

export function registerIpcHandlers(db: Database, apiBaseUrl: string): void {
  // register all handlers
  new ProductIpcHandler(db)
  new SyncIpcHandler(db)
  new SearchIpcHandler(db)
  new AuthIpcHandler(apiBaseUrl)

  console.log('✓ All IPC handlers registered')
}
