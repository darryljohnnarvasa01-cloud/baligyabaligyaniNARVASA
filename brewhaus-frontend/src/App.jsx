import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import SessionBootScreen from './components/auth/SessionBootScreen'
import useAuth from './hooks/useAuth'
import router from './router'

function AuthBootstrap() {
  const {
    token,
    isHydrated,
    isBootstrapping,
    refreshProfile,
    setBootstrapping,
    logout,
  } = useAuth()

  useEffect(() => {
    if (!isHydrated) {
      return undefined
    }

    let isMounted = true

    const bootstrap = async () => {
      if (!token) {
        setBootstrapping(false)
        return
      }

      setBootstrapping(true)

      try {
        await refreshProfile()
      } catch {
        if (isMounted) {
          logout()
        }
      }
    }

    void bootstrap()

    return () => {
      isMounted = false
    }
  }, [isHydrated, logout, refreshProfile, setBootstrapping, token])

  if (!isHydrated || isBootstrapping) {
    return <SessionBootScreen />
  }

  return <RouterProvider future={{ v7_startTransition: true }} router={router} />
}

/**
 * BrewHaus React app entry.
 * @returns {import('react').JSX.Element}
 */
export default function App() {
  return <AuthBootstrap />
}
