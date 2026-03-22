import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET /api/v1/products
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: none
 */
export function useProducts(params = {}, queryOptions = {}) {
  const normalized = {
    category: params.category || '',
    search: params.search || '',
    sort: params.sort || 'newest',
    featured: Boolean(params.featured),
    onSale: Boolean(params.onSale),
    perPage: Number(params.perPage || 12),
    page: Number(params.page || 1),
  }

  return useQuery({
    queryKey: ['store-products', normalized],
    queryFn: async () => {
      const response = await api.get('/products', {
        params: {
          category: normalized.category || undefined,
          search: normalized.search || undefined,
          sort: normalized.sort || undefined,
          featured: normalized.featured ? true : undefined,
          on_sale: normalized.onSale ? true : undefined,
          per_page: normalized.perPage,
          page: normalized.page,
        },
      })

      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to load products.')
      }

      return payload.data ?? { items: [], meta: null }
    },
    placeholderData: (previousData) => previousData,
    ...queryOptions,
  })
}
