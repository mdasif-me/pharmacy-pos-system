// useAuth hook - authentication management

import { useCallback, useEffect, useState } from 'react'
import {
  AuthResponse,
  AuthToken,
  electronService,
  LoginCredentials,
  RegisterData,
} from '../services/electron.service'

export interface AuthState {
  user: AuthToken | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const user = await electronService.getCurrentUser()
      setState({
        user,
        isAuthenticated: !!user,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check auth status',
      })
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const response = await electronService.login(credentials)

      if (response.success && response.token && response.user) {
        const user: AuthToken = {
          token: response.token,
          user: response.user,
        }
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.message || 'Login failed',
        }))
      }

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return {
        success: false,
        message: errorMessage,
      }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      await electronService.logout()
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      }))
    }
  }, [])

  const register = useCallback(async (data: RegisterData): Promise<AuthResponse> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const response = await electronService.register(data)

      if (response.success && response.token && response.user) {
        const user: AuthToken = {
          token: response.token,
          user: response.user,
        }
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.message || 'Registration failed',
        }))
      }

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return {
        success: false,
        message: errorMessage,
      }
    }
  }, [])

  return {
    ...state,
    login,
    logout,
    register,
    refresh: checkAuthStatus,
  }
}
