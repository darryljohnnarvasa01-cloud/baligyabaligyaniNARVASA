import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET /api/v1/categories
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: none
 */
export function useCategories() {
  return useQuery({
    queryKey: ['store-categories'],
    queryFn: async () => {
      const response = await api.get('/categories')
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to load categories.')
      }

      return payload.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}
