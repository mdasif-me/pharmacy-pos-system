// search ipc handler - handle search-related ipc calls

import { Database } from 'better-sqlite3'
import { ipcMain } from 'electron'
import { SearchService } from '../../services/search.service'
import { ProductSearchParams } from '../../types/entities/product.types'
import { IPC_CHANNELS } from '../channels'

export class SearchIpcHandler {
  private searchService: SearchService

  constructor(db: Database) {
    this.searchService = new SearchService(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // search
    ipcMain.handle(
      IPC_CHANNELS.SEARCH.SEARCH,
      async (_, params: ProductSearchParams, options: any) => {
        try {
          return await this.searchService.search(params, options)
        } catch (error: any) {
          console.error('Error searching:', error)
          throw error
        }
      }
    )

    // autocomplete
    ipcMain.handle(IPC_CHANNELS.SEARCH.AUTOCOMPLETE, async (_, query: string, limit: number) => {
      try {
        return await this.searchService.autocomplete(query, limit)
      } catch (error: any) {
        console.error('Error autocomplete:', error)
        throw error
      }
    })

    // popular products
    ipcMain.handle(IPC_CHANNELS.SEARCH.POPULAR, async (_, limit: number) => {
      try {
        return await this.searchService.getPopularProducts(limit)
      } catch (error: any) {
        console.error('Error getting popular products:', error)
        throw error
      }
    })

    // recent searches
    ipcMain.handle(IPC_CHANNELS.SEARCH.RECENT, async (_, limit: number) => {
      try {
        return await this.searchService.getRecentSearches(limit)
      } catch (error: any) {
        console.error('Error getting recent searches:', error)
        throw error
      }
    })

    // rebuild index
    ipcMain.handle(IPC_CHANNELS.SEARCH.REBUILD_INDEX, async () => {
      try {
        this.searchService.rebuildIndex()
        return { success: true }
      } catch (error: any) {
        console.error('Error rebuilding index:', error)
        throw error
      }
    })
  }
}
