import { Navigate } from 'react-router-dom'
import useAuth, { getHomePathForRole } from '../hooks/useAuth'
import Spinner from '../components/ui/Spinner'

/**
 * // [CODEX] React e-commerce component: HomeRedirectPage
 * // Uses: useAuth, Spinner, React Router, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: Redirects authenticated users into the correct e-commerce module based on their role.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 *
 * Redirects user to role-based home.
 * @returns {import('react').JSX.Element}
 */
export default function HomeRedirectPage() {
  const { isAuthenticated, isReady, role } = useAuth()

  if (!isReady) {
    return (
      <div className="min-h-screen bg-roast text-cream flex items-center justify-center p-6">
        <Spinner label="Preparing your dashboard..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Navigate to={getHomePathForRole(role)} replace />
}
