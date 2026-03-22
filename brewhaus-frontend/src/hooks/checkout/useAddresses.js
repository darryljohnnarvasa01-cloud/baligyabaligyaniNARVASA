import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET/POST/PUT/DELETE/PATCH /api/v1/addresses*
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export function useAddresses() {
  const token = useAuthStore((state) => state.token)
  const queryClient = useQueryClient()
  const queryKey = ['addresses']

  const invalidateRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ['customer-account'] })
  }

  const addressesQuery = useQuery({
    queryKey,
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await api.get('/addresses')
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to load addresses.')
      }

      return payload.data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/addresses', payload)
      return response?.data
    },
    onSettled: invalidateRelatedQueries,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.put(`/addresses/${id}`, payload)
      return response?.data
    },
    onSettled: invalidateRelatedQueries,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/addresses/${id}`)
      return response?.data
    },
    onSettled: invalidateRelatedQueries,
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.patch(`/addresses/${id}/default`)
      return response?.data
    },
    onSettled: invalidateRelatedQueries,
  })

  return {
    addresses: addressesQuery.data ?? [],
    isLoading: addressesQuery.isLoading,
    isError: addressesQuery.isError,
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      setDefaultMutation.isPending,
    refetch: addressesQuery.refetch,
    createAddress: async (payload) => {
      try {
        const response = await createMutation.mutateAsync(payload)

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to save address.')
        }

        return response.data
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to save address.'))
      }
    },
    updateAddress: async (id, payload) => {
      try {
        const response = await updateMutation.mutateAsync({ id, payload })

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to update address.')
        }

        return response.data
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to update address.'))
      }
    },
    deleteAddress: async (id) => {
      try {
        const response = await deleteMutation.mutateAsync(id)

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to delete address.')
        }

        return true
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to delete address.'))
      }
    },
    setDefaultAddress: async (id) => {
      try {
        const response = await setDefaultMutation.mutateAsync(id)

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to update the default address.')
        }

        return response.data
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to update the default address.'))
      }
    },
  }
}
