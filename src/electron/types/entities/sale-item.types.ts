export interface SaleItemEntity {
  id: number
  sales_id: number
  product_stock_id?: number
  product_id: number
  mrp: number
  sale_price: number
  qty: number
  created_at?: string
}

export interface SaleItemCreateDTO {
  sales_id: number
  product_stock_id?: number
  product_id: number
  mrp: number
  sale_price: number
  qty: number
}

export interface SaleItemUpdateDTO extends Partial<SaleItemCreateDTO> {
  id?: number
}

export interface SaleItemSearchParams {
  sales_id: number
  product_id?: number
  product_stock_id?: number
  limit?: number
  offset?: number
}

export interface SaleItemWithProduct extends SaleItemEntity {
  product_name?: string
  generic_name?: string
  batch_no?: string
}
