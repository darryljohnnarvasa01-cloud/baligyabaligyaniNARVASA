import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET /api/v1/admin/dashboard
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: none
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/admin/dashboard')
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to load dashboard stats.')
      }

      return payload.data
    },
    refetchInterval: 30_000,
  })
}
