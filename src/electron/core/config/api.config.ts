// api.config.ts - API configuration

export const API_CONFIG = {
  baseURL: process.env.API_BASE_URL || 'https://beta-api.mediboy.org/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
}
