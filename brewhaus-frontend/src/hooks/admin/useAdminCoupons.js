import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

function ensureSuccess(payload, fallback) {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback)
  }

  return payload.data
}

// [CODEX] TanStack React Query hook for e-commerce
// Endpoint: GET/POST/PUT/DELETE /api/v1/admin/coupons*
// Auth: Bearer token from useAuthStore()
// Returns: { data, isLoading, isError, refetch }
// Mutation: { mutate, isPending, isSuccess }
export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const response = await api.get('/admin/coupons')
      return ensureSuccess(response?.data, 'Failed to load coupons.')
    },
  })
}

export function useCreateCouponMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/admin/coupons', payload)
      return ensureSuccess(response?.data, 'Failed to create coupon.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    },
  })
}

export function useUpdateCouponMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.put(`/admin/coupons/${id}`, payload)
      return ensureSuccess(response?.data, 'Failed to update coupon.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    },
  })
}

export function useDeleteCouponMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/admin/coupons/${id}`)
      return ensureSuccess(response?.data, 'Failed to delete coupon.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    },
  })
}
