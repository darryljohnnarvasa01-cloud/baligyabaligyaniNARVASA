import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET /api/v1/customer/orders, GET /api/v1/customer/orders/{number}, POST /api/v1/customer/orders/{number}/cancel
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export function useCustomerOrders(params = {}) {
  const page = Number(params.page || 1)
  const perPage = Number(params.perPage || 10)
  const status = params.status ? String(params.status) : ''
  const view = params.view ? String(params.view) : ''

  return useQuery({
    queryKey: ['customer-orders', 'list', page, perPage, status, view],
    queryFn: async () => {
      const response = await api.get('/customer/orders', {
        params: {
          page,
          per_page: perPage,
          status: status || undefined,
          view: view || undefined,
        },
      })

      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch orders.')
      }

      return payload.data
    },
  })
}

export function useCustomerOrder(orderNumber, options = {}) {
  const key = orderNumber ? String(orderNumber) : ''

  return useQuery({
    enabled: Boolean(key),
    queryKey: ['customer-orders', 'detail', key],
    queryFn: async () => {
      const response = await api.get(`/customer/orders/${key}`)
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to fetch order.')
      }

      return payload.data
    },
    refetchInterval: options.poll ? 10_000 : false,
  })
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderNumber) => {
      const response = await api.post(`/customer/orders/${orderNumber}/cancel`)
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to cancel order.')
      }

      return payload.data
    },
    onSuccess: (_data, orderNumber) => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      queryClient.invalidateQueries({
        queryKey: ['customer-orders', 'detail', String(orderNumber)],
      })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
