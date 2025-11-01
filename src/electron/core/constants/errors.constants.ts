/**
 * Error messages and codes
 */

export enum ErrorCode {
  // Database errors
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',

  // API errors
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_TIMEOUT = 'API_TIMEOUT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_NOT_FOUND = 'API_NOT_FOUND',

  // Sync errors
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_QUEUE_FULL = 'SYNC_QUEUE_FULL',

  // Business logic errors
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_PRICE = 'INVALID_PRICE',

  // Auth errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Database
  [ErrorCode.DB_CONNECTION_FAILED]: 'Failed to connect to database',
  [ErrorCode.DB_QUERY_FAILED]: 'Database query failed',
  [ErrorCode.DB_TRANSACTION_FAILED]: 'Database transaction failed',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.REQUIRED_FIELD_MISSING]: 'Required field is missing',

  // API
  [ErrorCode.API_REQUEST_FAILED]: 'API request failed',
  [ErrorCode.API_TIMEOUT]: 'API request timeout',
  [ErrorCode.API_UNAUTHORIZED]: 'Unauthorized access',
  [ErrorCode.API_NOT_FOUND]: 'Resource not found',

  // Sync
  [ErrorCode.SYNC_FAILED]: 'Synchronization failed',
  [ErrorCode.SYNC_CONFLICT]: 'Synchronization conflict detected',
  [ErrorCode.SYNC_QUEUE_FULL]: 'Sync queue is full',

  // Business logic
  [ErrorCode.PRODUCT_NOT_FOUND]: 'Product not found',
  [ErrorCode.INSUFFICIENT_STOCK]: 'Insufficient stock',
  [ErrorCode.INVALID_PRICE]: 'Invalid price',

  // Auth
  [ErrorCode.AUTH_FAILED]: 'Authentication failed',
  [ErrorCode.TOKEN_EXPIRED]: 'Token has expired',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: unknown
  ) {
    super(message || ERROR_MESSAGES[code])
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
