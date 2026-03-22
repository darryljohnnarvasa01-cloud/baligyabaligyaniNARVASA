import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET/PUT /api/v1/customer/profile
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export default function useCustomerAccount() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)
  const role = useAuthStore((state) => state.role)
  const cartCount = useAuthStore((state) => state.cartCount)
  const syncProfile = useAuthStore((state) => state.syncProfile)
  const queryKey = ['customer-account']

  const profileQuery = useQuery({
    queryKey,
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await api.get('/customer/profile')
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to load the customer profile.')
      }

      return payload.data ?? null
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.put('/customer/profile', payload)
      return response?.data
    },
    onSuccess: (payload) => {
      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to update the customer profile.')
      }

      queryClient.setQueryData(queryKey, payload.data ?? null)
      queryClient.invalidateQueries({ queryKey: ['addresses'] })

      if (payload.data?.user) {
        syncProfile({
          user: payload.data.user,
          role,
          cartCount,
        })
      }
    },
  })

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    isPending: updateProfileMutation.isPending,
    refetch: profileQuery.refetch,
    updateProfile: async (payload) => {
      try {
        const response = await updateProfileMutation.mutateAsync(payload)

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to update the customer profile.')
        }

        return response.data
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to update the customer profile.'))
      }
    },
  }
}
