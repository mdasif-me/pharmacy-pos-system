// auth api service - authentication api calls

import { HttpClient } from './http.client'

export interface LoginRequest {
  phoneNumber: string
  password: string
}

export interface LoginResponse {
  user: {
    id: number
    firstName: string
    lastName: string
    phoneNumber: string
    email: string
    role: string
    pharmacy_id: number
    created_at: string
    updated_at: string
  }
  token: string
}

export interface RegisterRequest {
  name: string
  username: string
  password: string
  shop_id?: string
}

export class AuthApiService {
  constructor(private http: HttpClient) {}

  /**
   * login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/pharmacy/login', credentials)

    if (response.token) {
      // save token
      this.http.setAuthToken(response.token)
    }

    return response
  }

  /**
   * register user
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/auth/register', data)

    if (response.token) {
      // save token
      this.http.setAuthToken(response.token)
    }

    return response
  }

  /**
   * logout user
   */
  async logout(): Promise<void> {
    await this.http.post('/auth/logout')

    // clear token
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('auth_token')
    }
  }

  /**
   * get current user
   */
  async getCurrentUser(): Promise<any> {
    try {
      const response = await this.http.get<LoginResponse>('/auth/me')
      return response.user
    } catch (error: any) {
      // If endpoint doesn't exist or user not authenticated, return null
      if (error.response?.status === 404 || error.response?.status === 401) {
        return null
      }
      throw error
    }
  }

  /**
   * refresh token
   */
  async refreshToken(): Promise<string> {
    const response = await this.http.post<LoginResponse>('/auth/refresh')

    if (response.token) {
      this.http.setAuthToken(response.token)
      return response.token
    }

    throw new Error('Failed to refresh token')
  }

  /**
   * check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      return !!window.localStorage.getItem('auth_token')
    }
    return false
  }
}
