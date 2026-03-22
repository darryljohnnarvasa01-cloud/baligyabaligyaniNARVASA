import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import Spinner from '../ui/Spinner'
import ProductCard from './ProductCard'

const variantClasses = {
  featured: 'sm:grid-cols-2 xl:grid-cols-4',
  shop: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  related: 'sm:grid-cols-2 xl:grid-cols-4',
}

/**
 * // [CODEX] React e-commerce component: ProductGrid
 * // Uses: ProductCard, EmptyState, ErrorState, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders catalog product cards and swaps in loading, empty, or error states as needed.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function ProductGrid({
  items,
  isLoading,
  isError,
  onRetry,
  onAddToCart,
  emptyTitle = 'No products matched.',
  emptyDescription = 'Try a broader search or a different category.',
  variant = 'shop',
  tone = 'default',
}) {
  const gridClassName = variantClasses[variant] || variantClasses.shop
  const isGold = tone === 'gold'

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        description="The catalog request failed. Retry the query and the grid will repopulate."
        onAction={onRetry}
        title="Unable to load products."
      />
    )
  }

  if (!items?.length) {
    return (
      <EmptyState
        description={emptyDescription}
        descriptionClassName={isGold ? 'font-sans text-[#555555]' : 'font-sans italic text-ink-3'}
        title={emptyTitle}
        titleClassName={isGold ? 'text-3xl font-extrabold text-[#1a1a1a]' : 'font-display text-3xl italic text-ink'}
      />
    )
  }

  return (
    <div className={`grid gap-3 sm:gap-5 ${gridClassName}`}>
      {items.map((product, index) => (
        <div
          className="h-full"
          key={product.id || product.slug}
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <ProductCard onAddToCart={onAddToCart} product={product} tone={tone} />
        </div>
      ))}
    </div>
  )
}
