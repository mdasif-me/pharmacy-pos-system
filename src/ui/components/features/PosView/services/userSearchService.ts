/**
 * User Search Service
 * Handles user search and validation
 */

import { UserSearchResponse } from '../types'

export class UserSearchService {
  /**
   * Search user by phone number
   * Calls: window.electron.users.searchByPhoneNumber
   */
  static async searchByPhoneNumber(phoneNumber: string): Promise<UserSearchResponse> {
    console.log('[UserSearchService] Searching user by phone:', phoneNumber)

    try {
      const result = await window.electron.users.searchByPhoneNumber(phoneNumber)
      return result
    } catch (error: any) {
      console.error('[UserSearchService] Error searching user:', error)
      return {
        success: false,
        message: error.message || 'Failed to search user',
        error: error.message,
      }
    }
  }
}
