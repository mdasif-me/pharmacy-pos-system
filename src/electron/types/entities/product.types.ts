export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
  DRAFT = 'draft',
}

export interface ProductEntity {
  id: number
  product_name: string
  generic_name?: string
  company_id: number
  category_id?: number

  // Pricing
  mrp: number
  sale_price?: number
  discount_price?: number
  peak_hour_price?: number
  mediboy_offer_price?: number

  // Stock
  in_stock: number
  stock_alert: number

  // Metadata
  type?: string
  prescription: number
  status: EntityStatus

  // Images
  cover_image?: string
  image_path?: string

  // Sync tracking
  version: number
  last_synced_at?: string
  last_modified_at: string
  is_dirty: number

  // Full JSON for extensibility
  raw_data?: string
}

export interface ProductCreateDTO {
  product_name: string
  generic_name?: string
  company_id?: number
  company_name?: string // can provide name instead of id
  category_id?: number
  category_name?: string // can provide name instead of id
  mrp: number
  sale_price?: number
  discount_price?: number
  peak_hour_price?: number
  mediboy_offer_price?: number
  in_stock?: number
  stock_alert?: number
  type?: string
  prescription?: number
  status?: EntityStatus | 'active' | 'inactive' | 'deleted' | 'draft'
  cover_image?: string
  image_path?: string
  raw_data?: string // full json for extensibility
}

export interface ProductUpdateDTO extends Partial<ProductCreateDTO> {
  id?: number
}

export interface ProductSearchParams {
  query?: string
  company_id?: number
  companyId?: number // alias
  category_id?: number
  categoryId?: number // alias
  type?: string
  status?: EntityStatus
  in_stock_min?: number
  in_stock_max?: number
  inStockOnly?: boolean // filter by stock > 0
  price_min?: number
  price_max?: number
  limit?: number
  offset?: number
  order_by?: keyof ProductEntity
  order_dir?: 'ASC' | 'DESC'
}

export interface ProductWithRelations extends ProductEntity {
  company_name?: string
  category_name?: string
}
