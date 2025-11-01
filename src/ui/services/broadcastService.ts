export type StockBroadcastPayload = {
  product_id: number
  stock_mrp: number
  purchase_price: number
  discount_price: number
  peak_hour_price: number
  offer_price: number
  perc_off: number
  batch_no: string
  expire_date: string // YYYY/MM/DD format
  qty: number
  stock_alert: number
  shelf: string | null
}

export const broadcastStockUpdate = async (payload: StockBroadcastPayload): Promise<void> => {
  try {
    // Use IPC to call the main process, which handles the API request
    // This avoids CORS issues since the main process is not subject to browser security policies
    const result = await window.electron.addStock(payload)

    if (!result.success) {
      throw new Error(result.error || 'Stock broadcast failed')
    }

    return result.data
  } catch (error) {
    // Bubble the failure so the UI can display context for the operator
    throw error instanceof Error ? error : new Error('Unknown broadcast failure')
  }
}
