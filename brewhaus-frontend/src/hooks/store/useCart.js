import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

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

function createCustomerAccountError(role) {
  const error = new Error(
    role ? 'Switch to a customer account to update your bag.' : 'Create a customer account to update your bag.',
  )
  error.code = role ? 'CUSTOMER_ROLE_REQUIRED' : 'CUSTOMER_ACCOUNT_REQUIRED'

  return error
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET/POST/PATCH/DELETE /api/v1/cart*
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export function useCart() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.token)
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const role = useAuthStore((state) => state.role)
  const setCartCount = useAuthStore((state) => state.setCartCount)
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore((state) => state.subtotal)
  const itemCount = useCartStore((state) => state.itemCount)
  const isOpen = useCartStore((state) => state.isOpen)
  const bounceKey = useCartStore((state) => state.bounceKey)
  const openCart = useCartStore((state) => state.openCart)
  const closeCart = useCartStore((state) => state.closeCart)
  const syncFromServer = useCartStore((state) => state.syncFromServer)
  const restoreSnapshot = useCartStore((state) => state.restoreSnapshot)
  const optimisticAdd = useCartStore((state) => state.optimisticAdd)
  const optimisticRemove = useCartStore((state) => state.optimisticRemove)
  const optimisticUpdate = useCartStore((state) => state.optimisticUpdate)
  const optimisticClear = useCartStore((state) => state.optimisticClear)

  const isCustomerSession = Boolean(token) && role === 'customer' && Boolean(userId)
  const cartKey = useMemo(
    () => ['cart', isCustomerSession ? `user:${userId}` : 'customer-only'],
    [isCustomerSession, userId],
  )

  const applyServerCart = useCallback((payload) => {
    const cart = payload?.data ?? payload ?? { items: [], item_count: 0, subtotal: 0 }

    syncFromServer(cart)
    setCartCount(cart?.item_count ?? 0)

    return cart
  }, [setCartCount, syncFromServer])

  const cartQuery = useQuery({
    queryKey: cartKey,
    queryFn: async () => {
      if (!isCustomerSession) {
        return { items: [], item_count: 0, subtotal: 0 }
      }

      const response = await api.get('/cart')
      const payload = response?.data

      if (!payload?.success) {
        throw new Error(payload?.message || 'Failed to load cart.')
      }

      return payload.data ?? { items: [], item_count: 0, subtotal: 0 }
    },
    staleTime: isCustomerSession ? 0 : Infinity,
  })

  useEffect(() => {
    if (cartQuery.data) {
      applyServerCart(cartQuery.data)
    }
  }, [applyServerCart, cartQuery.data])

  const addItemMutation = useMutation({
    mutationFn: async ({ product, quantity, selectedSize }) => {
      const response = await api.post('/cart/items', {
        product_id: Number(product?.id ?? product?.product_id),
        quantity,
        selected_size: selectedSize || undefined,
      })

      return response?.data
    },
    onMutate: async ({ product, quantity, selectedSize }) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previous = useCartStore.getState().snapshot()

      optimisticAdd(product, quantity, selectedSize)
      setCartCount(useCartStore.getState().itemCount)

      return { previous }
    },
    onError: (_error, _variables, context) => {
      restoreSnapshot(context?.previous)
      setCartCount(useCartStore.getState().itemCount)
    },
    onSuccess: (payload) => {
      applyServerCart(payload)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity }) => {
      const response = await api.patch(`/cart/items/${itemId}`, { quantity })

      return response?.data
    },
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previous = useCartStore.getState().snapshot()

      optimisticUpdate(itemId, quantity)
      setCartCount(useCartStore.getState().itemCount)

      return { previous }
    },
    onError: (_error, _variables, context) => {
      restoreSnapshot(context?.previous)
      setCartCount(useCartStore.getState().itemCount)
    },
    onSuccess: (payload) => {
      applyServerCart(payload)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: async (itemId) => {
      const response = await api.delete(`/cart/items/${itemId}`)
      return response?.data
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previous = useCartStore.getState().snapshot()

      optimisticRemove(itemId)
      setCartCount(useCartStore.getState().itemCount)

      return { previous }
    },
    onError: (_error, _variables, context) => {
      restoreSnapshot(context?.previous)
      setCartCount(useCartStore.getState().itemCount)
    },
    onSuccess: (payload) => {
      applyServerCart(payload)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/cart')
      return response?.data
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previous = useCartStore.getState().snapshot()

      optimisticClear()
      setCartCount(0)

      return { previous }
    },
    onError: (_error, _variables, context) => {
      restoreSnapshot(context?.previous)
      setCartCount(useCartStore.getState().itemCount)
    },
    onSuccess: (payload) => {
      applyServerCart(payload)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKey })
    },
  })

  return {
    items,
    subtotal,
    itemCount,
    isOpen,
    bounceKey,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    isPending:
      addItemMutation.isPending ||
      updateItemMutation.isPending ||
      removeItemMutation.isPending ||
      clearCartMutation.isPending,
    openCart,
    closeCart,
    refetch: cartQuery.refetch,
    addItem: async (product, quantity = 1, selectedSize = null) => {
      if (!isCustomerSession) {
        throw createCustomerAccountError(role)
      }

      try {
        await addItemMutation.mutateAsync({ product, quantity, selectedSize })
        return true
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to update cart.'))
      }
    },
    updateItem: async (itemId, quantity) => {
      if (!isCustomerSession) {
        throw createCustomerAccountError(role)
      }

      try {
        await updateItemMutation.mutateAsync({ itemId, quantity })
        return true
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to update cart item.'))
      }
    },
    removeItem: async (itemId) => {
      if (!isCustomerSession) {
        throw createCustomerAccountError(role)
      }

      try {
        await removeItemMutation.mutateAsync(itemId)
        return true
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to remove cart item.'))
      }
    },
    clearCart: async () => {
      if (!isCustomerSession) {
        throw createCustomerAccountError(role)
      }

      try {
        await clearCartMutation.mutateAsync()
        return true
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to clear cart.'))
      }
    },
  }
}
