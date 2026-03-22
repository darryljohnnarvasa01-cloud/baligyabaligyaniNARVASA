import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth, { getHomePathForRole } from '../../hooks/useAuth'
import usePhoneViewport from '../../hooks/usePhoneViewport'
import { useCart } from '../../hooks/store/useCart'
import CartButton from './CartButton'
import CartDrawer from './CartDrawer'
import StoreMobileMenu from './StoreMobileMenu'
import { storeNavLinks } from './storeNavConfig'
import StoreSearchBar from './StoreSearchBar'

function getLinkClassName(active) {
  return [
    'inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] transition-all duration-150',
    active
      ? 'border border-ember-border bg-ember-l text-ember'
      : 'border border-transparent text-ink-3 hover:border-border-strong hover:bg-raised hover:text-ink-2',
  ].join(' ')
}

/**
 * // [CODEX] React e-commerce component: StoreShell
 * // Uses: useAuth, useCart, React Router links, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: wraps public storefront pages with the shared atmospheric shell and the server-synced cart drawer.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function StoreShell({ children, variant = 'default' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isPhoneViewport = usePhoneViewport()
  const { isAuthenticated, role } = useAuth()
  const {
    bounceKey,
    clearCart,
    closeCart,
    isLoading,
    isOpen,
    isPending,
    itemCount,
    items,
    openCart,
    removeItem,
    subtotal,
    updateItem,
  } = useCart()

  const workspaceHref = role && role !== 'customer' ? getHomePathForRole(role) : null
  const isCheckoutRoute = location.pathname.startsWith('/checkout')
  const isGold = variant === 'gold'
  const actionLinks = workspaceHref
    ? [{ label: 'Workspace', to: workspaceHref, tone: 'secondary' }]
    : isAuthenticated
      ? [{ label: 'My Account', to: '/customer/orders', tone: 'secondary' }]
      : [
          { label: 'Sign In', to: '/login', tone: 'secondary' },
          { label: 'Create Account', to: '/register', tone: 'primary' },
        ]

  const handleUpdateQty = async (itemId, quantity) => {
    try {
      if (quantity <= 0) {
        await removeItem(itemId)
        return
      }

      await updateItem(itemId, quantity)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleRemoveItem = async (itemId) => {
    try {
      await removeItem(itemId)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleClearCart = async () => {
    try {
      await clearCart()
      toast.success('Cart cleared.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleProceedToCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  return (
    <div className={isGold ? 'relative min-h-screen overflow-x-hidden bg-[#ebebeb] text-[#1a1a1a]' : 'relative min-h-screen overflow-x-hidden bg-white text-ink-2'}>
      {!isGold ? <div className="first-light-dot-grid pointer-events-none absolute inset-0 opacity-40" /> : null}

      {isPhoneViewport ? (
        <StoreMobileMenu
          actionLinks={actionLinks}
          links={storeNavLinks}
          onClose={() => setIsMobileMenuOpen(false)}
          open={isMobileMenuOpen}
        />
      ) : null}

      <div className="relative mx-auto min-h-screen max-w-[1440px] px-4 pb-16 pt-6 sm:px-8 lg:px-12 lg:pt-8">
        <header
          className={[
            'sticky top-4 z-30 mb-10 rounded-[30px] px-5 py-3.5 sm:px-6 lg:px-8',
            isGold
              ? 'first-light-dark-shell'
              : 'first-light-shell-card',
          ].join(' ')}
        >
          <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center xl:gap-6">
            <div className="flex items-center justify-between gap-4 xl:min-w-[220px]">
              <Link className="group shrink-0" to="/">
                <div className={isGold ? 'text-xs font-bold uppercase tracking-[0.28em] text-[#f5c842]' : 'text-[10px] uppercase tracking-[0.16em] text-ink-3'}>DISKR3T</div>
                <div
                  className={
                    isGold
                      ? 'text-[1.8rem] font-extrabold leading-none tracking-[0.04em] text-white transition group-hover:text-[#f5c842]'
                      : 'font-display text-[2rem] font-bold italic leading-none text-ember transition group-hover:text-ink'
                  }
                >
                  DISKR3T
                </div>
              </Link>

              {isPhoneViewport ? (
                <button
                  aria-label="Open storefront menu"
                  className={isGold ? 'first-light-inverse-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]' : 'midnight-ghost-button px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em]'}
                  onClick={() => setIsMobileMenuOpen(true)}
                  type="button"
                >
                  <Menu className="h-4 w-4" />
                  Menu
                </button>
              ) : null}
            </div>

            <nav className="hidden sm:flex sm:items-center sm:justify-center sm:gap-1">
              {storeNavLinks.map((link) => {
                const active =
                  location.pathname === link.to ||
                  (link.to === '/shop' && location.pathname.startsWith('/products/'))

                return (
                  <Link className={isGold ? [
                    'inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-all duration-150',
                    active
                      ? 'first-light-chip-button-active'
                      : 'text-white/76 hover:bg-white/10 hover:text-white',
                  ].join(' ') : getLinkClassName(active)} key={link.to} to={link.to}>
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:min-w-[540px]">
              <StoreSearchBar
                appearance={isGold ? 'dark' : 'light'}
                className="w-full sm:flex-1 xl:w-[360px] xl:flex-none"
                key={`store-search-${location.pathname}-${location.search}`}
                onNavigate={() => setIsMobileMenuOpen(false)}
              />

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  aria-controls="cart-drawer"
                  aria-expanded={isOpen}
                  aria-haspopup="dialog"
                  aria-label={`Open bag with ${itemCount} item${itemCount === 1 ? '' : 's'}`}
                  key={`bag-trigger-${bounceKey}`}
                  className={isGold ? 'first-light-inverse-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] animate-[cartPop_320ms_cubic-bezier(0.16,1,0.3,1)]' : 'inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[12px] text-gold transition animate-[cartPop_320ms_cubic-bezier(0.16,1,0.3,1)] hover:border-border-strong hover:bg-white'}
                  onClick={openCart}
                  type="button"
                >
                  Bag {itemCount}
                </button>

                {workspaceHref ? (
                  <Link className={isGold ? 'first-light-outline-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]' : 'midnight-ghost-button px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em]'} to={workspaceHref}>
                    Workspace
                  </Link>
                ) : isAuthenticated ? (
                  <Link className={isGold ? 'first-light-outline-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]' : 'midnight-ghost-button px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em]'} to="/customer/orders">
                    My Account
                  </Link>
                ) : (
                  <>
                    <Link className={isGold ? 'first-light-inverse-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]' : 'midnight-ghost-button px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em]'} to="/login">
                      Sign In
                    </Link>
                    <Link className={isGold ? 'first-light-accent-button hidden rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] sm:inline-flex' : 'midnight-ember-button hidden px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] sm:inline-flex'} to="/register">
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        {isGold ? <div className="-mt-7 mb-10 h-1 w-full rounded-full bg-[#f5c842]" /> : null}

        <main className="space-y-12">{children}</main>
      </div>

      {!isCheckoutRoute ? (
        <CartButton count={itemCount} isOpen={isOpen} key={`cart-button-${bounceKey}`} onClick={openCart} />
      ) : null}
      <CartDrawer
        isLoading={isLoading}
        isOpen={isOpen}
        isPending={isPending}
        itemCount={itemCount}
        items={items}
        onClear={handleClearCart}
        onClose={closeCart}
        onProceed={handleProceedToCheckout}
        onRemove={handleRemoveItem}
        onUpdateQty={handleUpdateQty}
        subtotal={subtotal}
      />
    </div>
  )
}
