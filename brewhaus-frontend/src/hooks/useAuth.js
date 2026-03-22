import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

const GUEST_CART_SESSION_KEY = 'brewhaus_guest_cart_session_id'

/**
 * @returns {string|null}
 */
export function getGuestCartSessionId() {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(GUEST_CART_SESSION_KEY)
  return value && value.trim() ? value : null
}

/**
 * @returns {string}
 */
export function ensureGuestCartSessionId() {
  const existing = getGuestCartSessionId()

  if (existing) {
    return existing
  }

  const generated =
    typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GUEST_CART_SESSION_KEY, generated)
  }

  return generated
}

export function clearGuestCartSessionId() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(GUEST_CART_SESSION_KEY)
  }
}

/**
 * @param {string|null} role
 * @returns {string}
 */
export function getHomePathForRole(role) {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'customer') return '/shop'
  if (role === 'rider') return '/rider/deliveries'

  return '/'
}

/**
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function createApiError(error, fallback) {
  const nextError = new Error(getErrorMessage(error, fallback))

  nextError.status = error?.response?.status ?? null
  nextError.data = error?.response?.data?.data ?? null
  nextError.errors = error?.response?.data?.errors ?? null

  return nextError
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: POST /api/v1/auth/* and GET /api/v1/auth/me
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export default function useAuth() {
  const queryClient = useQueryClient()
  const {
    user,
    token,
    role,
    cartCount,
    isHydrated,
    isBootstrapping,
    login,
    syncProfile,
    setCartCount,
    setBootstrapping,
    logout,
  } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const payload = { email, password }
      const sessionId = getGuestCartSessionId()

      if (sessionId) {
        payload.session_id = sessionId
      }

      const response = await api.post('/auth/login', payload)
      return response?.data
    },
    onSuccess: (payload) => {
      if (!payload?.success) {
        throw new Error(payload?.message || 'Login failed.')
      }

      login({
        user: payload.data?.user ?? null,
        token: payload.data?.token ?? null,
        role: payload.data?.role ?? null,
        cartCount: payload.data?.cart_count ?? 0,
      })
      clearGuestCartSessionId()
      queryClient.clear()
    },
  })

  const googleLoginMutation = useMutation({
    mutationFn: async ({ credential }) => {
      const payload = { credential }
      const sessionId = getGuestCartSessionId()

      if (sessionId) {
        payload.session_id = sessionId
      }

      const response = await api.post('/auth/google', payload)
      return response?.data
    },
    onSuccess: (payload) => {
      if (!payload?.success) {
        throw new Error(payload?.message || 'Google sign-in failed.')
      }

      login({
        user: payload.data?.user ?? null,
        token: payload.data?.token ?? null,
        role: payload.data?.role ?? null,
        cartCount: payload.data?.cart_count ?? 0,
      })
      clearGuestCartSessionId()
      queryClient.clear()
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/auth/register', payload)
      return response?.data
    },
  })

  const resendVerificationMutation = useMutation({
    mutationFn: async (email) => {
      const response = await api.post('/auth/email/verification-notification', { email })
      return response?.data
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (token) {
        await api.post('/auth/logout')
      }

      return true
    },
    onSettled: () => {
      logout()
      queryClient.clear()
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.put('/auth/profile', payload)
      return response?.data
    },
    onSuccess: (payload) => {
      if (!payload?.success) {
        throw new Error(payload?.message || 'Profile update failed.')
      }

      syncProfile({
        user: payload.data?.user ?? null,
        role: payload.data?.role ?? null,
        cartCount: payload.data?.cart_count ?? 0,
      })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.put('/auth/password', payload)
      return response?.data
    },
  })

  const refreshProfile = useCallback(async () => {
    const response = await api.get('/auth/me')
    const payload = response?.data

    if (!payload?.success) {
      throw new Error(payload?.message || 'Unable to load the current session.')
    }

    syncProfile({
      user: payload.data?.user ?? null,
      role: payload.data?.role ?? null,
      cartCount: payload.data?.cart_count ?? 0,
    })

    return payload.data
  }, [syncProfile])

  return {
    user,
    token,
    role,
    cartCount,
    isHydrated,
    isBootstrapping,
    isReady: isHydrated && !isBootstrapping,
    isAuthenticated: Boolean(token),
    login,
    syncProfile,
    setCartCount,
    setBootstrapping,
    logout,
    loginMutation,
    googleLoginMutation,
    registerMutation,
    logoutMutation,
    updateProfileMutation,
    changePasswordMutation,
    refreshProfile,
    signIn: async (payload) => {
      try {
        return await loginMutation.mutateAsync(payload)
      } catch (error) {
        throw createApiError(error, 'Login failed.')
      }
    },
    signInWithGoogle: async (credential) => {
      try {
        return await googleLoginMutation.mutateAsync({ credential })
      } catch (error) {
        throw createApiError(error, 'Google sign-in failed.')
      }
    },
    signUp: async (payload) => {
      try {
        const response = await registerMutation.mutateAsync(payload)

        if (!response?.success) {
          throw new Error(response?.message || 'Registration failed.')
        }

        return response
      } catch (error) {
        throw createApiError(error, 'Registration failed.')
      }
    },
    isResendingVerification: resendVerificationMutation.isPending,
    resendVerificationEmail: async (email) => {
      try {
        const response = await resendVerificationMutation.mutateAsync(email)

        if (!response?.success) {
          throw new Error(response?.message || 'Unable to resend the verification email.')
        }

        return response
      } catch (error) {
        throw createApiError(error, 'Unable to resend the verification email.')
      }
    },
    signOut: async () => {
      try {
        await logoutMutation.mutateAsync()
      } catch (error) {
        throw createApiError(error, 'Logout failed.')
      }
    },
    updateProfile: async (payload) => {
      try {
        const response = await updateProfileMutation.mutateAsync(payload)

        if (!response?.success) {
          throw new Error(response?.message || 'Profile update failed.')
        }

        return response
      } catch (error) {
        throw createApiError(error, 'Profile update failed.')
      }
    },
    changePassword: async (payload) => {
      try {
        const response = await changePasswordMutation.mutateAsync(payload)

        if (!response?.success) {
          throw new Error(response?.message || 'Password update failed.')
        }

        return response
      } catch (error) {
        throw createApiError(error, 'Password update failed.')
      }
    },
  }
}
