import { StorageService } from '../storage.service'
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
  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {}

  /**
   * login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/pharmacy/login', credentials)

    if (response.token && response.user) {
      // Save token and user data
      this.storage.saveAuth(response.token, response.user)
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
    try {
      await this.http.post('/auth/logout')
    } catch (error) {
      console.error('Error during logout API call:', error)
    }

    // Clear stored auth data
    this.storage.clearAuth()
  }

  /**
   * get current user - returns stored user data
   */
  async getCurrentUser(): Promise<any> {
    // Return stored auth data instead of calling API
    const authData = this.storage.getAuth()
    if (authData) {
      return {
        token: authData.token,
        user: authData.user,
      }
    }
    return null
  }

  /**
   * refresh token
   */
  async refreshToken(): Promise<string> {
    const response = await this.http.post<LoginResponse>('/auth/refresh')

    if (response.token && response.user) {
      this.storage.saveAuth(response.token, response.user)
      this.http.setAuthToken(response.token)
      return response.token
    }

    throw new Error('Failed to refresh token')
  }

  /**
   * check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.storage.isAuthenticated()
  }
}
