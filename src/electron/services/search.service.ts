import { Database } from 'better-sqlite3'
import { ProductRepository } from '../database/repositories/product.repository'
import { ProductSearchParams, ProductWithRelations } from '../types/entities/product.types'

export interface SearchOptions {
  useFullTextSearch?: boolean // use fts5 or regular like
  minScore?: number // minimum relevance score
  fuzzy?: boolean // allow fuzzy matching
}

export class SearchService {
  private productRepo: ProductRepository
  private searchCache: Map<string, { results: any[]; timestamp: number }> = new Map()
  private cacheTimeout = 60000 // 1 minute

  constructor(private db: Database) {
    this.productRepo = new ProductRepository(db)
  }

  /**
   * search products with caching
   */
  search(params: ProductSearchParams, options: SearchOptions = {}): ProductWithRelations[] {
    const cacheKey = this.getCacheKey(params)

    // check cache
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.results
    }

    // perform search
    let results: ProductWithRelations[]

    if (options.useFullTextSearch && params.query) {
      // use fts5 for better performance
      results = this.productRepo.searchFTS(params.query, params.limit) as ProductWithRelations[]
    } else {
      // use regular search
      results = this.productRepo.search(params) as ProductWithRelations[]
    }

    // cache results
    this.searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
    })

    return results
  }

  /**
   * autocomplete search (for search suggestions)
   * Prioritize products starting with the query alphabetically.
   */
  autocomplete(query: string, limit = 10): string[] {
    if (!query || query.length < 2) {
      return []
    }

    const sql = `
      SELECT DISTINCT product_name
      FROM products
      WHERE product_name LIKE ? AND status = 'active'
      ORDER BY product_name ASC
      LIMIT ?
    `

    // Prioritize products starting with the query
    const results = this.db.prepare(sql).all(`${query}%`, limit) as Array<{ product_name: string }>
    return results.map((r) => r.product_name)
  }

  /**
   * search by barcode or product code
   */
  searchByCode(code: string): ProductWithRelations | undefined {
    // implement barcode search when schema has barcode field
    return undefined
  }

  /**
   * get popular products (frequently searched)
   */
  getPopularProducts(limit = 10): ProductWithRelations[] {
    // could track search count in future
    // for now, return products with high stock
    const sql = `
      SELECT p.*, c.name as company_name, cat.name as category_name
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE p.status = 'active' AND p.in_stock > 0
      ORDER BY p.in_stock DESC
      LIMIT ?
    `

    return this.db.prepare(sql).all(limit) as ProductWithRelations[]
  }

  /**
   * get recent searches (from cache)
   */
  getRecentSearches(limit = 10): string[] {
    const recent = Array.from(this.searchCache.keys())
      .filter((key) => key.startsWith('query:'))
      .map((key) => key.replace('query:', ''))
      .slice(0, limit)

    return recent
  }

  /**
   * clear search cache
   */
  clearCache(): void {
    this.searchCache.clear()
  }

  /**
   * rebuild search index
   */
  rebuildIndex(): void {
    this.productRepo.rebuildSearchIndex()
    this.clearCache()
  }

  // private helpers

  /**
   * generate cache key from search params
   */
  private getCacheKey(params: ProductSearchParams): string {
    return JSON.stringify(params)
  }

  /**
   * clean old cache entries
   */
  private cleanCache(): void {
    const now = Date.now()
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.searchCache.delete(key)
      }
    }
  }
}
