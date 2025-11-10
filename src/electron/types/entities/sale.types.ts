export interface SaleEntity {
  id: number
  customer_phone_number?: string
  grand_total: number
  grand_discount_total: number
  is_sync: number // 0 = not synced, 1 = synced
  mediboy_customer_id?: number
  sale_date: string // YYYY-MM-DD format
  created_at?: string
  updated_at?: string
  synced_at?: string
  error_message?: string
}

export interface SaleCreateDTO {
  customer_phone_number?: string
  grand_total: number
  grand_discount_total: number
  mediboy_customer_id?: number
  sale_date: string
}

export interface SaleUpdateDTO extends Partial<SaleCreateDTO> {
  id?: number
}

export interface SaleSearchParams {
  customer_phone_number?: string
  mediboy_customer_id?: number
  sale_date_from?: string
  sale_date_to?: string
  is_sync?: number
  limit?: number
  offset?: number
  order_by?: keyof SaleEntity
  order_dir?: 'ASC' | 'DESC'
}
