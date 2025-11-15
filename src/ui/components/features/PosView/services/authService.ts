/**
 * Auth Service
 * Handles authentication and token management
 */

import { AuthToken } from '../types'

export class AuthService {
  /**
   * Get current auth token
   */
  static async getAuthToken(): Promise<AuthToken | null> {
    console.log('[AuthService] Retrieving auth token...')

    try {
      const authTokenData = await window.electron.getAuthToken()
      if (!authTokenData || !authTokenData.token) {
        console.warn('[AuthService] No auth token found')
        return null
      }
      return authTokenData
    } catch (error: any) {
      console.error('[AuthService] Error getting auth token:', error)
      return null
    }
  }

  /**
   * Validate auth token exists
   */
  static isAuthenticated(authToken: AuthToken | null): boolean {
    return !!authToken?.token
  }
}
