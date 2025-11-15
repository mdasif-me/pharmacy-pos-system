import { API_CONFIG } from '../core/config/api.config'
import { StorageService } from './storage.service'

export interface OrderSearchResult {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string
  order_status: string
  order_type: string
  total_amount: number
  created_at: string
}

export interface OrderItem {
  id: number
  order_id?: number
  product_id: number
  product_name?: string
  generic_name?: string
  company_name?: string
  max_retail_price?: number
  discount_unit_price?: number
  offer_unit_price?: number
  sale_price?: number
  quantity: number
  batch_number?: string
  product?: any // Product details from API
}

export interface OrderDetailResponse {
  id?: number
  order?: Array<{
    id: number
    orderNo: string
    status: string
    type: string
    user_id: number
    pharmacy_id: number
    area: string
    payment_method: string
    offer_total_amount: number
    offer_grandTotal: number
    deliveryCharge: number
    offer_deliveryCharge: number
    comission_amount: number
    delivery_confirmation_code?: number
    orderDate: string
    coupon: any
    created_at: string
    updated_at: string
    order_items?: OrderItem[]
    order_prescriptions?: Array<{
      id: number
      order_id: number
      prescription_copy: string
      prescription_copy_path: string
    }>
    users?: {
      id: number
      firstName: string
      lastName: string
      phoneNumber: string
      email?: string
    }
  }>
}

export class OrderService {
  private storageService: StorageService

  constructor() {
    this.storageService = new StorageService()
  }

  /**
   * Search for orders by order number
   */
  async searchOrderByNumber(orderNumber: string): Promise<OrderSearchResult[]> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/search_order?orderNumber=${orderNumber}`

    console.log('[OrderService] Searching for order:', orderNumber)

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[OrderService] Search failed:', errorText)
        throw new Error(`Failed to search orders: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[OrderService] Search results:', data)

      // Handle both array and object responses
      let ordersArray = Array.isArray(data) ? data : data.orders || data.data || []

      // Transform API response to match OrderSearchResult interface
      const transformedResults: OrderSearchResult[] = ordersArray.map((order: any) => ({
        id: order.id,
        order_number: order.orderNo || order.order_number,
        customer_name:
          `${order.users?.firstName || ''} ${order.users?.lastName || ''}`.trim() ||
          'Unknown Customer',
        customer_phone: order.users?.phoneNumber || '',
        customer_email: order.users?.email || '',
        order_status: order.status || order.order_status || 'Unknown',
        order_type: order.type || order.order_type || 'Unknown',
        total_amount: order.offer_grandTotal || order.total_amount || 0,
        created_at: order.created_at || '',
      }))

      console.log('[OrderService] Transformed results:', transformedResults)
      return transformedResults
    } catch (error: any) {
      console.error('[OrderService] Error searching orders:', error)
      throw error
    }
  }

  /**
   * Get detailed information for a specific order
   */
  async getOrderDetails(orderId: number): Promise<OrderDetailResponse> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/get_order_details?order_id=${orderId}`

    console.log('[OrderService] Fetching order details for order ID:', orderId)

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[OrderService] Get details failed:', errorText)
        throw new Error(`Failed to get order details: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[OrderService] Order details fetched:', data)

      return data
    } catch (error: any) {
      console.error('[OrderService] Error getting order details:', error)
      throw error
    }
  }

  /**
   * Create online sale by order and broadcast to API
   */
  async createOnlineSaleByOrder(
    orderId: number,
    pickupValue: 'self_pick' | 'rider_pick',
    saleItems: Array<{
      product_id: number
      max_retail_price: number
      sale_price: number
      quantity: number
    }>
  ): Promise<{ success: boolean; message: string; saleId?: string }> {
    const token = this.storageService.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }

    const endpoint = `${API_CONFIG.baseURL}/pharmacy/real-time-online-sale-on-order-and-broadcast`

    const payload = {
      order_id: orderId,
      pickupValue,
      saleItems,
    }

    console.log('[OrderService] Creating online sale by order:', payload)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[OrderService] Online sale creation failed:', errorText)
        throw new Error(`Failed to create online sale: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[OrderService] Online sale created successfully:', data)

      return {
        success: true,
        message: 'Online sale created and broadcasted successfully',
        saleId: data.id || data.sale_id,
      }
    } catch (error: any) {
      console.error('[OrderService] Error creating online sale:', error)
      throw error
    }
  }
}
