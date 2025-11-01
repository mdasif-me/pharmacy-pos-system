import { ipcMain } from 'electron'
import { SocketService } from '../../services/socket.service'
import { IPC_CHANNELS } from '../channels'

export class SocketIpcHandler {
  private socketService: SocketService

  constructor(socketService: SocketService) {
    this.socketService = socketService
    console.log('[SocketIpcHandler] Initializing socket IPC handlers...')
    this.registerHandlers()
    console.log('[SocketIpcHandler] Socket IPC handlers registered successfully')
  }

  private registerHandlers(): void {
    // Check socket connection status
    ipcMain.handle(IPC_CHANNELS.SOCKET.IS_CONNECTED, async () => {
      try {
        const connected = this.socketService.isConnected()
        console.log('[SocketIpcHandler] IS_CONNECTED called, result:', connected)
        return connected
      } catch (error: any) {
        console.error('[SocketIpcHandler] Error checking socket connection:', error)
        return false
      }
    })

    // Get socket ID
    ipcMain.handle(IPC_CHANNELS.SOCKET.GET_ID, async () => {
      try {
        const id = this.socketService.getSocketId()
        console.log('[SocketIpcHandler] GET_ID called, result:', id)
        return id
      } catch (error: any) {
        console.error('[SocketIpcHandler] Error getting socket ID:', error)
        return null
      }
    })

    // Manually reconnect socket
    ipcMain.handle(IPC_CHANNELS.SOCKET.RECONNECT, async () => {
      try {
        console.log('[SocketIpcHandler] RECONNECT called')
        this.socketService.disconnect()
        this.socketService.connect()
        return { success: true }
      } catch (error: any) {
        console.error('[SocketIpcHandler] Error reconnecting socket:', error)
        return { success: false, error: error.message }
      }
    })

    console.log('[SocketIpcHandler] Registered handlers for channels:', {
      IS_CONNECTED: IPC_CHANNELS.SOCKET.IS_CONNECTED,
      GET_ID: IPC_CHANNELS.SOCKET.GET_ID,
      RECONNECT: IPC_CHANNELS.SOCKET.RECONNECT,
    })
  }
}
