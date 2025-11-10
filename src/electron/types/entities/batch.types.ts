export enum BatchStatus {
  BOXED = 'Boxed',
  OPEN = 'Open',
  USED = 'Used',
  EXPIRE = 'expire',
}

export interface BatchEntity {
  id: number
  product_stock_id: number
  product_id: number
  batch_no: string
  available: number
  qty_stock: number
  exp: string // DATE format
  status: BatchStatus | string
  sync_at?: string
  created_at?: string
  updated_at?: string
}

export interface BatchCreateDTO {
  product_stock_id: number
  product_id: number
  batch_no: string
  available?: number
  qty_stock: number
  exp: string
  status?: BatchStatus | string
}

export interface BatchUpdateDTO extends Partial<BatchCreateDTO> {
  id?: number
}

export interface BatchSearchParams {
  product_id?: number
  batch_no?: string
  status?: BatchStatus | string
  exp_before?: string
  limit?: number
  offset?: number
}
