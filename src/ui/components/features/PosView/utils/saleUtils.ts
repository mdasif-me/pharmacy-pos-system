/**
 * Sale Utilities
 * Helper functions for sale operations
 */

import { CartItem, OfflineSalePayload, OnlineSalePayload, SaleItem } from '../types'

/**
 * Calculate sale totals from cart items
 */
export const calculateSaleTotals = (cartItems: CartItem[]) => {
  const grandTotal = cartItems.reduce((sum, item) => sum + item.total, 0)
  const grandDiscountTotal = cartItems.reduce((sum, item) => {
    const discountPerUnit = item.mrp - item.salePrice
    return sum + discountPerUnit * item.cartQuantity
  }, 0)
  const netPrice = grandTotal - grandDiscountTotal

  return { grandTotal, grandDiscountTotal, netPrice }
}

/**
 * Transform cart items to sale items for API
 */
export const transformCartToSaleItems = (cartItems: CartItem[]): SaleItem[] => {
  return cartItems
    .filter((item) => item.cartQuantity > 0)
    .map((item) => ({
      product_id: item.id,
      max_retail_price: item.mrp,
      sale_price: item.salePrice,
      quantity: item.cartQuantity,
    }))
}

/**
 * Build online sale payload
 */
export const buildOnlineSalePayload = (
  grandTotal: number,
  grandDiscountTotal: number,
  customerPhoneNumber: string,
  userId: number,
  saleItems: SaleItem[]
): OnlineSalePayload => {
  return {
    grand_total: grandTotal,
    customer_phoneNumber: customerPhoneNumber.trim(),
    user_id: userId,
    grand_discount_total: grandDiscountTotal,
    saleItems,
  }
}

/**
 * Build offline sale payload
 */
export const buildOfflineSalePayload = (
  grandTotal: number,
  grandDiscountTotal: number,
  customerPhoneNumber: string,
  saleItems: SaleItem[]
): OfflineSalePayload => {
  return {
    grand_total: grandTotal,
    customer_phoneNumber: customerPhoneNumber.trim(),
    grand_discount_total: grandDiscountTotal,
    saleItems,
  }
}

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return `৳${amount.toFixed(2)}`
}
