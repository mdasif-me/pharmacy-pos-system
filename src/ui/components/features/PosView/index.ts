/**
 * PosView Module Index
 * Centralized exports for better organization
 */

// Components
export { StatCard } from './components/StatCard'

// Services
export { AuthService, SaleService, UserSearchService } from './services'

// Hooks
export { useCart, useUserSearch } from './hooks'

// Types
export type {
  AuthToken,
  CartItem,
  MediboyUser,
  OfflineSalePayload,
  OnlineSalePayload,
  OrderDetail,
  Product,
  SaleItem,
  SaleResponse,
  StatCardProps,
  UserSearchResponse,
} from './types'

// Utils
export {
  buildOfflineSalePayload,
  buildOnlineSalePayload,
  calculateSaleTotals,
  formatCurrency,
  transformCartToSaleItems,
} from './utils/saleUtils'
