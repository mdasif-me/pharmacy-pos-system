import { ipcMain } from 'electron'
import { UserService } from '../../services/user.service'

/**
 * UserIpcHandler - IPC bridge for user operations
 * Only exposes searchByPhoneNumber since users are not stored locally
 */
export class UserIpcHandler {
  private userService: UserService

  constructor(userService: UserService) {
    this.userService = userService
    console.log('[UserIpcHandler] Initializing user IPC handlers...')
    this.registerHandlers()
    console.log('[UserIpcHandler] User IPC handlers registered successfully')
  }

  private registerHandlers(): void {
    // Search user by phone number (direct API call to Mediboy)
    ipcMain.handle('user:searchByPhoneNumber', async (_, phoneNumber: string) => {
      console.log('[UserIpcHandler] Searching user by phone:', phoneNumber)
      try {
        const result = await this.userService.searchByPhoneNumber(phoneNumber)
        return result
      } catch (error: any) {
        console.error('[UserIpcHandler] Error searching user:', error)
        return {
          success: false,
          message: error.message,
          error: error.message,
        }
      }
    })
  }
}
