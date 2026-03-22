import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * @typedef {Object} AuthState
 * @property {Object|null} user
 * @property {string|null} token
 * @property {string|null} role
 * @property {number} cartCount
 * @property {boolean} isHydrated
 * @property {boolean} isBootstrapping
 * @property {(payload: {user: Object, token: string, role: string, cartCount?: number}) => void} login
 * @property {(payload: {user: Object, role: string, cartCount?: number}) => void} syncProfile
 * @property {(value: number) => void} setCartCount
 * @property {(value: boolean) => void} setHydrated
 * @property {(value: boolean) => void} setBootstrapping
 * @property {() => void} logout
 */

export const useAuthStore = create(
  persist(
    /**
     * @param {(partial: Partial<AuthState> | ((state: AuthState) => Partial<AuthState>), replace?: boolean) => void} set
     * @returns {AuthState}
     */
    (set) => ({
      user: null,
      token: null,
      role: null,
      cartCount: 0,
      isHydrated: false,
      isBootstrapping: true,
      login: ({ user, token, role, cartCount = 0 }) => {
        set({ user, token, role, cartCount, isBootstrapping: false })
      },
      syncProfile: ({ user, role, cartCount = 0 }) => {
        set({ user, role, cartCount, isBootstrapping: false })
      },
      setCartCount: (value) => {
        set({ cartCount: Math.max(0, Number(value) || 0) })
      },
      setHydrated: (value) => {
        set({ isHydrated: value })
      },
      setBootstrapping: (value) => {
        set({ isBootstrapping: value })
      },
      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          cartCount: 0,
          isBootstrapping: false,
        })
      },
    }),
    {
      name: 'brewhaus_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        cartCount: state.cartCount,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)