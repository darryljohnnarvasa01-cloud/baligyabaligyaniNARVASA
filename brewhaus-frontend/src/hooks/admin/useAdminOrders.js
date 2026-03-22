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
 * // Endpoint: GET/PATCH /api/v1/admin/orders* and GET /api/v1/admin/riders/available
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export function useAdminOrders(params = {}) {
  const status = params.status || ''
  const paymentStatus = params.paymentStatus || ''
  const method = params.method || ''
  const dateFrom = params.dateFrom || ''
  const dateTo = params.dateTo || ''
  const page = Number(params.page || 1)
  const perPage = Number(params.perPage || 12)

  return useQuery({
    queryKey: ['admin-orders', 'list', status, paymentStatus, method, dateFrom, dateTo, page, perPage],
    queryFn: async () => {
      const response = await api.get('/admin/orders', {
        params: {
          status: status || undefined,
          payment_status: paymentStatus || undefined,
          method: method || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          per_page: perPage,
        },
      })

      return ensureSuccess(response?.data, 'Failed to fetch orders.')
    },
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
}

export function useAdminOrder(orderId, options = {}) {
  const keyId = orderId ? String(orderId) : ''

  return useQuery({
    enabled: Boolean(keyId),
    queryKey: ['admin-orders', 'detail', keyId],
    queryFn: async () => {
      const response = await api.get(`/admin/orders/${keyId}`)
      return ensureSuccess(response?.data, 'Failed to fetch order.')
    },
    refetchInterval: options.poll ? 10_000 : false,
  })
}

export function useAvailableRiders() {
  return useQuery({
    queryKey: ['admin-riders', 'available'],
    queryFn: async () => {
      const response = await api.get('/admin/riders/available')
      return ensureSuccess(response?.data, 'Failed to fetch riders.')
    },
    staleTime: 30_000,
  })
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, orderStatus, note }) => {
      const response = await api.patch(`/admin/orders/${orderId}/status`, {
        order_status: orderStatus,
        note: note || undefined,
      })

      return ensureSuccess(response?.data, 'Failed to update order status.')
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.setQueryData(['admin-orders', 'detail', String(variables.orderId)], data)
    },
  })
}

export function useAssignRiderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, riderId, note }) => {
      const response = await api.patch(`/admin/orders/${orderId}/assign`, {
        rider_id: riderId,
        note: note || undefined,
      })

      return ensureSuccess(response?.data, 'Failed to assign rider.')
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-riders', 'available'] })
      queryClient.setQueryData(['admin-orders', 'detail', String(variables.orderId)], data)
    },
  })
}
