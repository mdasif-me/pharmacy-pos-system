// cache service - in-memory caching

export interface CacheOptions {
  ttl?: number // time to live in milliseconds
  maxSize?: number // maximum cache size
}

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL = 300000 // 5 minutes
  private maxSize = 1000

  constructor(options: CacheOptions = {}) {
    if (options.ttl) this.defaultTTL = options.ttl
    if (options.maxSize) this.maxSize = options.maxSize

    // clean cache every minute
    setInterval(() => this.cleanup(), 60000)
  }

  /**
   * get value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value as T
  }

  /**
   * set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // enforce max size
    if (this.cache.size >= this.maxSize) {
      // remove oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  /**
   * check if key exists
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * get cache stats
   */
  stats(): {
    size: number
    maxSize: number
    keys: string[]
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * get or fetch - get from cache or fetch if missing
   */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // check cache
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    // fetch and cache
    const value = await fetcher()
    this.set(key, value, ttl)
    return value
  }

  /**
   * remember - cache result of function
   */
  remember<T>(key: string, callback: () => T, ttl?: number): T {
    // check cache
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    // execute and cache
    const value = callback()
    this.set(key, value, ttl)
    return value
  }

  /**
   * invalidate pattern - delete all keys matching pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let deleted = 0
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }

    return deleted
  }

  // private helpers

  /**
   * cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// singleton instance
export const cacheService = new CacheService()
