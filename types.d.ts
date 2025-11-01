// removed unused chart and statistics types

type LoginRequest = {
  phoneNumber: string
  password: string
}

type LoginResponse = {
  token: string
  user: {
    id: number
    firstName: string
    lastName: string
    phoneNumber: string
    email: string
    role: string
    pharmacy_id: number
    created_at: string
    updated_at: string
  }
}

type ProductCompany = Record<string, unknown> & {
  id?: number
  name?: string
  created_at?: string
  updated_at?: string
}

type ProductCurrentStock = Record<string, unknown> & {
  id?: number
  pharmacy_id?: number
  product_id?: number
  in_stock?: number
  stock_alert?: number
  sale_price?: number
  discount_price?: number
  peak_hour_price?: number
  mediboy_offer_price?: number
  created_at?: string
  updated_at?: string
}

type Product = Record<string, unknown> & {
  id: number
  product_name: string
  generic_name: string
  retail_max_price: number
  mrp: number
  cart_qty_inc: number
  cart_text: string
  unit_in_pack: string
  type: string
  quantity: string
  prescription: string
  feature: string
  company_id: number
  company_name: string
  category_id?: number
  category_name?: string
  in_stock?: number
  discount_price?: number
  peak_hour_price?: number
  mediboy_offer_price?: number
  sale_price?: number
  status?: string
  cover_image?: string
  coverImage?: string
  product_cover_image_path?: string
  last_sync_at?: string
  company?: ProductCompany
  current_stock?: ProductCurrentStock
}

type ProductPriceUpdate = {
  discount_price: number
  peak_hour_price: number
}

type AuthToken = {
  id?: number
  token: string
  user_id: number
  user_name: string
  created_at?: string
}

type StoredAuthData = {
  token: string
  user: {
    id: number
    firstName: string
    lastName: string
    phoneNumber: string
    email: string
    role: string
    pharmacy_id: number
  }
}

type EventPayloadMapping = {
  // pharmacy pos api methods
  login: LoginResponse
  logout: void
  getAuthToken: StoredAuthData | null
  syncProducts: Product[]
  getAllProducts: Product[]
  searchProducts: Product[]
  getProductsByCompany: Product[]
  getProductsByType: Product[]
  getProductsByCategory: Product[]
  getUniqueCompanies: Array<{ company_id: number; company_name: string }>
  getUniqueTypes: Array<{ type: string }>
  getUniqueCategories: Array<{ category_id: number; category_name: string }>
  updateProductStock: void
  updateProductPrices: Product | undefined
  getLastSync: string | null
}

type UnsubscribeFunction = () => void

interface Window {
  electron: {
    // authentication methods
    login: (credentials: LoginRequest) => Promise<LoginResponse>
    logout: () => Promise<void>
    getAuthToken: () => Promise<AuthToken | undefined>

    // product methods
    syncProducts: () => Promise<Product[]>
    getAllProducts: () => Promise<Product[]>
    searchProducts: (searchTerm: string) => Promise<Product[]>
    getProductsByCompany: (companyId: number) => Promise<Product[]>
    getProductsByType: (type: string) => Promise<Product[]>
    getProductsByCategory: (categoryId: number) => Promise<Product[]>
    getUniqueCompanies: () => Promise<Array<{ company_id: number; company_name: string }>>
    getUniqueTypes: () => Promise<Array<{ type: string }>>
    getUniqueCategories: () => Promise<Array<{ category_id: number; category_name: string }>>
    updateProductStock: (productId: number, newStock: number) => Promise<void>
    updateProductPrices: (
      productId: number,
      payload: ProductPriceUpdate
    ) => Promise<Product | undefined>
    getLastSync: () => Promise<string | null>
  }
}
