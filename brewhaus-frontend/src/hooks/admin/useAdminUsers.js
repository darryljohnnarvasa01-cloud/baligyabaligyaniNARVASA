import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

function ensureSuccess(payload, fallback) {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback)
  }

  return payload.data
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET /api/v1/admin/users
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: none
 */
export function useAdminUsers(params = {}) {
  const role = params.role || ''
  const search = params.search || ''
  const page = Number(params.page || 1)
  const perPage = Number(params.perPage || 12)

  return useQuery({
    queryKey: ['admin-users', role, search, page, perPage],
    queryFn: async () => {
      const response = await api.get('/admin/users', {
        params: {
          role: role || undefined,
          search: search || undefined,
          page,
          per_page: perPage,
        },
      })

      return ensureSuccess(response?.data, 'Failed to load users.')
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateRiderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/admin/users/riders', payload)
      return ensureSuccess(response?.data, 'Failed to create rider.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-riders', 'available'] })
    },
  })
}
