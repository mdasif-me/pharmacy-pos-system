// useSearch hook - product search functionality

import { useCallback, useState } from 'react'
import { ProductEntity, ProductSearchParams } from '../../electron/types/entities/product.types'
import { electronService } from '../services/electron.service'

export interface SearchState {
  query: string
  results: ProductEntity[]
  suggestions: string[]
  isLoading: boolean
  error: string | null
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    suggestions: [],
    isLoading: false,
    error: null,
  })

  const search = useCallback(async (query: string, params?: ProductSearchParams) => {
    try {
      setState((prev) => ({ ...prev, query, isLoading: true, error: null }))
      const results = await electronService.search(query, params)
      setState((prev) => ({
        ...prev,
        results,
        isLoading: false,
      }))
      return results
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

  const autocomplete = useCallback(async (query: string, limit = 10) => {
    try {
      const suggestions = await electronService.autocomplete(query, limit)
      setState((prev) => ({ ...prev, suggestions }))
      return suggestions
    } catch (error) {
      console.error('Autocomplete failed:', error)
      return []
    }
  }, [])

  const getPopular = useCallback(async (limit = 10) => {
    try {
      return await electronService.getPopularProducts(limit)
    } catch (error) {
      console.error('Failed to get popular products:', error)
      return []
    }
  }, [])

  const getRecent = useCallback(async (limit = 10) => {
    try {
      return await electronService.getRecentProducts(limit)
    } catch (error) {
      console.error('Failed to get recent products:', error)
      return []
    }
  }, [])

  const rebuildIndex = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      await electronService.rebuildSearchIndex()
      setState((prev) => ({ ...prev, isLoading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Rebuild index failed',
      }))
    }
  }, [])

  const clearSearch = useCallback(() => {
    setState({
      query: '',
      results: [],
      suggestions: [],
      isLoading: false,
      error: null,
    })
  }, [])

  return {
    ...state,
    search,
    autocomplete,
    getPopular,
    getRecent,
    rebuildIndex,
    clearSearch,
  }
}
