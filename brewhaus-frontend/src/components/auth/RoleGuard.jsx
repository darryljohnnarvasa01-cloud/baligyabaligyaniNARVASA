import { Navigate, useLocation } from 'react-router-dom'
import useAuth, { getHomePathForRole } from '../../hooks/useAuth'

/**
 * // [CODEX] React e-commerce component: RoleGuard
 * // Uses: useAuth, React Router, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: Restricts protected routes to allowed roles and redirects mismatched users to their e-commerce home.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 *
 * RoleGuard
 * @param {{ allowedRoles?: string[], children: import('react').ReactNode }} props
 * @returns {import('react').JSX.Element}
 */
export default function RoleGuard({ allowedRoles, children }) {
  const location = useLocation()
  const { isAuthenticated, isReady, role } = useAuth()

  if (!isReady) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to={getHomePathForRole(role)} replace />
    }
  }

  return <>{children}</>
}
