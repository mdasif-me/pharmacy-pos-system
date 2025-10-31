export type StockBroadcastPayload = {
  product_id: number
  in_stock: number
  discount_price: number
  peak_hour_price: number
  mediboy_offer_price: number
  sync_at: string
}

const resolveBroadcastUrl = (): string => {
  const url = import.meta.env.VITE_STOCK_BROADCAST_URL
  if (!url) {
    throw new Error('stock broadcast url missing')
  }
  return url
}

export const broadcastStockUpdate = async (payload: StockBroadcastPayload): Promise<void> => {
  const endpoint = resolveBroadcastUrl()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'add_stock',
        data: payload,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `broadcast failed with status ${response.status}`)
    }
  } catch (error) {
    // bubble the failure so the UI can display context for the operator
    throw error instanceof Error ? error : new Error('unknown broadcast failure')
  }
}
