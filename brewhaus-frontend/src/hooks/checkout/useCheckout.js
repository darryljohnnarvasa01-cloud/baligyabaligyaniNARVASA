import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import useAuth from '../useAuth'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { resetStoreCatalogQueries } from '../../utils/storeQueries'

function normalizeErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors)
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value
      }

      return value ? [value] : []
    })
    .map((message) => String(message).trim())
    .filter(Boolean)
}

function getErrorMessage(error, fallback) {
  const fieldErrors = normalizeErrors(error?.response?.data?.errors)

  if (fieldErrors.length > 0) {
    return fieldErrors[0]
  }

  return error?.response?.data?.message || error?.message || fallback
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: POST /api/v1/checkout and GET /api/v1/checkout/order/{number}
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export default function useCheckout(orderNumber = null) {
  const { isReady, role } = useAuth()
  const token = useAuthStore((state) => state.token)
  const setCartCount = useAuthStore((state) => state.setCartCount)
  const queryClient = useQueryClient()
  const canLoadCustomerOrder = isReady && Boolean(token) && role === 'customer' && Boolean(orderNumber)

  const couponMutation = useMutation({
    mutationFn: async (couponCode) => {
      const response = await api.post('/checkout/coupon', {
        coupon_code: couponCode,
      })

      return response?.data
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/checkout', payload)
      return response?.data
    },
    onSuccess: () => {
      useCartStore.getState().syncFromServer({
        items: [],
        item_count: 0,
        subtotal: 0,
      })
      setCartCount(0)
      resetStoreCatalogQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })

  const orderQuery = useQuery({
    queryKey: ['checkout-order', orderNumber],
    enabled: canLoadCustomerOrder,
    queryFn: async () => {
      try {
        const response = await api.get(`/checkout/order/${orderNumber}`)
        const payload = response?.data

        if (!payload?.success) {
          throw new Error(payload?.message || 'Failed to load the order.')
        }

        return payload.data ?? null
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to load the order.'))
      }
    },
    refetchInterval: (query) => {
      const order = query.state.data

      if (!order || order.payment_method === 'cod') {
        return false
      }

      return order.payment_status === 'pending' ? 3000 : false
    },
    refetchIntervalInBackground: true,
  })

  return {
    order: orderQuery.data ?? null,
    isOrderLoading: orderQuery.isLoading,
    isOrderError: orderQuery.isError,
    orderErrorMessage: orderQuery.error?.message || null,
    refetchOrder: orderQuery.refetch,
    isApplyingCoupon: couponMutation.isPending,
    applyCoupon: async (couponCode) => {
      try {
        const response = await couponMutation.mutateAsync(couponCode)

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to apply coupon.')
        }

        return response.data
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to apply coupon.'))
      }
    },
    isPlacing: checkoutMutation.isPending,
    placeOrder: async (payload) => {
      try {
        const response = await checkoutMutation.mutateAsync(payload)

        if (!response?.success) {
          throw new Error(response?.message || 'Failed to place the order.')
        }

        return response.data
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to place the order.'))
      }
    },
  }
}
