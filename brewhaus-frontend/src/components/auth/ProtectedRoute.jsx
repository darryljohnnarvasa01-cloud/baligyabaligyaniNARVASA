import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

/**
 * // [CODEX] React e-commerce component: ProtectedRoute
 * // Uses: useAuth, React Router, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: Blocks unauthenticated access and redirects protected e-commerce routes to login.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 *
 * ProtectedRoute
 * @param {{ children: import('react').ReactNode }} props
 * @returns {import('react').JSX.Element}
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
