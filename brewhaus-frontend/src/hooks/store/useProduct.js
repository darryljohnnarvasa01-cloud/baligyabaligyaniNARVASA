import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET /api/v1/products/{slug}
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: none
 */
export function useProduct(slug) {
  return useQuery({
    queryKey: ['store-product', slug],
    queryFn: async () => {
      const response = await api.get(`/products/${slug}`)
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to load product.')
      }

      return payload.data ?? { product: null, related_products: [] }
    },
    enabled: Boolean(slug),
  })
}
