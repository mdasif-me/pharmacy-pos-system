// useProducts hook - product management

import { useCallback, useEffect, useState } from 'react'
import {
  ProductCreateDTO,
  ProductEntity,
  ProductSearchParams,
  ProductUpdateDTO,
} from '../../electron/types/entities/product.types'
import { electronService, ProductStats } from '../services/electron.service'

export interface ProductsState {
  products: ProductEntity[]
  stats: ProductStats | null
  isLoading: boolean
  error: string | null
}

export function useProducts(autoLoad = true) {
  const [state, setState] = useState<ProductsState>({
    products: [],
    stats: null,
    isLoading: false,
    error: null,
  })

  // Load products on mount if autoLoad is true
  useEffect(() => {
    if (autoLoad) {
      loadProducts()
    }
  }, [autoLoad])

  const loadProducts = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const products = await electronService.getAllProducts()
      setState((prev) => ({
        ...prev,
        products,
        isLoading: false,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load products',
      }))
    }
  }, [])

  const searchProducts = useCallback(async (params: ProductSearchParams) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const products = await electronService.searchProducts(params)
      setState((prev) => ({
        ...prev,
        products,
        isLoading: false,
      }))
      return products
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return []
    }
  }, [])

  const getProductById = useCallback(async (id: number) => {
    try {
      return await electronService.getProductById(id)
    } catch (error) {
      console.error('Failed to get product:', error)
      return undefined
    }
  }, [])

  const createProduct = useCallback(async (data: ProductCreateDTO) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const product = await electronService.createProduct(data)
      setState((prev) => ({
        ...prev,
        products: [...prev.products, product],
        isLoading: false,
      }))
      return product
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw new Error(errorMessage)
    }
  }, [])

  const updateProduct = useCallback(async (id: number, data: ProductUpdateDTO) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const product = await electronService.updateProduct(id, data)

      if (product) {
        setState((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === id ? product : p)),
          isLoading: false,
        }))
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }

      return product
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update product'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw new Error(errorMessage)
    }
  }, [])

  const deleteProduct = useCallback(async (id: number) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const success = await electronService.deleteProduct(id)

      if (success) {
        setState((prev) => ({
          ...prev,
          products: prev.products.filter((p) => p.id !== id),
          isLoading: false,
        }))
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }

      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete product'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return false
    }
  }, [])

  const updateStock = useCallback(async (id: number, quantity: number) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      const product = await electronService.updateStock(id, quantity)

      if (product) {
        setState((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === id ? product : p)),
          isLoading: false,
        }))
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }

      return product
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update stock'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      throw new Error(errorMessage)
    }
  }, [])

  const getLowStock = useCallback(async (threshold = 10) => {
    try {
      return await electronService.getLowStockProducts(threshold)
    } catch (error) {
      console.error('Failed to get low stock products:', error)
      return []
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const stats = await electronService.getProductStats()
      setState((prev) => ({ ...prev, stats }))
      return stats
    } catch (error) {
      console.error('Failed to load stats:', error)
      return null
    }
  }, [])

  const importProducts = useCallback(
    async (products: ProductCreateDTO[]) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))
        const result = await electronService.importProducts(products)

        if (result.success) {
          await loadProducts() // Reload all products
        }

        setState((prev) => ({ ...prev, isLoading: false }))
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Import failed'
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }))
        throw new Error(errorMessage)
      }
    },
    [loadProducts]
  )

  return {
    ...state,
    loadProducts,
    searchProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getLowStock,
    loadStats,
    importProducts,
  }
}
