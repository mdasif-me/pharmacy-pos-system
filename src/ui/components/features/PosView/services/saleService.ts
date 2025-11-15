/**
 * Sale Service
 * Handles all sale-related API calls and logic
 */

import { OfflineSalePayload, OnlineSalePayload, SaleResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export class SaleService {
  /**
   * Create online sale for found Mediboy user
   * Calls: POST /pharmacy/real-time-direct-sale-on-mediboy-user-and-broadcast
   */
  static async createOnlineSale(
    payload: OnlineSalePayload,
    authToken: string
  ): Promise<SaleResponse> {
    console.log('[SaleService] Creating online sale...', payload)

    const response = await fetch(
      `${API_BASE_URL}/pharmacy/real-time-direct-sale-on-mediboy-user-and-broadcast`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[SaleService] Online sale API error:', response.status, errorText)
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('[SaleService] Online sale response:', result)

    return {
      success: result.success || result.success === 'success',
      saleId: result.id || result.sale_id || result.saleId,
      message: result.message || 'Online sale created successfully',
    }
  }

  /**
   * Create offline sale for user not found
   * Calls: POST /pharmacy/real-time-offline-sale-and-broadcast
   */
  static async createOfflineSale(
    payload: OfflineSalePayload,
    authToken: string
  ): Promise<SaleResponse> {
    console.log('[SaleService] Creating offline sale...', payload)

    const response = await fetch(`${API_BASE_URL}/pharmacy/real-time-offline-sale-and-broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[SaleService] Offline sale API error:', response.status, errorText)
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('[SaleService] Offline sale response:', result)

    return {
      success: result.success || result.success === 'success',
      saleId: result.id || result.sale_id || result.saleId,
      message: result.message || 'Offline sale created successfully',
    }
  }
}
