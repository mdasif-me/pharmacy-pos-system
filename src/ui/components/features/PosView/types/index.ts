/**
 * PosView Type Definitions
 * Centralized types for the entire PosView feature
 */

export interface Product {
  id: number
  product_name: string
  company_name: string
  mrp: number
  in_stock?: number
  type: string
  quantity?: string
  generic_name?: string
  discount_price?: number
  peak_hour_price?: number
  mediboy_offer_price?: number
}

export interface CartItem extends Product {
  cartQuantity: number
  total: number
  salePrice: number
  selectedBatch?: any
}

export interface StatCardProps {
  title: string
  value: string
  helper: string
}

export interface OrderDetail {
  productDescription: string
  companyName: string
  rate: number
  quantity: number
  total: number
}

export interface MediboyUser {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  division: string
  district: string
  upazilla: string
  bloodGroup: string
  donateBlood: string
  status: string
  created_at: string
  updated_at: string
}

export interface UserSearchResponse {
  success: boolean
  user?: MediboyUser
  message: string
  error?: string
}

export interface OnlineSalePayload {
  grand_total: number
  customer_phoneNumber: string
  user_id: number
  grand_discount_total: number
  saleItems: SaleItem[]
}

export interface OfflineSalePayload {
  grand_total: number
  customer_phoneNumber: string
  grand_discount_total: number
  saleItems: SaleItem[]
}

export interface SaleItem {
  product_id: number
  max_retail_price: number
  sale_price: number
  quantity: number
}

export interface SaleResponse {
  success: boolean
  saleId?: string | number
  id?: string | number
  sale_id?: string | number
  message: string
}

export interface AuthToken {
  token: string
  user?: {
    id: number
    username: string
    email: string
  }
}
