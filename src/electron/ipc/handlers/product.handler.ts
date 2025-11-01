import { Database } from 'better-sqlite3'
import { ipcMain } from 'electron'
import { ProductService } from '../../services/product.service'
import { ProductSearchParams } from '../../types/entities/product.types'
import { IPC_CHANNELS } from '../channels'

export class ProductIpcHandler {
  private productService: ProductService

  constructor(db: Database) {
    this.productService = new ProductService(db)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // search products
    ipcMain.handle(IPC_CHANNELS.PRODUCT.SEARCH, async (_, params: ProductSearchParams) => {
      try {
        return await this.productService.searchProducts(params)
      } catch (error: any) {
        console.error('Error searching products:', error)
        throw error
      }
    })

    // get product by id
    ipcMain.handle(IPC_CHANNELS.PRODUCT.GET_BY_ID, async (_, id: number) => {
      try {
        return await this.productService.getProductById(id)
      } catch (error: any) {
        console.error('Error getting product:', error)
        throw error
      }
    })

    // get all products
    ipcMain.handle(IPC_CHANNELS.PRODUCT.GET_ALL, async (_, page: number, limit: number) => {
      try {
        return await this.productService.getAllProducts(page, limit)
      } catch (error: any) {
        console.error('Error getting products:', error)
        throw error
      }
    })

    // create product
    ipcMain.handle(IPC_CHANNELS.PRODUCT.CREATE, async (_, data: any) => {
      try {
        return await this.productService.createProduct(data)
      } catch (error: any) {
        console.error('Error creating product:', error)
        throw error
      }
    })

    // update product
    ipcMain.handle(IPC_CHANNELS.PRODUCT.UPDATE, async (_, id: number, data: any) => {
      try {
        return await this.productService.updateProduct(id, data)
      } catch (error: any) {
        console.error('Error updating product:', error)
        throw error
      }
    })

    // delete product
    ipcMain.handle(IPC_CHANNELS.PRODUCT.DELETE, async (_, id: number) => {
      try {
        return await this.productService.deleteProduct(id)
      } catch (error: any) {
        console.error('Error deleting product:', error)
        throw error
      }
    })

    // update stock
    ipcMain.handle(
      IPC_CHANNELS.PRODUCT.UPDATE_STOCK,
      async (_, id: number, quantity: number, mode: 'add' | 'set') => {
        try {
          return await this.productService.updateStock(id, quantity, mode)
        } catch (error: any) {
          console.error('Error updating stock:', error)
          throw error
        }
      }
    )

    // get low stock products
    ipcMain.handle(IPC_CHANNELS.PRODUCT.GET_LOW_STOCK, async () => {
      try {
        return await this.productService.getLowStockProducts()
      } catch (error: any) {
        console.error('Error getting low stock products:', error)
        throw error
      }
    })

    // get product stats
    ipcMain.handle(IPC_CHANNELS.PRODUCT.GET_STATS, async () => {
      try {
        return await this.productService.getStats()
      } catch (error: any) {
        console.error('Error getting product stats:', error)
        throw error
      }
    })

    // import products from api
    ipcMain.handle(IPC_CHANNELS.PRODUCT.IMPORT, async (_, products: any[]) => {
      try {
        return await this.productService.importFromApi(products)
      } catch (error: any) {
        console.error('Error importing products:', error)
        throw error
      }
    })
  }
}
