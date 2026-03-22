import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import CategoryBar from '../../components/store/CategoryBar'
import ProductFilters from '../../components/store/ProductFilters'
import ProductGrid from '../../components/store/ProductGrid'
import StoreShell from '../../components/store/StoreShell'
import Spinner from '../../components/ui/Spinner'
import { useCart } from '../../hooks/store/useCart'
import { useCategories } from '../../hooks/store/useCategories'
import { useRequireCustomerAccount } from '../../hooks/store/useRequireCustomerAccount'
import { useProducts } from '../../hooks/store/useProducts'
import { getDefaultProductSize, productRequiresSizeChoice } from '../../utils/storefront'

function getBooleanParam(searchParams, key) {
  return searchParams.get(key) === 'true'
}

/**
 * // [CODEX] React e-commerce component: ShopPage
 * // Uses: useProducts, useCategories, useCart, ProductFilters, ProductGrid, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the public catalog grid with sidebar filters, horizontal categories, and pagination.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function ShopPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoriesQuery = useCategories()
  const { addItem } = useCart()
  const requireCustomerAccount = useRequireCustomerAccount()

  const filters = useMemo(
    () => ({
      category: searchParams.get('category') || '',
      search: searchParams.get('search') || '',
      sort: searchParams.get('sort') || 'newest',
      featured: getBooleanParam(searchParams, 'featured'),
      onSale: getBooleanParam(searchParams, 'on_sale'),
      page: Number(searchParams.get('page') || 1),
      perPage: 12,
    }),
    [searchParams],
  )

  const productsQuery = useProducts(filters)
  const products = productsQuery.data?.items ?? []
  const meta = productsQuery.data?.meta

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        value === false ||
        (key === 'page' && Number(value) <= 1)
      ) {
        next.delete(key)
        return
      }

      next.set(key, String(value))
    })

    setSearchParams(next)
  }

  const handleApplyFilters = (values) => {
    updateParams({
      category: values.category,
      search: values.search,
      sort: values.sort,
      featured: values.featured ? 'true' : '',
      on_sale: values.onSale ? 'true' : '',
      page: 1,
    })
  }

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const handleCategoryChange = (slug) => {
    updateParams({
      category: slug,
      page: 1,
    })
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

  return (
    <StoreShell variant="gold">
      <section className="overflow-hidden rounded-[34px] bg-white px-6 py-8 shadow-[0_18px_40px_rgba(0,0,0,0.08)] sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">Public Catalog</div>
            <h1 className="mt-4 text-4xl font-extrabold text-[#1a1a1a] sm:text-5xl">Shop the full range</h1>
            <div className="mt-3 h-1 w-20 rounded-full bg-[#f5c842]" />
            <p className="mt-4 max-w-[40rem] text-sm leading-8 text-[#555555]">
              Every active product is browsable here without auth. Filters, pagination, and public product pages now sit inside the updated landing-page palette for testing.
            </p>
          </div>

          <Link className="rounded-full border border-[#e0e0e0] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#f7f7f7]" to="/">
            Back to Storefront
          </Link>
        </div>
      </section>

      <section className="space-y-5">
        {categoriesQuery.isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner className="h-12 w-12" />
          </div>
        ) : (
          <CategoryBar
            activeSlug={filters.category}
            categories={categoriesQuery.data ?? []}
            onChange={handleCategoryChange}
            variant="gold"
          />
        )}

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <ProductFilters
            categories={categoriesQuery.data ?? []}
            filters={filters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            variant="gold"
          />

          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">Selection</div>
                <div className="mt-4 text-3xl font-extrabold text-[#1a1a1a] sm:text-4xl">
                  {meta?.total ?? 0} products in the catalog
                </div>
                <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
              </div>

              <div className="rounded-full border border-[#e0e0e0] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555] shadow-[0_10px_20px_rgba(0,0,0,0.05)]">
                Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1}
              </div>
            </div>

            <ProductGrid
              isError={productsQuery.isError}
              isLoading={productsQuery.isLoading}
              items={products}
              onAddToCart={handleAddToCart}
              onRetry={productsQuery.refetch}
              variant="shop"
              tone="gold"
            />

            {meta ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[#e0e0e0] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
                <div className="text-sm text-[#555555]">
                  Showing {meta.from ?? 0} to {meta.to ?? 0} of {meta.total ?? 0} products
                </div>

                <div className="flex gap-3">
                  <button
                    className="rounded-full border border-[#e0e0e0] bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={(meta.current_page ?? 1) <= 1}
                    onClick={() => updateParams({ page: (meta.current_page ?? 1) - 1 })}
                    type="button"
                  >
                    Previous
                  </button>

                  <button
                    className="first-light-accent-button rounded-full px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!meta.has_more_pages}
                    onClick={() => updateParams({ page: (meta.current_page ?? 1) + 1 })}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </StoreShell>
  )
}
