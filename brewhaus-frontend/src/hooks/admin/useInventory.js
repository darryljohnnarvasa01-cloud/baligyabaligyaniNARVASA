import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

function ensureSuccess(payload, fallback) {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback)
  }

  return payload.data
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET /api/v1/admin/inventory, POST /api/v1/admin/inventory/{id}/restock
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export function useAdminInventory() {
  return useQuery({
    queryKey: ['admin-inventory'],
    queryFn: async () => {
      const response = await api.get('/admin/inventory')
      return ensureSuccess(response?.data, 'Failed to load inventory.')
    },
    refetchInterval: 30_000,
  })
}

export function useRestockInventoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, quantityToAdd, note }) => {
      const response = await api.post(`/admin/inventory/${id}/restock`, {
        quantity_to_add: quantityToAdd,
        note: note || undefined,
      })

      return ensureSuccess(response?.data, 'Failed to restock inventory.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
    },
  })
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productId, payload }) => {
      const response = await api.post(`/admin/inventory/${productId}/adjust`, {
        new_quantity: payload.new_quantity,
        adjustment_type: payload.adjustment_type,
        note: payload.note || undefined,
      })

      return ensureSuccess(response?.data, 'Failed to adjust inventory.')
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({
        queryKey: ['admin-products', 'detail', String(variables.productId)],
      })
    },
  })
}
