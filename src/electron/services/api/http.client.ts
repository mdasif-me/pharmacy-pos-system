import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { StorageService } from '../storage.service'

export interface HttpClientConfig {
  baseURL: string
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  headers?: Record<string, string>
  storage?: StorageService
}

export interface RequestOptions extends AxiosRequestConfig {
  retries?: number
  retryDelay?: number
}

export class HttpClient {
  private client: AxiosInstance
  private maxRetries: number
  private retryDelay: number
  private storage?: StorageService

  constructor(config: HttpClientConfig) {
    this.maxRetries = config.maxRetries || 3
    this.retryDelay = config.retryDelay || 1000
    this.storage = config.storage

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    })

    this.setupInterceptors()
  }

  /**
   * setup request/response interceptors
   */
  private setupInterceptors(): void {
    // request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // add auth token if available
        const token = this.getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as any

        // retry logic
        if (this.shouldRetry(error) && config && !config._retry) {
          config._retryCount = config._retryCount || 0

          if (config._retryCount < this.maxRetries) {
            config._retryCount++

            // wait before retry
            await this.delay(this.retryDelay * config._retryCount)

            return this.client(config)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * get request
   */
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    const response = await this.client.get<T>(url, options)
    return response.data
  }

  /**
   * post request
   */
  async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.post<T>(url, data, options)
    return response.data
  }

  /**
   * put request
   */
  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.put<T>(url, data, options)
    return response.data
  }

  /**
   * patch request
   */
  async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.patch<T>(url, data, options)
    return response.data
  }

  /**
   * delete request
   */
  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    const response = await this.client.delete<T>(url, options)
    return response.data
  }

  /**
   * set auth token
   */
  setAuthToken(token: string): void {
    if (this.storage) {
      // Token will be saved with full user data in AuthApiService
    }
  }

  /**
   * get auth token
   */
  private getAuthToken(): string | null {
    if (this.storage) {
      return this.storage.getToken()
    }
    return null
  }

  /**
   * should retry request
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) {
      // network error, retry
      return true
    }

    const status = error.response.status
    // retry on 5xx errors and 429 (too many requests)
    return status >= 500 || status === 429
  }

  /**
   * delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
