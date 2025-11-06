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
  private syncFilePath: string

  constructor() {
    this.storageDir = app.getPath('userData')
    this.authFilePath = path.join(this.storageDir, 'auth-data.json')
    this.syncFilePath = path.join(this.storageDir, 'sync-data.json')

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

  /**
   * Save last sync timestamp
   */
  setLastSync(timestamp: string): void {
    try {
      const data = {
        lastSync: timestamp,
        updatedAt: new Date().toISOString(),
      }
      fs.writeFileSync(this.syncFilePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('Error saving sync data:', error)
      throw error
    }
  }

  /**
   * Get last sync timestamp
   * Returns in API-compatible format: YYYY-MM-DD HH:MM:SS
   */
  getLastSync(): string | null {
    try {
      console.log('getLastSync: Checking file:', this.syncFilePath)

      if (!fs.existsSync(this.syncFilePath)) {
        console.log('getLastSync: File does not exist')
        return null
      }

      const data = fs.readFileSync(this.syncFilePath, 'utf-8')
      const parsed = JSON.parse(data)
      console.log('getLastSync: Parsed data:', parsed)

      const lastSync = parsed.lastSync || null

      // Convert ISO format to API format (YYYY-MM-DD HH:MM:SS)
      if (lastSync) {
        const date = new Date(lastSync)
        const formatted = date
          .toISOString()
          .replace('T', ' ')
          .replace(/\.\d{3}Z$/, '')
        console.log('getLastSync: Formatted for API:', formatted)
        return formatted
      }

      return null
    } catch (error) {
      console.error('Error reading sync data:', error)
      return null
    }
  }

  /**
   * Get last sync timestamp formatted for UI display
   * Returns in format: MM/DD/YYYY HH:MM:SS
   */
  getLastSyncFormatted(): string | null {
    try {
      if (!fs.existsSync(this.syncFilePath)) {
        return null
      }

      const data = fs.readFileSync(this.syncFilePath, 'utf-8')
      const parsed = JSON.parse(data)

      const lastSync = parsed.lastSync || null

      if (lastSync) {
        const date = new Date(lastSync)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const year = date.getFullYear()
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
      }

      return null
    } catch (error) {
      console.error('Error reading sync data for UI:', error)
      return null
    }
  }
}
