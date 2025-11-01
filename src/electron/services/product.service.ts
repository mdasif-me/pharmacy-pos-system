import { Database } from 'better-sqlite3'
import { CategoryRepository } from '../database/repositories/category.repository'
import { CompanyRepository } from '../database/repositories/company.repository'
import { ProductRepository } from '../database/repositories/product.repository'
import {
  EntityStatus,
  ProductCreateDTO,
  ProductEntity,
  ProductSearchParams,
  ProductUpdateDTO,
  ProductWithRelations,
} from '../types/entities/product.types'

export class ProductService {
  private productRepo: ProductRepository
  private companyRepo: CompanyRepository
  private categoryRepo: CategoryRepository

  constructor(private db: Database) {
    this.productRepo = new ProductRepository(db)
    this.companyRepo = new CompanyRepository(db)
    this.categoryRepo = new CategoryRepository(db)
  }

  /**
   * search products
   */
  searchProducts(params: ProductSearchParams): ProductWithRelations[] {
    const products = this.productRepo.search(params)
    return this.enrichWithRelations(products)
  }

  /**
   * get product by id
   */
  getProductById(id: number): ProductWithRelations | undefined {
    return this.productRepo.findWithRelations(id)
  }

  /**
   * get all products
   */
  getAllProducts(
    page = 1,
    limit = 100
  ): {
    products: ProductWithRelations[]
    total: number
    page: number
    limit: number
  } {
    const offset = (page - 1) * limit
    const products = this.productRepo.findAllWithRelations({ limit, offset })
    const total = this.productRepo.count()

    return {
      products,
      total,
      page,
      limit,
    }
  }

  /**
   * create product
   */
  createProduct(data: ProductCreateDTO): ProductEntity {
    // ensure company exists
    let companyId = data.company_id
    if (!companyId && data.company_name) {
      const company = this.companyRepo.getOrCreate(data.company_name)
      companyId = company.id
    }

    // ensure category exists
    let categoryId = data.category_id
    if (!categoryId && data.category_name) {
      const category = this.categoryRepo.getOrCreate(data.category_name)
      categoryId = category.id
    }

    const product: Omit<ProductEntity, 'id'> = {
      product_name: data.product_name,
      generic_name: data.generic_name,
      company_id: companyId!,
      category_id: categoryId,
      mrp: data.mrp,
      sale_price: data.sale_price,
      discount_price: data.discount_price,
      peak_hour_price: data.peak_hour_price,
      mediboy_offer_price: data.mediboy_offer_price,
      in_stock: data.in_stock || 0,
      stock_alert: data.stock_alert || 10,
      type: data.type,
      prescription: data.prescription || 0,
      status: (data.status as EntityStatus) || EntityStatus.ACTIVE,
      cover_image: data.cover_image,
      image_path: data.image_path,
      version: 1,
      last_modified_at: new Date().toISOString(),
      is_dirty: 1,
      raw_data: data.raw_data,
    }

    return this.productRepo.create(product)
  }

  /**
   * update product
   */
  updateProduct(id: number, data: ProductUpdateDTO): ProductEntity | undefined {
    // if company name provided, get or create
    if (data.company_name) {
      const company = this.companyRepo.getOrCreate(data.company_name)
      data.company_id = company.id
    }

    // if category name provided, get or create
    if (data.category_name) {
      const category = this.categoryRepo.getOrCreate(data.category_name)
      data.category_id = category.id
    }

    // convert status if it's a string
    const updateData: Partial<ProductEntity> = {
      ...data,
      status: data.status ? (data.status as EntityStatus) : undefined,
    }

    return this.productRepo.update(id, updateData)
  }

  /**
   * delete product (soft delete)
   */
  deleteProduct(id: number): boolean {
    return this.productRepo.softDelete(id)
  }

  /**
   * update stock
   */
  updateStock(id: number, quantity: number, mode: 'add' | 'set' = 'add'): boolean {
    return this.productRepo.updateStock(id, quantity, mode)
  }

  /**
   * get low stock products
   */
  getLowStockProducts(): ProductWithRelations[] {
    const products = this.productRepo.getLowStock()
    return this.enrichWithRelations(products)
  }

  /**
   * get products pending sync
   */
  getDirtyProducts(): ProductWithRelations[] {
    const products = this.productRepo.getDirtyProducts()
    return this.enrichWithRelations(products)
  }

  /**
   * bulk upsert products (from api sync)
   */
  bulkUpsertProducts(products: ProductEntity[]): void {
    this.productRepo.bulkUpsert(products)
  }

  /**
   * import products from api data
   */
  importFromApi(apiProducts: any[]): {
    imported: number
    failed: number
    errors: string[]
  } {
    const errors: string[] = []
    let imported = 0
    let failed = 0

    for (const apiProduct of apiProducts) {
      try {
        // map api product to our schema
        const product = this.mapApiProduct(apiProduct)

        // get or create company
        if (apiProduct.company?.name) {
          const company = this.companyRepo.getOrCreate(apiProduct.company.name)
          product.company_id = company.id
        }

        // create or update product
        const existing = this.productRepo.findById(apiProduct.id)
        if (existing) {
          this.productRepo.update(apiProduct.id, product)
        } else {
          this.productRepo.create(product as any)
        }

        imported++
      } catch (error: any) {
        failed++
        errors.push(`Product ${apiProduct.id}: ${error.message}`)
      }
    }

    return { imported, failed, errors }
  }

  /**
   * rebuild search index
   */
  rebuildSearchIndex(): void {
    this.productRepo.rebuildSearchIndex()
  }

  /**
   * get statistics
   */
  getStats(): {
    total: number
    active: number
    lowStock: number
    pendingSync: number
  } {
    const total = this.productRepo.count()
    const active = this.productRepo.getCountByStatus('active')
    const lowStock = this.productRepo.getLowStock().length
    const pendingSync = this.productRepo.getDirtyProducts().length

    return { total, active, lowStock, pendingSync }
  }

  // private helpers

  /**
   * enrich products with company and category names
   */
  private enrichWithRelations(products: ProductEntity[]): ProductWithRelations[] {
    return products.map((product) => {
      const company = this.companyRepo.findById(product.company_id)
      const category = product.category_id
        ? this.categoryRepo.findById(product.category_id)
        : undefined

      return {
        ...product,
        company_name: company?.name,
        category_name: category?.name,
      } as ProductWithRelations
    })
  }

  /**
   * map api product to our schema
   */
  private mapApiProduct(apiProduct: any): Partial<ProductEntity> {
    return {
      id: apiProduct.id,
      product_name: apiProduct.productName || apiProduct.product_name,
      generic_name: apiProduct.genericName || apiProduct.generic_name,
      company_id: apiProduct.company_id,
      category_id: apiProduct.category_id,
      mrp: parseFloat(apiProduct.retail_max_price || apiProduct.mrp || 0),
      sale_price: apiProduct.sale_price,
      discount_price: apiProduct.discount_price,
      peak_hour_price: apiProduct.peak_hour_price,
      mediboy_offer_price: apiProduct.mediboy_offer_price,
      in_stock: apiProduct.current_stock?.stock || apiProduct.in_stock || 0,
      stock_alert: 10,
      type: apiProduct.type,
      prescription: apiProduct.prescription === 'yes' ? 1 : 0,
      status: apiProduct.status || 'active',
      cover_image: apiProduct.coverImage || apiProduct.cover_image,
      image_path: apiProduct.product_cover_image_path || apiProduct.image_path,
      version: 1,
      last_synced_at: new Date().toISOString(),
      last_modified_at: apiProduct.updated_at || new Date().toISOString(),
      is_dirty: 0,
      raw_data: JSON.stringify(apiProduct),
    }
  }
}
