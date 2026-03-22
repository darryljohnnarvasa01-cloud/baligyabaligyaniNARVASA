import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUp, ChevronRight, LogOut, MapPin, ReceiptText, ShoppingBag, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth'

const navItems = [
  {
    to: '/customer/orders',
    label: 'My Orders',
    description: 'Track every roast, payment, and delivery step.',
    icon: ReceiptText,
  },
  {
    to: '/customer/profile',
    label: 'Profile',
    description: 'Keep your customer details current.',
    icon: UserRound,
  },
  {
    to: '/customer/addresses',
    label: 'Address Book',
    description: 'Manage delivery locations for faster checkout.',
    icon: MapPin,
  },
]

function getInitials(name) {
  return String(name || 'BH')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function DesktopNav() {
  return (
    <nav className="mt-6 space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            className={({ isActive }) =>
              [
                'block rounded-[24px] border px-4 py-4 transition',
                isActive
                  ? 'border-[#f5c842] bg-[#f5c842] text-[#1a1a1a] shadow-[0_12px_26px_rgba(0,0,0,0.12)]'
                  : 'border-white/10 bg-white/8 text-white hover:bg-white/12',
              ].join(' ')
            }
            key={item.to}
            to={item.to}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold">{item.label}</div>
                  <ChevronRight className="h-4 w-4 text-current opacity-70" />
                </div>
                <div className="mt-1 text-sm leading-6 opacity-78">{item.description}</div>
              </div>
            </div>
          </NavLink>
        )
      })}
    </nav>
  )
}

function MobileNav() {
  return (
    <div className="sticky top-3 z-20 mt-4">
      <div className="overflow-hidden rounded-[24px] border border-black/10 bg-[rgba(17,17,17,0.82)] p-2 shadow-[0_18px_36px_rgba(0,0,0,0.18)] backdrop-blur">
        <nav
          aria-label="Customer account quick navigation"
          className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
      {navItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            className="block shrink-0"
            key={item.to}
            to={item.to}
          >
            {({ isActive }) => (
              <div
                className={[
                  'min-w-[168px] rounded-[18px] border px-3 py-3 text-left transition',
                  isActive
                    ? 'border-[#f5c842] bg-[#f5c842] text-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.12)]'
                    : 'border-white/10 bg-white/8 text-white',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      isActive ? 'bg-[#1a1a1a]/10' : 'bg-white/10',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em]">
                      {item.label}
                    </div>
                    <div
                      className={[
                        'mt-1 line-clamp-2 text-[11px] leading-5',
                        isActive ? 'text-[#1a1a1a]/72' : 'text-white/64',
                      ].join(' ')}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </NavLink>
        )
      })}
        </nav>
      </div>
    </div>
  )
}

/**
 * // [CODEX] React e-commerce component: AccountPage
 * // Uses: useAuth, React Router Outlet, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: wraps the customer account area with a sidebar, identity summary, and account navigation.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function AccountPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { cartCount, signOut, user } = useAuth()
  const isFirstScrollReset = useRef(true)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    if (!window.history || !('scrollRestoration' in window.history)) {
      return undefined
    }

    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 360)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: isFirstScrollReset.current || prefersReducedMotion ? 'auto' : 'smooth',
    })

    isFirstScrollReset.current = false
  }, [location.pathname, location.search])

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Signed out.')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#ebebeb] text-[#1a1a1a]">
      <div className="relative mx-auto min-h-screen w-full max-w-[1480px] px-3 py-3 sm:px-8 sm:py-5 lg:px-10">
        <div className="lg:hidden">
          <section className="rounded-[26px] border border-black/10 bg-[#111111] p-3.5 shadow-[0_20px_44px_rgba(0,0,0,0.14)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link className="group inline-block" to="/shop">
                  <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f5c842]">
                    DISKR3T
                  </div>
                  <div className="mt-1 text-[1.35rem] font-extrabold leading-none text-white">
                    Customer Account
                  </div>
                </Link>
                <p className="mt-2 text-[13px] leading-6 text-white/72">
                  Orders, profile, and addresses tuned for quick mobile access.
                </p>
              </div>

              <button
                aria-label="Sign out"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5c842] text-[#1a1a1a]"
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-[22px] border border-white/10 bg-white/8 p-3">
              <div className="flex items-center gap-3">
                {user?.avatar_url ? (
                  <img
                    alt={user.name}
                    className="h-12 w-12 rounded-full border border-white/14 object-cover"
                    src={user.avatar_url}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5c842] text-lg font-extrabold text-[#1a1a1a]">
                    {getInitials(user?.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-extrabold text-white">
                    {user?.name || 'Customer'}
                  </div>
                  <div className="truncate text-[13px] text-white/68">
                    {user?.email || 'No email available'}
                  </div>
                </div>

                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#f5c842] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]"
                  to="/checkout"
                >
                  Checkout
                </Link>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-[18px] border border-white/10 bg-white/8 px-3 py-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/62">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Cart
                  </div>
                  <div className="mt-2 text-xl font-extrabold text-white">{cartCount}</div>
                </div>

                <Link
                  className="inline-flex items-center justify-center rounded-[18px] border border-white/12 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white"
                  to="/shop"
                >
                  Back to Shop
                </Link>
              </div>
            </div>
          </section>

          <MobileNav />
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:gap-6 lg:mt-0 lg:flex-row">
          <aside className="hidden h-fit shrink-0 rounded-[32px] border border-black/10 bg-[#111111] p-6 shadow-[0_20px_44px_rgba(0,0,0,0.14)] lg:sticky lg:top-5 lg:block lg:w-[320px]">
            <Link className="group inline-block" to="/shop">
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f5c842]">DISKR3T</div>
              <div className="text-[1.9rem] font-extrabold leading-none text-white transition group-hover:text-[#f5c842]">
                Customer Account
              </div>
            </Link>

            <div className="mt-6 rounded-[26px] border border-white/10 bg-white/8 p-4">
              <div className="flex items-center gap-4">
                {user?.avatar_url ? (
                  <img
                    alt={user.name}
                    className="h-16 w-16 rounded-full border border-white/14 object-cover"
                    src={user.avatar_url}
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5c842] text-2xl font-extrabold text-[#1a1a1a]">
                    {getInitials(user?.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-2xl font-extrabold text-white">{user?.name || 'Customer'}</div>
                  <div className="truncate text-sm text-white/68">{user?.email || 'No email available'}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[20px] border border-white/10 bg-white/8 px-4 py-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/62">Live Cart</div>
                  <div className="mt-1 text-2xl font-extrabold text-white">{cartCount}</div>
                </div>
                <Link className="rounded-full bg-[#f5c842] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#e8c53a]" to="/checkout">
                  Checkout
                </Link>
              </div>
            </div>

            <DesktopNav />

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-full border border-white/12 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10" to="/shop">
                Back to Shop
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[#f5c842] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#e8c53a]"
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>

          <main className="min-w-0 flex-1 pb-6 sm:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-5 right-4 z-30 sm:bottom-6 sm:right-6">
        <button
          aria-hidden={!showBackToTop}
          aria-label="Back to top"
          className={[
            'pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#d1ae42] bg-[#111111] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.18)] transition',
            showBackToTop
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-4 opacity-0',
          ].join(' ')}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          type="button"
        >
          <ArrowUp className="h-4 w-4 text-[#f5c842]" />
          Top
        </button>
      </div>
    </div>
  )
}
