// storage.service.ts - Simple file-based storage for auth tokens

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

interface StoredAuthData {
  token: string
  user: any
  timestamp: number
}

export class StorageService {
  private storageDir: string
  private authFilePath: string

  constructor() {
    // Use Electron's app data directory
    this.storageDir = app.getPath('userData')
    this.authFilePath = path.join(this.storageDir, 'auth-data.json')

    // Ensure directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }
  }

  /**
   * Save authentication data
   */
  saveAuth(token: string, user: any): void {
    try {
      const data: StoredAuthData = {
        token,
        user,
        timestamp: Date.now(),
      }
      fs.writeFileSync(this.authFilePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error saving auth data:', error)
      throw error
    }
  }

  /**
   * Get stored authentication data
   */
  getAuth(): StoredAuthData | null {
    try {
      if (!fs.existsSync(this.authFilePath)) {
        return null
      }

      const data = fs.readFileSync(this.authFilePath, 'utf-8')
      return JSON.parse(data) as StoredAuthData
    } catch (error) {
      console.error('Error reading auth data:', error)
      return null
    }
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    const auth = this.getAuth()
    return auth?.token || null
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    try {
      if (fs.existsSync(this.authFilePath)) {
        fs.unlinkSync(this.authFilePath)
      }
    } catch (error) {
      console.error('Error clearing auth data:', error)
      throw error
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null
  }
}
