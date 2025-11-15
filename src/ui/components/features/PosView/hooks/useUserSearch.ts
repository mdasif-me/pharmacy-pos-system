/**
 * useUserSearch Hook
 * Manages user search state and operations
 */

import { useState } from 'react'
import { UserSearchService } from '../services'
import { MediboyUser } from '../types'

export const useUserSearch = () => {
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  const [foundUser, setFoundUser] = useState<MediboyUser | null>(null)
  const [userNotFound, setUserNotFound] = useState(false)

  const searchUser = async (phoneNumber: string) => {
    if (!phoneNumber.trim()) {
      return false
    }

    setIsSearchingUser(true)
    setUserNotFound(false)
    setFoundUser(null)

    try {
      const result = await UserSearchService.searchByPhoneNumber(phoneNumber)

      if (result.success && result.user) {
        setFoundUser(result.user)
        setUserSearchTerm('')
        return true
      } else {
        setUserNotFound(true)
        return false
      }
    } catch (error) {
      console.error('[useUserSearch] Error:', error)
      setUserNotFound(true)
      return false
    } finally {
      setIsSearchingUser(false)
    }
  }

  const clearUserSearch = () => {
    setUserSearchTerm('')
    setFoundUser(null)
    setUserNotFound(false)
    setIsSearchingUser(false)
  }

  return {
    userSearchTerm,
    setUserSearchTerm,
    isSearchingUser,
    foundUser,
    setFoundUser,
    userNotFound,
    setUserNotFound,
    searchUser,
    clearUserSearch,
  }
}
