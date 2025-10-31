/**
 * database operations for products and authentication
 * handles local storage and sync with api
 */

import { Product } from '../api/apiService.js';
import { dbManager } from '../database/manager.js';

export interface AuthToken {
  id?: number;
  token: string;
  user_id: number;
  user_name: string;
  created_at?: string;
}

export class DatabaseOperations {
  
  /**
   * save auth token and user info to database
   */
  async saveAuthToken(token: string, userId: number, userName: string): Promise<void> {
    // clear existing tokens first
    await dbManager.run('DELETE FROM auth_tokens');
    
    // insert new token
    await dbManager.run(
      'INSERT INTO auth_tokens (token, user_id, user_name) VALUES (?, ?, ?)',
      [token, userId, userName]
    );
  }

  /**
   * get current auth token from database
   */
  async getAuthToken(): Promise<AuthToken | undefined> {
    return await dbManager.get<AuthToken>(
      'SELECT * FROM auth_tokens ORDER BY created_at DESC LIMIT 1'
    );
  }

  /**
   * clear auth token (logout)
   */
  async clearAuthToken(): Promise<void> {
    await dbManager.run('DELETE FROM auth_tokens');
  }

  /**
   * save products to database (bulk insert/update)
   */
  async saveProducts(products: Product[]): Promise<void> {
    // validate input
    if (!Array.isArray(products)) {
      console.error('saveProducts called with non-array:', products);
      throw new Error('products must be an array');
    }

    console.log(`saving ${products.length} products to database`);
    
    // clear existing products
    await dbManager.run('DELETE FROM products');
    
    // insert all products
    const insertSQL = `
      INSERT INTO products (
        id, productName, genericName, retail_max_price, cart_qty_inc,
        cart_text, unit_in_pack, type, quantity, prescription, feature,
        company_id, company_name, category_id, category_name, in_stock,
        discount_price, peak_hour_price, mediboy_offer_price, sale_price,
        status, product_cover_image_path, last_sync_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const rawProduct of products) {
      const product = this.normalizeProduct(rawProduct);

      if (product.id === undefined || product.id === null) {
        console.warn('skipping product without id', rawProduct);
        continue;
      }

      if (!product.in_stock || product.in_stock <= 0) {
        // skip products with no stock to honour inventory requirements
        continue;
      }

      await dbManager.run(insertSQL, [
        product.id,
        product.productName,
        product.genericName,
        product.retail_max_price,
        product.cart_qty_inc,
        product.cart_text,
        product.unit_in_pack,
        product.type,
        product.quantity,
        product.prescription,
        product.feature,
        product.company_id,
        product.company_name,
        product.category_id,
        product.category_name,
        product.in_stock,
        product.discount_price,
        product.peak_hour_price,
        product.mediboy_offer_price,
        product.sale_price,
        product.status,
        product.product_cover_image_path,
        product.last_sync_at ?? new Date().toISOString()
      ]);
    }

    // update sync status
    await this.updateLastSync();
  }

  /**
   * get all products from database - only show products with stock
   */
  async getAllProducts(): Promise<Product[]> {
    return await dbManager.all<Product>(
      'SELECT * FROM products WHERE in_stock > 0 ORDER BY productName'
    );
  }

  /**
   * search products by name or generic name - only show products with stock
   */
  async searchProducts(searchTerm: string): Promise<Product[]> {
    const sql = `
      SELECT * FROM products 
      WHERE (productName LIKE ? OR genericName LIKE ?) AND in_stock > 0
      ORDER BY productName
    `;
    const term = `%${searchTerm}%`;
    return await dbManager.all<Product>(sql, [term, term]);
  }

  /**
   * filter products by company - only show products with stock
   */
  async getProductsByCompany(companyId: number): Promise<Product[]> {
    return await dbManager.all<Product>(
      'SELECT * FROM products WHERE company_id = ? AND in_stock > 0 ORDER BY productName',
      [companyId]
    );
  }

  /**
   * filter products by type - only show products with stock
   */
  async getProductsByType(type: string): Promise<Product[]> {
    return await dbManager.all<Product>(
      'SELECT * FROM products WHERE type = ? AND in_stock > 0 ORDER BY productName',
      [type]
    );
  }

  /**
   * filter products by category - only show products with stock
   */
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await dbManager.all<Product>(
      'SELECT * FROM products WHERE category_id = ? AND in_stock > 0 ORDER BY productName',
      [categoryId]
    );
  }

  /**
   * update product stock locally
   */
  async updateProductStock(productId: number, newStock: number): Promise<void> {
    await dbManager.run(
      'UPDATE products SET in_stock = ?, last_sync_at = ? WHERE id = ?',
      [newStock, new Date().toISOString(), productId]
    );
  }

  /**
   * update product pricing information locally
   */
  async updateProductPrices(
    productId: number,
    discountPrice: number,
    peakHourPrice: number
  ): Promise<Product | undefined> {
    await dbManager.run(
      'UPDATE products SET discount_price = ?, peak_hour_price = ?, last_sync_at = ? WHERE id = ?',
      [discountPrice, peakHourPrice, new Date().toISOString(), productId]
    );

    return await dbManager.get<Product>(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
  }

  /**
   * get unique companies for filter dropdown - only companies with stock
   */
  async getUniqueCompanies(): Promise<Array<{company_id: number, company_name: string}>> {
    return await dbManager.all<{company_id: number, company_name: string}>(
      'SELECT DISTINCT company_id, company_name FROM products WHERE in_stock > 0 ORDER BY company_name'
    );
  }

  /**
   * get unique product types for filter dropdown - only types with stock
   */
  async getUniqueTypes(): Promise<Array<{type: string}>> {
    return await dbManager.all<{type: string}>(
      'SELECT DISTINCT type FROM products WHERE type IS NOT NULL AND in_stock > 0 ORDER BY type'
    );
  }

  /**
   * get unique product categories for filter dropdown
   */
  async getUniqueCategories(): Promise<Array<{category_id: number, category_name: string}>> {
    return await dbManager.all<{category_id: number, category_name: string}>(
      'SELECT DISTINCT category_id, category_name FROM products WHERE category_id IS NOT NULL ORDER BY category_name'
    );
  }

  /**
   * normalize product keys from api to match local schema
   */
  private normalizeProduct(raw: any): Product {
    const toNumber = (value: any): number | undefined => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    };

    const toInt = (value: any): number | undefined => {
      if (value === null || value === undefined || value === '') {
        return undefined;
      }
      const num = parseInt(value, 10);
      return Number.isNaN(num) ? undefined : num;
    };

    const company = raw?.company ?? {};
    const category = raw?.category ?? {};
    const currentStock = raw?.current_stock ?? {};

    return {
      id: raw?.id ?? raw?.product_id ?? raw?.productId,
      productName: raw?.productName ?? raw?.product_name ?? raw?.name ?? '',
      genericName: raw?.genericName ?? raw?.generic_name ?? raw?.generic ?? '',
      retail_max_price:
        toNumber(raw?.retail_max_price ?? raw?.retailPrice) ??
        toNumber(currentStock?.sale_price) ??
        0,
      cart_qty_inc: toInt(raw?.cart_qty_inc ?? raw?.cartQtyInc) ?? 0,
      cart_text: raw?.cart_text ?? raw?.cartText ?? '',
      unit_in_pack: raw?.unit_in_pack ?? raw?.unit ?? '',
      type: raw?.type ?? raw?.product_type ?? '',
      quantity: String(raw?.quantity ?? raw?.total_quantity ?? ''),
      prescription: raw?.prescription ?? raw?.is_prescription ?? '',
      feature: raw?.feature ?? raw?.is_feature ?? '',
      company_id: toInt(raw?.company_id ?? company?.id) ?? 0,
      company_name: company?.name ?? raw?.company_name ?? '',
      category_id: toInt(raw?.category_id ?? category?.id),
      category_name: category?.name ?? raw?.category_name ?? '',
      in_stock: toInt(currentStock?.in_stock ?? raw?.in_stock ?? raw?.stock ?? raw?.availableStock) ?? 0,
      discount_price: toNumber(currentStock?.discount_price ?? raw?.discount_price ?? raw?.discountPrice),
      peak_hour_price: toNumber(currentStock?.peak_hour_price ?? raw?.peak_hour_price ?? raw?.peakHourPrice),
      mediboy_offer_price: toNumber(currentStock?.mediboy_offer_price ?? raw?.mediboy_offer_price ?? raw?.offerPrice),
      sale_price: toNumber(currentStock?.sale_price ?? raw?.sale_price),
      status: raw?.status ?? '',
      product_cover_image_path: raw?.product_cover_image_path ?? raw?.coverImage ?? '',
      last_sync_at: raw?.last_sync_at ?? currentStock?.updated_at ?? undefined,
    };
  }

  /**
   * update last sync timestamp
   */
  private async updateLastSync(): Promise<void> {
    // clear existing sync status
    await dbManager.run('DELETE FROM sync_status');
    
    // insert new sync status
    await dbManager.run(
      'INSERT INTO sync_status (last_product_sync) VALUES (?)',
      [new Date().toISOString()]
    );
  }

  /**
   * get last sync timestamp
   */
  async getLastSync(): Promise<string | null> {
    const result = await dbManager.get<{last_product_sync: string}>(
      'SELECT last_product_sync FROM sync_status ORDER BY id DESC LIMIT 1'
    );
    return result?.last_product_sync || null;
  }
}

// singleton instance for app-wide use
export const dbOperations = new DatabaseOperations();