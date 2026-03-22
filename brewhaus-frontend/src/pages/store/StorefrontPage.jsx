import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, Menu, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import heroArtwork from '../../assets/hero.png'
import CartButton from '../../components/store/CartButton'
import CartDrawer from '../../components/store/CartDrawer'
import StoreMobileMenu from '../../components/store/StoreMobileMenu'
import StoreSearchBar from '../../components/store/StoreSearchBar'
import { storeNavLinks } from '../../components/store/storeNavConfig'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import useAuth, { getHomePathForRole } from '../../hooks/useAuth'
import usePhoneViewport from '../../hooks/usePhoneViewport'
import { useCart } from '../../hooks/store/useCart'
import { useRequireCustomerAccount } from '../../hooks/store/useRequireCustomerAccount'
import { useCategories } from '../../hooks/store/useCategories'
import { useProducts } from '../../hooks/store/useProducts'
import {
  formatCurrency,
  getDefaultProductSize,
  getDisplayPrice,
  getPrimaryImageUrl,
  normalizePublicAssetUrl,
  productRequiresSizeChoice,
} from '../../utils/storefront'

const heroHighlights = [
  {
    title: 'Clean small-batch roasting',
    description: 'Single-origin beans and balanced house blends packed fresh each week.',
    icon: ShieldCheck,
  },
  {
    title: 'Fast Metro delivery',
    description: 'Reliable dispatch windows for brewing gear, beans, and refill orders.',
    icon: Truck,
  },
  {
    title: 'Cart-ready bundles',
    description: 'Build a starter order from the landing page before we restyle the rest.',
    icon: ShoppingBag,
  },
]

function getProductSummary(product, fallback) {
  return product?.short_description || product?.description || fallback
}

export default function StorefrontPage() {
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()
  const isPhoneViewport = usePhoneViewport()
  const featuredQuery = useProducts({ featured: true, perPage: 4, sort: 'popular' })
  const categoriesQuery = useCategories()
  const requireCustomerAccount = useRequireCustomerAccount()
  const {
    bounceKey,
    clearCart,
    closeCart,
    isLoading: isCartLoading,
    isOpen,
    isPending,
    itemCount,
    items,
    openCart,
    removeItem,
    subtotal,
    updateItem,
    addItem,
  } = useCart()
  const [quickSearch, setQuickSearch] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const featuredProducts = featuredQuery.data?.items ?? []
  const categories = categoriesQuery.data ?? []
  const heroProduct = featuredProducts[0] ?? null
  const heroImage = getPrimaryImageUrl(heroProduct) || heroArtwork
  const workspaceHref = role && role !== 'customer' ? getHomePathForRole(role) : null
  const actionLinks = workspaceHref
    ? [{ label: 'Workspace', to: workspaceHref, tone: 'secondary' }]
    : isAuthenticated
      ? [{ label: 'My Account', to: '/customer/orders', tone: 'secondary' }]
      : [
          { label: 'Sign In', to: '/login', tone: 'secondary' },
          { label: 'Create Account', to: '/register', tone: 'primary' },
        ]

  const handleQuickSearchSubmit = (event) => {
    event.preventDefault()

    const nextSearch = quickSearch.trim()

    if (!nextSearch) {
      navigate('/shop')
      return
    }

    navigate(`/shop?search=${encodeURIComponent(nextSearch)}`)
  }

  const handleAddToCart = async (product) => {
    if (!requireCustomerAccount()) {
      return
    }

    if (productRequiresSizeChoice(product)) {
      toast('Choose a size on the product page first.')
      navigate(`/products/${product.slug}`)
      return
    }

    try {
      await addItem(product, 1, getDefaultProductSize(product))
      toast.success('Added to bag.')
    } catch (error) {
      toast.error(error.message)
    }
  }

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
    <div className="min-h-screen bg-[#ebebeb] text-[#1a1a1a]">
      {isPhoneViewport ? (
        <StoreMobileMenu
          actionLinks={actionLinks}
          links={storeNavLinks}
          onClose={() => setIsMobileMenuOpen(false)}
          open={isMobileMenuOpen}
        />
      ) : null}

      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#111111]/95 shadow-[inset_0_-4px_0_0_#f5c842] backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-4 py-3.5 sm:px-8 lg:px-12 lg:py-5">
          <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center xl:gap-6">
            <div className="flex items-center justify-between gap-4 xl:min-w-[220px]">
            <Link className="shrink-0" to="/">
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#f5c842]">DISKR3T</div>
              <div className="text-[1.7rem] font-extrabold tracking-[0.04em] text-white sm:text-[1.95rem]">
                DISKR3T
              </div>
            </Link>

            {isPhoneViewport ? (
              <button
                aria-label="Open storefront menu"
                className="first-light-inverse-button rounded-full px-4 py-3 text-sm font-bold"
                onClick={() => setIsMobileMenuOpen(true)}
                type="button"
              >
                <Menu className="h-4 w-4" />
                Menu
              </button>
            ) : null}
            </div>

            <nav className="hidden items-center justify-center gap-6 text-sm font-semibold text-white/78 sm:flex">
              {storeNavLinks.map((link) => (
                link.to.startsWith('/#') ? (
                  <a className="transition hover:text-white" href={link.to.slice(1)} key={link.label}>
                    {link.label}
                  </a>
                ) : (
                  <Link className="transition hover:text-white" key={link.label} to={link.to}>
                    {link.label}
                  </Link>
                )
              ))}
            </nav>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:min-w-[560px]">
              <StoreSearchBar
                appearance="dark"
                className="w-full sm:flex-1 xl:w-[380px] xl:flex-none"
                onNavigate={() => setIsMobileMenuOpen(false)}
              />

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  aria-controls="cart-drawer"
                  aria-expanded={isOpen}
                  aria-haspopup="dialog"
                  aria-label={`Open bag with ${itemCount} item${itemCount === 1 ? '' : 's'}`}
                  key={`bag-trigger-${bounceKey}`}
                  className="first-light-inverse-button rounded-full px-4 py-3 text-sm font-bold animate-[cartPop_320ms_cubic-bezier(0.16,1,0.3,1)]"
                  onClick={openCart}
                  type="button"
                >
                  Bag {itemCount}
                </button>

                {workspaceHref ? (
                  <Link className="first-light-outline-button rounded-full px-4 py-3 text-sm font-bold" to={workspaceHref}>
                    Workspace
                  </Link>
                ) : isAuthenticated ? (
                  <Link className="first-light-outline-button rounded-full px-4 py-3 text-sm font-bold" to="/customer/orders">
                    Account
                  </Link>
                ) : (
                  <>
                    <Link className="first-light-inverse-button rounded-full px-4 py-3 text-sm font-bold" to="/login">
                      Sign In
                    </Link>
                    <Link className="first-light-accent-button hidden rounded-full px-4 py-3 text-sm font-bold sm:inline-flex" to="/register">
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="first-light-dark-shell rounded-[32px] px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
            <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
              Test Landing Palette
            </span>

            <h1 className="mt-6 max-w-[12ch] text-4xl font-extrabold leading-[1.02] sm:text-5xl lg:text-[3.9rem]">
              Dark header, clean cards, strong coffee contrast.
            </h1>
            <div className="mt-4 h-1 w-24 rounded-full bg-[#f5c842]" />

            <p className="mt-6 max-w-[34rem] text-base leading-8 text-white/76 sm:text-lg">
              This landing page now follows the near-black, muted-gold, white-card direction you specified. It is isolated here first so you can validate the visual system before we extend it to the rest of the storefront.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="first-light-accent-button rounded-full px-6 py-3 text-sm font-bold"
                to="/shop"
              >
                Browse Menu
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
                href="#featured"
              >
                View Featured
              </a>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {heroHighlights.map((item) => {
                const Icon = item.icon

                return (
                  <article
                    className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm"
                    key={item.title}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5c842] text-[#1a1a1a]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 text-sm font-bold text-white">{item.title}</div>
                    <p className="mt-2 text-sm leading-7 text-white/70">{item.description}</p>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="grid gap-6">
            <article className="first-light-shell-card overflow-hidden rounded-[32px]">
              <div className="aspect-[4/3] bg-[#f4f4f4]">
                <img
                  alt={heroProduct?.name || 'DISKR3T featured coffee'}
                  className="h-full w-full object-cover"
                  src={heroImage}
                />
              </div>

              <div className="p-6 sm:p-7">
                <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                  Featured Pour
                </span>

                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-[#1a1a1a]">
                      {heroProduct?.name || 'House Espresso Blend'}
                    </h2>
                    <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
                  </div>
                  <div className="text-right text-xl font-extrabold text-[#1a1a1a]">
                    {formatCurrency(getDisplayPrice(heroProduct))}
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-[#555555]">
                  {getProductSummary(
                    heroProduct,
                    'Balanced cocoa depth, smooth body, and a clean finish built for espresso or a slow morning pour-over.',
                  )}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="first-light-accent-button rounded-full px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!heroProduct}
                    onClick={() => handleAddToCart(heroProduct)}
                    type="button"
                  >
                    {productRequiresSizeChoice(heroProduct) ? 'Choose Size' : 'Add to Cart'}
                  </button>
                  <Link
                    className="rounded-full border border-[#e0e0e0] px-5 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f6f6f6]"
                    to={heroProduct ? `/products/${heroProduct.slug}` : '/shop'}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </article>

            <article className="first-light-shell-card rounded-[32px] p-6 sm:p-7">
              <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                Quick Find
              </span>
              <h2 className="mt-4 text-2xl font-extrabold text-[#1a1a1a]">Search inside a white form card</h2>
              <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
              <p className="mt-4 text-sm leading-7 text-[#555555]">
                This secondary card tests the light surface, subtle border, soft shadow, and yellow action styling before we roll the pattern across auth and checkout.
              </p>
              <form className="mt-6 space-y-3" onSubmit={handleQuickSearchSubmit}>
                <input
                  aria-label="Search products from the quick find card"
                  className="first-light-field text-sm"
                  onChange={(event) => setQuickSearch(event.target.value)}
                  placeholder="Try: arabica, mug, dripper"
                  value={quickSearch}
                />
                <button
                  className="first-light-accent-button w-full rounded-2xl px-5 py-3 text-sm font-bold"
                  type="submit"
                >
                  Search Products
                </button>
              </form>
            </article>
          </div>
        </section>

        <section className="first-light-shell-card mt-8 rounded-[32px] px-6 py-7 sm:px-8" id="featured">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                Featured
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-[#1a1a1a]">White product cards with muted-gold actions</h2>
              <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
            </div>

            <Link className="text-sm font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4" to="/shop?featured=true">
              See all featured items
            </Link>
          </div>

          {featuredQuery.isLoading ? (
            <div className="mt-6 flex items-center justify-center py-10">
              <Spinner className="h-12 w-12" />
            </div>
          ) : featuredQuery.isError ? (
            <div className="mt-6">
              <ErrorState
                description="Featured products did not load. Retry the request to validate this landing-page treatment."
                onAction={featuredQuery.refetch}
                title="Unable to load featured products."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <article
                  className="first-light-shell-card flex h-full flex-col overflow-hidden rounded-[28px] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.1)]"
                  key={product.id || product.slug}
                >
                  <Link className="block bg-[#f4f4f4]" to={`/products/${product.slug}`}>
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                        src={getPrimaryImageUrl(product) || heroArtwork}
                      />
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                      {product.category?.name || 'Coffee'}
                    </span>
                    <h3 className="mt-4 min-h-[4.5rem] text-xl font-extrabold text-[#1a1a1a]">
                      {product.name}
                    </h3>
                    <div className="mt-3 h-1 w-14 rounded-full bg-[#f5c842]" />
                    <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#555555]">
                      {getProductSummary(product, 'Smooth roast profile with a clean finish and balanced body.')}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <div className="text-lg font-extrabold text-[#1a1a1a]">
                        {formatCurrency(getDisplayPrice(product))}
                      </div>
                      <button
                        className="first-light-accent-button rounded-full px-4 py-2 text-sm font-bold"
                        onClick={() => handleAddToCart(product)}
                        type="button"
                      >
                        {productRequiresSizeChoice(product) ? 'Choose Size' : 'Add'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="first-light-shell-card mt-8 rounded-[32px] px-6 py-7 sm:px-8" id="categories">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                Categories
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-[#1a1a1a]">Category tiles on a light content field</h2>
              <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
            </div>

            <p className="max-w-[36rem] text-sm leading-7 text-[#555555]">
              The section below tests the same palette on browse cards: white surfaces, subtle borders, high-contrast typography, and yellow labels that sit above each title.
            </p>
          </div>

          {categoriesQuery.isLoading ? (
            <div className="mt-6 flex items-center justify-center py-10">
              <Spinner className="h-12 w-12" />
            </div>
          ) : categoriesQuery.isError ? (
            <div className="mt-6">
              <ErrorState
                description="Categories did not load. Retry the request to keep testing the new landing-page treatment."
                onAction={categoriesQuery.refetch}
                title="Unable to load categories."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => (
                <Link
                  className="first-light-shell-card group overflow-hidden rounded-[28px] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(0,0,0,0.1)]"
                  key={category.id || category.slug}
                  to={`/shop?category=${category.slug}`}
                >
                  <div className="flex h-48 items-center justify-center overflow-hidden bg-[#f4f4f4]">
                    {category.image_url ? (
                      <img
                        alt={category.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        src={normalizePublicAssetUrl(category.image_url)}
                      />
                    ) : (
                      <div className="px-6 text-center text-3xl font-extrabold text-[#1a1a1a]">
                        {category.name}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                      {category.product_count || 0} products
                    </span>
                    <h3 className="mt-4 text-2xl font-extrabold text-[#1a1a1a]">{category.name}</h3>
                    <div className="mt-3 h-1 w-14 rounded-full bg-[#f5c842]" />
                    <p className="mt-4 text-sm leading-7 text-[#555555]">
                      {category.description || 'Browse this collection inside the updated storefront.'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <CartButton count={itemCount} isOpen={isOpen} key={`cart-button-${bounceKey}`} onClick={openCart} />
      <CartDrawer
        isLoading={isCartLoading}
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
