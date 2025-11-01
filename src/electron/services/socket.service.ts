import { io, Socket } from 'socket.io-client'
import { ProductRepository } from '../database/repositories/product.repository'
import { ProductEntity } from '../types/entities/product.types'

interface StockUpdateRecord {
  id: number
  pharmacy_id: number
  product_id: number
  in_stock: number
  stock_alert: number
  sale_price: number
  discount_price: number
  peak_hour_price: number
  mediboy_offer_price: number
  created_at: string
  updated_at: string
}

interface AddNewStockEvent {
  pharmacy_user_ids: number[]
  record: StockUpdateRecord
  sync_at: string
}

export class SocketService {
  private socket: Socket | null = null
  private productRepo: ProductRepository
  private readonly socketUrl = 'https://socket.dev-sajid.xyz'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(productRepo: ProductRepository) {
    this.productRepo = productRepo
  }

  /**
   * Connect to Socket.IO server
   */
  connect(userId?: number): void {
    if (this.socket?.connected) {
      console.log('[SocketService] Already connected')
      return
    }

    // Disconnect any existing socket first
    if (this.socket) {
      console.log('[SocketService] Cleaning up existing socket...')
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }

    console.log('[SocketService] Connecting to socket server:', this.socketUrl)

    this.socket = io(this.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000,
      autoConnect: true,
    })

    this.setupEventListeners()
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to server (ID:', this.socket?.id + ')')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error.message)
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[SocketService] Max reconnection attempts reached')
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[SocketService] Reconnected after', attemptNumber, 'attempts')
      this.reconnectAttempts = 0
    })

    // Business logic events
    this.socket.on('add_new_stock', (data: AddNewStockEvent) => {
      console.log('[SocketService] Received add_new_stock event:', data)
      this.handleStockUpdate(data)
    })

    // Listen for other potential events
    this.socket.on('update_stock', (data: AddNewStockEvent) => {
      console.log('[SocketService] Received update_stock event:', data)
      this.handleStockUpdate(data)
    })

    this.socket.on('delete_stock', (data: any) => {
      console.log('[SocketService] Received delete_stock event:', data)
      // Handle stock deletion if needed
    })
  }

  /**
   * Handle stock update from socket event
   */
  private handleStockUpdate(data: AddNewStockEvent): void {
    try {
      const { record } = data

      console.log('[SocketService] Processing stock update for product:', record.product_id)
      console.log('[SocketService] New stock data:', {
        in_stock: record.in_stock,
        sale_price: record.sale_price,
        discount_price: record.discount_price,
      })

      // Check if product exists in local database
      const existingProduct = this.productRepo.findById(record.product_id)

      if (!existingProduct) {
        console.warn(
          `[SocketService] Product ${record.product_id} not found in local database. Skipping update.`
        )
        console.warn('[SocketService] Product may not be synced yet. Consider running a full sync.')
        return
      }

      console.log('[SocketService] Found existing product:', {
        id: existingProduct.id,
        product_name: existingProduct.product_name,
        current_in_stock: existingProduct.in_stock,
      })

      // Update product stock and prices
      const updateData: Partial<ProductEntity> = {
        in_stock: record.in_stock,
        stock_alert: record.stock_alert,
        sale_price: record.sale_price,
        discount_price: record.discount_price,
        peak_hour_price: record.peak_hour_price,
        mediboy_offer_price: record.mediboy_offer_price,
        last_modified_at: record.updated_at,
        last_synced_at: new Date().toISOString(),
      }

      console.log('[SocketService] Updating product with data:', updateData)

      const updated = this.productRepo.update(record.product_id, updateData)

      if (updated) {
        console.log(
          `[SocketService] ✓ Successfully updated product ${record.product_id}:`,
          `${existingProduct.in_stock} → ${record.in_stock} stock`
        )

        // Notify UI about the update
        this.notifyStockUpdate(record.product_id, existingProduct.product_name, record.in_stock)
      } else {
        console.error(`[SocketService] ✗ Failed to update product ${record.product_id}`)
      }
    } catch (error) {
      console.error('[SocketService] Error handling stock update:', error)
      console.error('[SocketService] Error details:', error instanceof Error ? error.stack : error)
    }
  }

  /**
   * Notify UI about stock update via IPC or event emitter
   */
  private notifyStockUpdate(productId: number, productName: string, newStock: number): void {
    console.log(`[SocketService] Stock updated - Product: ${productName}, New Stock: ${newStock}`)

    // Send notification to all renderer windows
    const { BrowserWindow } = require('electron')
    const windows = BrowserWindow.getAllWindows()

    windows.forEach((window) => {
      window.webContents.send('stock-updated', {
        productId,
        productName,
        newStock,
        timestamp: new Date().toISOString(),
      })
    })
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[SocketService] Disconnecting from socket server')
      this.socket.disconnect()
      this.socket = null
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id
  }
}
