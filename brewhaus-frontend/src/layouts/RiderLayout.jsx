import { Link, NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom'
import { Clock3, LogOut, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import riderDeskLogo from '../../652144230_26113070101647329_162633978441226982_n.png'

/**
 * // [CODEX] React e-commerce component: RiderLayout
 * // Uses: useAuth, NavLink, Outlet, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: Frames the rider delivery workspace with navigation and authenticated logout handling.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 *
 * RiderLayout
 * @returns {import('react').JSX.Element}
 */
export default function RiderLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const deliveryDetailMatch = useMatch('/rider/deliveries/:id')
  const deliveryAliasMatch = useMatch('/rider/delivery/:orderId')
  const isDeliveryDetailRoute = Boolean(deliveryDetailMatch || deliveryAliasMatch)

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort logout.
    } finally {
      logout()
      toast.success('Signed out.')
      navigate('/login', { replace: true })
    }
  }

  if (isDeliveryDetailRoute) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-ink-2">
      <header className="sticky top-0 z-10 border-b border-[#e7ddc8] bg-[rgba(255,250,241,0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
          <Link
            to="/rider/deliveries"
            className="group inline-flex items-center gap-3"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2b2b2b] bg-[#111111] shadow-sm">
              <img
                src={riderDeskLogo}
                alt="DISKR3T rider logo"
                className="h-11 w-11 object-contain"
              />
            </span>
            <span>
              <span className="hidden text-[10px] uppercase tracking-[0.28em] text-ink-4 sm:block">
                Rider Desk
              </span>
              <span className="block text-[1.55rem] font-display font-bold italic leading-none text-ink transition group-hover:text-ember sm:text-[1.9rem]">
                DISKR3T
              </span>
            </span>
          </Link>

          <nav
            aria-label="Rider navigation"
            className="order-3 hidden items-center gap-1 overflow-x-auto rounded-full border border-[#e4d8c4] bg-white/80 p-1 shadow-xs sm:order-none sm:ml-1 sm:flex sm:w-auto"
          >
            <NavLink
              to="/rider/deliveries"
              end
              className={({ isActive }) =>
                [
                  'rounded-full px-4 py-2 text-sm transition',
                  isActive
                    ? 'bg-[#fff1cf] text-ember shadow-xs'
                    : 'text-ink-3 hover:bg-surface hover:text-ink',
                ].join(' ')
              }
            >
              Deliveries
            </NavLink>
            <NavLink
              to="/rider/history"
              className={({ isActive }) =>
                [
                  'rounded-full px-4 py-2 text-sm transition whitespace-nowrap',
                  isActive
                    ? 'bg-[#fff1cf] text-ember shadow-xs'
                    : 'text-ink-3 hover:bg-surface hover:text-ink',
                ].join(' ')
              }
            >
              History
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[#e4d9c6] bg-white/78 px-4 py-2 text-sm text-ink-3 shadow-xs md:flex">
              <Truck className="h-4 w-4 text-ember" />
              {user?.name || 'Rider'}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-[#dccfb7] bg-white px-3 py-2 text-sm font-medium text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-[#c9a84c] hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf1] sm:px-4"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 sm:pb-8 lg:px-8">
        <Outlet />
      </main>

      <nav
        aria-label="Rider mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e7ddc8] bg-[rgba(255,250,241,0.96)] backdrop-blur sm:hidden"
      >
        <div
          className="mx-auto grid max-w-[430px] grid-cols-2 gap-2 px-4 pt-3"
          style={{ paddingBottom: 'calc(0.9rem + env(safe-area-inset-bottom))' }}
        >
          <NavLink
            to="/rider/deliveries"
            end
            className={({ isActive }) =>
              [
                'inline-flex min-h-[52px] flex-col items-center justify-center rounded-[18px] border text-[11px] font-medium uppercase tracking-[0.18em] transition',
                isActive
                  ? 'border-[#d5c191] bg-[#fff0c7] text-ember shadow-xs'
                  : 'border-[#e4d8c4] bg-white text-ink-3',
              ].join(' ')
            }
          >
            <Truck className="mb-1 h-4 w-4" />
            Deliveries
          </NavLink>
          <NavLink
            to="/rider/history"
            className={({ isActive }) =>
              [
                'inline-flex min-h-[52px] flex-col items-center justify-center rounded-[18px] border text-[11px] font-medium uppercase tracking-[0.18em] transition',
                isActive
                  ? 'border-[#d5c191] bg-[#fff0c7] text-ember shadow-xs'
                  : 'border-[#e4d8c4] bg-white text-ink-3',
              ].join(' ')
            }
          >
            <Clock3 className="mb-1 h-4 w-4" />
            History
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
