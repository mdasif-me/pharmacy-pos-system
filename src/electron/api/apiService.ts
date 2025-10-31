/**
 * api service for pharmacy pos system
 * handles authentication and product data fetching
 */

const BASE_URL = 'https://beta-api.mediboy.org/api';

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
    role: string;
    pharmacy_id: number;
    created_at: string;
    updated_at: string;
  };
}

export interface Product {
  id: number;
  productName: string;
  genericName: string;
  retail_max_price: number;
  cart_qty_inc: number;
  cart_text: string;
  unit_in_pack: string;
  type: string;
  quantity: string;
  prescription: string;
  feature: string;
  company_id: number;
  company_name: string;
  category_id?: number;
  category_name?: string;
  in_stock?: number;
  discount_price?: number;
  peak_hour_price?: number;
  mediboy_offer_price?: number;
  sale_price?: number;
  status?: string;
  cover_image?: string;
  last_sync_at?: string;
}

export class ApiService {
  private token: string | null = null;

  /**
   * set auth token for api requests
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * get auth headers for api requests
   */
  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  /**
   * login to pharmacy system
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(`${BASE_URL}/pharmacy/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error(`login failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // store token for future requests - api returns token directly
      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      console.error('login error:', error);
      throw error;
    }
  }

  /**
   * logout from pharmacy system
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/pharmacy/user_logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      // clear token after logout
      this.token = null;
    } catch (error) {
      console.error('logout error:', error);
      throw error;
    }
  }

  /**
   * fetch all products with real-time stock
   */
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${BASE_URL}/pharmacy/get-real-time-stock-product`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`failed to fetch products: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('products api response:', data); // debug log
      
      // handle different response structures
      if (Array.isArray(data)) {
        return data;
      } else if (data.products && Array.isArray(data.products)) {
        return data.products;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      } else {
        console.error('unexpected products response structure:', data);
        throw new Error('products response is not an array');
      }
    } catch (error) {
      console.error('get products error:', error);
      throw error;
    }
  }
}

// singleton instance for app-wide use
export const apiService = new ApiService();