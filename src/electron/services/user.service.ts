import { API_CONFIG } from '../core/config/api.config'
import { StorageService } from './storage.service'

export interface MediboyUser {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  phoneNumber_verified_at?: string | null
  division: string
  district: string
  upazilla: string
  bloodGroup: string
  donateBlood: string
  termsConditions: string
  status: string
  created_at: string
  updated_at: string
}

interface UserSearchResponse {
  success: boolean
  user?: MediboyUser
  message: string
  error?: string
}

/**
 * UserService - Direct API calls to Mediboy, no local user storage
 * Users are not managed in our desktop app database
 */
export class UserService {
  private storageService: StorageService

  constructor(storageService: StorageService) {
    this.storageService = storageService
    console.log('[UserService] Initialized - Direct API calls only')
  }

  /**
   * Search user by phone number directly from Mediboy API
   * Returns user object if found, or error if not
   */
  async searchByPhoneNumber(phoneNumber: string): Promise<UserSearchResponse> {
    console.log('[UserService] Searching user by phone:', phoneNumber)

    try {
      const token = this.storageService.getToken()
      if (!token) {
        return {
          success: false,
          message: 'Authentication required',
          error: 'No auth token found',
        }
      }

      const response = await fetch(`${API_CONFIG.baseURL}/pharmacy/find_user_by_phoneNumber`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mediboy_user_phoneNumber: phoneNumber }),
      })

      const data = await response.json()
      console.log('[UserService] API response:', data)

      // API returns: {"success":"User exist","user":{...}} or {"error":"User not exist"}
      if (data.success && data.user) {
        return {
          success: true,
          user: data.user as MediboyUser,
          message: data.success,
        }
      }

      // User not found
      return {
        success: false,
        message: data.error || 'User not found',
        error: data.error,
      }
    } catch (error: any) {
      console.error('[UserService] Error searching user:', error)
      return {
        success: false,
        message: `Error: ${error.message}`,
        error: error.message,
      }
    }
  }
}
