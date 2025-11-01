import { ipcMain } from 'electron'
import { AuthApiService, LoginRequest, RegisterRequest } from '../../services/api/auth.api.service'
import { HttpClient } from '../../services/api/http.client'
import { StorageService } from '../../services/storage.service'
import { IPC_CHANNELS } from '../channels'

export class AuthIpcHandler {
  private authService: AuthApiService
  private storage: StorageService

  constructor(apiBaseUrl: string) {
    this.storage = new StorageService()
    const httpClient = new HttpClient({
      baseURL: apiBaseUrl,
      storage: this.storage,
    })
    this.authService = new AuthApiService(httpClient, this.storage)
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // login
    ipcMain.handle(IPC_CHANNELS.AUTH.LOGIN, async (_, credentials: LoginRequest) => {
      try {
        return await this.authService.login(credentials)
      } catch (error: any) {
        console.error('Error logging in:', error)
        throw error
      }
    })

    // logout
    ipcMain.handle(IPC_CHANNELS.AUTH.LOGOUT, async () => {
      try {
        await this.authService.logout()
        return { success: true }
      } catch (error: any) {
        console.error('Error logging out:', error)
        throw error
      }
    })

    // register
    ipcMain.handle(IPC_CHANNELS.AUTH.REGISTER, async (_, data: RegisterRequest) => {
      try {
        return await this.authService.register(data)
      } catch (error: any) {
        console.error('Error registering:', error)
        throw error
      }
    })

    // get current user
    ipcMain.handle(IPC_CHANNELS.AUTH.GET_CURRENT_USER, async () => {
      try {
        return await this.authService.getCurrentUser()
      } catch (error: any) {
        console.error('Error getting current user:', error)
        throw error
      }
    })

    // is authenticated
    ipcMain.handle(IPC_CHANNELS.AUTH.IS_AUTHENTICATED, async () => {
      try {
        return this.authService.isAuthenticated()
      } catch (error: any) {
        console.error('Error checking authentication:', error)
        throw error
      }
    })
  }
}
