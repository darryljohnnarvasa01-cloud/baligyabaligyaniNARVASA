import {
  BadgePercent,
  Package,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import ProductGrid from '../../components/store/ProductGrid'
import ProductImageGallery from '../../components/store/ProductImageGallery'
import StockBadge from '../../components/store/StockBadge'
import StoreShell from '../../components/store/StoreShell'
import ErrorState from '../../components/ui/ErrorState'
import { ProductPageSkeleton } from '../../components/ui/SkeletonLayouts'
import { useCart } from '../../hooks/store/useCart'
import { useRequireCustomerAccount } from '../../hooks/store/useRequireCustomerAccount'
import { useProduct } from '../../hooks/store/useProduct'
import { formatCurrency, getDisplayPrice } from '../../utils/storefront'

const FREE_SHIPPING_THRESHOLD = 999

function clampQuantity(value, max) {
  return Math.max(1, Math.min(Number(value || 1), max))
}

function splitProductHighlights(value) {
  return String(value || '')
    .split(/\r?\n|\||\u2022/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function getLeadSentence(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return ''
  }

  const match = normalized.match(/.*?[.!?](?=\s|$)/)

  return (match?.[0] || normalized).trim()
}

function formatSpecLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function formatSpecValue(value) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ')

  if (!normalized) {
    return ''
  }

  const lower = normalized.toLowerCase()

  if (lower === 'one-size-fits-all' || lower === 'one size fits all') {
    return 'One size fits most'
  }

  if (lower === 'snap back closure') {
    return 'Snapback closure'
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function normalizeSizeOption(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function parseProductSpecs(value) {
  return splitProductHighlights(value).map((line, index) => {
    const match = line.match(/^([^:]{2,24}):\s*(.+)$/)

    if (!match) {
      return {
        id: `${index}-${line}`,
        label: null,
        value: formatSpecValue(line),
      }
    }

    return {
      id: `${index}-${match[1]}-${match[2]}`,
      label: formatSpecLabel(match[1]),
      value: formatSpecValue(match[2]),
    }
  })
}

function getPrimarySummary(product, specs) {
  const shortDescription = String(product?.short_description || '').trim()
  const descriptionLead = getLeadSentence(product?.description)
  const shortLooksStructured = specs.length > 1 || specs.some((spec) => spec.label)
  const shortLooksThin = shortDescription.length > 0 && shortDescription.length < 18

  if ((shortLooksStructured || shortLooksThin) && descriptionLead) {
    return descriptionLead
  }

  return shortDescription || descriptionLead || 'Product details coming soon.'
}

function deriveSizeProfile(product, specs) {
  const sourceText = [product?.short_description, product?.description].filter(Boolean).join('\n')
  const sourceTextLower = sourceText.toLowerCase()
  const categoryText = `${product?.category?.slug || ''} ${product?.category?.name || ''}`.toLowerCase()
  const sizeOptions = Array.isArray(product?.size_options)
    ? product.size_options.map(normalizeSizeOption).filter(Boolean)
    : []
  const sizeSpec = specs.find((spec) => spec.label && /size/i.test(spec.label))
  const fitSpec = specs.find((spec) => spec.label && /fit/i.test(spec.label))
  const colorSpec = specs.find((spec) => spec.label && /color/i.test(spec.label))
  const unitMatch = String(product?.name || '').match(/\b(\d+(?:\.\d+)?)\s*(kg|g|ml|oz|l)\b/i)
  const oneSizeMatch = sourceText.match(/\bone[- ]size(?:[- ]fits[- ]all)?\b/i)
  const adjustableMatch = sourceText.match(
    /\b(adjustable [^.\n,;]+|snap ?back closure|snap closure|drawstring [^.\n,;]+|hook[- ]and[- ]loop closure)\b/i,
  )

  const value =
    (sizeOptions.length > 1
      ? `${sizeOptions.length} sizes available`
      : sizeOptions[0] || null) ||
    sizeSpec?.value ||
    (oneSizeMatch ? 'One size fits most' : null) ||
    (product?.weight_grams ? `${product.weight_grams} g` : null) ||
    (unitMatch ? `${unitMatch[1]} ${unitMatch[2].toLowerCase()}` : null)

  const note = fitSpec?.value || (adjustableMatch ? formatSpecValue(adjustableMatch[1]) : null)
  const isApparel = /(^|\s)ap(\s|$)|apparel|shirt|cap|hat|tee|jacket|hoodie/.test(
    `${categoryText} ${sourceTextLower}`,
  )
  const helperText =
    note ||
    (value
      ? sizeOptions.length > 1
        ? 'Choose a size before adding this product to the bag.'
        : isApparel
        ? 'Sizing details surfaced from the product listing.'
        : 'This item is sold in a single listed format.'
      : null)

  return {
    label: isApparel ? 'Size & fit' : 'Size / format',
    value,
    note,
    helperText,
    color: colorSpec?.value || null,
    options: sizeOptions,
    requiresSelection: sizeOptions.length > 0,
    hasSizing: Boolean(value || note || colorSpec?.value),
  }
}

export default function ProductPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const productQuery = useProduct(slug)
  const { addItem } = useCart()
  const requireCustomerAccount = useRequireCustomerAccount()
  const [quantityState, setQuantityState] = useState({ slug: null, value: 1 })
  const [sizeSelectionState, setSizeSelectionState] = useState({ slug: null, value: '' })

  const product = productQuery.data?.product ?? null
  const relatedProducts = productQuery.data?.related_products ?? []
  const maxQuantity = useMemo(
    () => Math.max(1, Math.min(10, Number(product?.stock_quantity || 1))),
    [product?.stock_quantity],
  )
  const quantity = quantityState.slug === slug ? quantityState.value : 1
  const displayPrice = getDisplayPrice(product)
  const soldOut = product?.stock_status === 'out_of_stock'
  const hasSalePrice = product?.is_on_sale && Number(product?.price || 0) > Number(displayPrice || 0)
  const lineTotal = Number(displayPrice || 0) * quantity
  const freeShippingGap = Math.max(0, FREE_SHIPPING_THRESHOLD - lineTotal)
  const quickQuantityOptions = useMemo(() => {
    return Array.from(new Set([1, 2, 3, maxQuantity])).filter((value) => value <= maxQuantity)
  }, [maxQuantity])
  const productSpecs = useMemo(() => parseProductSpecs(product?.short_description), [product?.short_description])
  const productSummary = useMemo(() => getPrimarySummary(product, productSpecs), [product, productSpecs])
  const sizeProfile = useMemo(() => deriveSizeProfile(product, productSpecs), [product, productSpecs])
  const selectedSize = sizeSelectionState.slug === slug ? sizeSelectionState.value : ''
  const sizeOptionsKey = sizeProfile.options.join('||')
  const showStructuredHighlights = productSpecs.length > 1 || productSpecs.some((spec) => spec.label)
  const detailCards = useMemo(() => {
    const cards = [
      {
        icon: Sparkles,
        label: 'Category',
        value: product?.category?.name || 'Catalog',
      },
      {
        icon: ShoppingBag,
        label: 'SKU',
        value: product?.sku || 'No SKU listed',
        mono: true,
      },
    ]

    if (sizeProfile.value || sizeProfile.note) {
      cards.push({
        icon: Ruler,
        label: sizeProfile.label,
        value: sizeProfile.value || 'See fit notes',
        note: sizeProfile.note,
      })
    }

    if (sizeProfile.color) {
      cards.push({
        icon: Sparkles,
        label: 'Color',
        value: sizeProfile.color,
      })
    } else {
      cards.push({
        icon: Package,
        label: 'Weight',
        value: product?.weight_grams ? `${product.weight_grams} g` : 'Not specified',
      })
    }

    return cards
  }, [product, sizeProfile])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  useEffect(() => {
    setSizeSelectionState((current) => {
      if (!sizeProfile.requiresSelection) {
        return current.slug === slug && current.value === '' ? current : { slug, value: '' }
      }

      if (current.slug === slug && sizeProfile.options.includes(current.value)) {
        return current
      }

      return {
        slug,
        value: sizeProfile.options.length === 1 ? sizeProfile.options[0] : '',
      }
    })
  }, [sizeOptionsKey, sizeProfile.requiresSelection, slug])

  const handleAddToCart = async (
    targetProduct,
    nextQuantity = quantity,
    successMessage = 'Added to bag.',
  ) => {
    if (!targetProduct || targetProduct.stock_status === 'out_of_stock') {
      return false
    }

    const targetSizeOptions = Array.isArray(targetProduct?.size_options) ? targetProduct.size_options : []
    const resolvedSelectedSize = targetProduct?.slug === slug ? selectedSize : ''

    if (targetSizeOptions.length > 0 && !resolvedSelectedSize) {
      toast.error(
        targetProduct?.slug === slug
          ? 'Choose a size before adding this item to your bag.'
          : 'Open the product page to choose a size first.',
      )
      return false
    }

    if (!requireCustomerAccount()) {
      return false
    }

    try {
      await addItem(targetProduct, nextQuantity, resolvedSelectedSize || null)
      toast.success(successMessage)
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    }
  }

  const handleBuyNow = async () => {
    if (await handleAddToCart(product, quantity, 'Added to bag.')) {
      navigate('/checkout')
    }
  }

  if (productQuery.isLoading) {
    return (
      <StoreShell>
        <ProductPageSkeleton />
      </StoreShell>
    )
  }

  if (productQuery.isError || !product) {
    return (
      <StoreShell>
        <ErrorState
          description="The product page could not be loaded. Retry the request or return to the catalog."
          onAction={productQuery.refetch}
          title="Unable to load product."
        />
      </StoreShell>
    )
  }

  return (
    <StoreShell>
      <section className="grid gap-8 xl:grid-cols-[minmax(0,0.56fr)_minmax(340px,0.44fr)] xl:items-start">
        <div className="space-y-5 xl:sticky xl:top-28">
          <ProductImageGallery images={product.images} productName={product.name} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="first-light-shell-card rounded-[24px] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a7e58]">
                <Truck className="h-4 w-4" />
                Shipping
              </div>
              <div className="mt-3 text-sm leading-7 text-[#555555]">
                {freeShippingGap > 0
                  ? `${formatCurrency(freeShippingGap)} away from free shipping at this quantity.`
                  : 'Free shipping unlocked for this quantity.'}
              </div>
            </div>

            <div className="first-light-shell-card rounded-[24px] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a7e58]">
                <ShieldCheck className="h-4 w-4" />
                Checkout
              </div>
              <div className="mt-3 text-sm leading-7 text-[#555555]">
                Secure checkout with instant bag sync and account order tracking.
              </div>
            </div>

            <div className="first-light-shell-card rounded-[24px] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a7e58]">
                <Package className="h-4 w-4" />
                Stock
              </div>
              <div className="mt-3 text-sm leading-7 text-[#555555]">
                {soldOut
                  ? 'Currently sold out. Check back for the next restock.'
                  : product.stock_status === 'low_stock'
                    ? `Only ${product.stock_quantity} left in stock.`
                    : `${product.stock_quantity} units ready to ship.`}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-[11px] uppercase tracking-[0.26em] text-ink-4">
            <Link className="transition hover:text-ember" to="/shop">
              Shop
            </Link>
            {' / '}
            <Link className="transition hover:text-ember" to={`/shop?category=${product.category?.slug || ''}`}>
              {product.category?.name || 'Catalog'}
            </Link>
          </div>

          <section className="first-light-shell-card rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <StockBadge status={product.stock_status} />
              {hasSalePrice ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ecd18c] bg-[#fff7de] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a6400]">
                  <BadgePercent className="h-4 w-4" />
                  {product.sale_percentage || 0}% off
                </div>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-5xl font-bold italic text-ink sm:text-[56px]">
              {product.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#555555]">{productSummary}</p>

            {showStructuredHighlights ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {productSpecs.slice(0, 4).map((spec) => (
                  <div className="rounded-[18px] border border-[#eadfca] bg-[#fcfaf4] px-4 py-3" key={spec.id}>
                    {spec.label ? (
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6400]">
                        {spec.label}
                      </div>
                    ) : null}
                    <div className={spec.label ? 'mt-1 text-sm font-semibold text-[#1a1a1a]' : 'text-sm font-semibold text-[#1a1a1a]'}>
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-end gap-3">
              {hasSalePrice ? (
                <>
                  <div className="text-lg text-ash line-through">{formatCurrency(product.price)}</div>
                  <div className="font-mono text-[32px] text-gold">{formatCurrency(displayPrice)}</div>
                </>
              ) : (
                <div className="font-mono text-[32px] text-gold">{formatCurrency(displayPrice)}</div>
              )}
            </div>

            <div
              className={[
                'mt-6 grid gap-3',
                detailCards.length > 3 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3',
              ].join(' ')}
            >
              {detailCards.map((card) => {
                const Icon = card.icon

                return (
                  <div className="rounded-[22px] border border-border bg-[#fcfaf4] px-4 py-4" key={card.label}>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
                      <Icon className="h-4 w-4 text-[#8a6400]" />
                      {card.label}
                    </div>
                    <div
                      className={[
                        'mt-3 text-sm font-bold text-[#1a1a1a]',
                        card.mono ? 'break-all font-mono' : '',
                      ].join(' ')}
                    >
                      {card.value}
                    </div>
                    {card.note ? <div className="mt-2 text-sm leading-6 text-[#555555]">{card.note}</div> : null}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="first-light-shell-card rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                  Purchase setup
                </div>
                <div className="mt-2 text-lg font-bold text-[#1a1a1a]">
                  {sizeProfile.hasSizing
                    ? 'Confirm the fit, set quantity, and choose how to check out'
                    : 'Set quantity and choose how to check out'}
                </div>
              </div>

              <div className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                Total {formatCurrency(lineTotal)}
              </div>
            </div>

            {sizeProfile.hasSizing ? (
              <div className="mt-5 rounded-[24px] border border-[#eadfca] bg-[#fffaf0] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                      {sizeProfile.label}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sizeProfile.options.length > 0
                        ? sizeProfile.options.map((option) => {
                            const isSelected = selectedSize === option

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setSizeSelectionState({ slug, value: option })}
                                className={[
                                  'rounded-full border px-4 py-2 text-sm font-semibold transition',
                                  isSelected
                                    ? 'border-[#c89b2a] bg-[#fff4c6] text-[#8a6400]'
                                    : 'border-[#ddd5c4] bg-white text-[#5f5642] hover:border-[#c89b2a]',
                                ].join(' ')}
                              >
                                {option}
                              </button>
                            )
                          })
                        : sizeProfile.value ? (
                            <div className="rounded-full border border-[#c89b2a] bg-[#fff4c6] px-4 py-2 text-sm font-semibold text-[#8a6400]">
                              {sizeProfile.value}
                            </div>
                          ) : null}
                      {sizeProfile.color ? (
                        <div className="rounded-full border border-[#ddd5c4] bg-white px-4 py-2 text-sm font-semibold text-[#5f5642]">
                          Color: {sizeProfile.color}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {sizeProfile.helperText || (sizeProfile.requiresSelection && !selectedSize) ? (
                    <div className="max-w-[280px] text-sm leading-6 text-[#555555]">
                      {sizeProfile.requiresSelection && !selectedSize
                        ? 'Choose a size before adding this product to the bag.'
                        : sizeProfile.helperText}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {quickQuantityOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQuantityState({ slug, value })}
                  className={[
                    'rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition',
                    quantity === value
                      ? 'border-[#c89b2a] bg-[#f8e6a8] text-[#8a6400]'
                      : 'border-[#ddd5c4] bg-white text-[#5f5642] hover:border-[#c89b2a]',
                  ].join(' ')}
                >
                  Qty {value}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center overflow-hidden rounded-[10px] border border-border bg-white shadow-xs">
                <button
                  className="inline-flex h-12 w-12 items-center justify-center text-lg text-ink transition hover:bg-surface"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQuantityState((current) => ({
                      slug,
                      value: clampQuantity((current.slug === slug ? current.value : 1) - 1, maxQuantity),
                    }))
                  }
                  type="button"
                >
                  -
                </button>
                <div className="min-w-16 px-3 text-center font-mono text-gold">{quantity}</div>
                <button
                  className="inline-flex h-12 w-12 items-center justify-center text-lg text-ink transition hover:bg-surface"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantityState((current) => ({
                      slug,
                      value: clampQuantity((current.slug === slug ? current.value : 1) + 1, maxQuantity),
                    }))
                  }
                  type="button"
                >
                  +
                </button>
              </div>

              {product.stock_status === 'low_stock' ? (
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-heat">
                  Only {product.stock_quantity} left in stock
                </div>
              ) : null}

              {soldOut ? (
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-flame">
                  Sold out
                </div>
              ) : null}
            </div>

            <div className="mt-5 rounded-[24px] border border-border bg-[#fcfaf4] px-4 py-4 text-sm leading-7 text-[#555555]">
              {soldOut
                ? 'This item is currently unavailable. Browse related pieces below while this one is restocked.'
                : freeShippingGap > 0
                  ? `Add ${formatCurrency(freeShippingGap)} more to this bag for free shipping.`
                  : 'This quantity qualifies for free shipping.'}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className="midnight-ember-button flex w-full justify-center px-5 py-4 text-[11px] font-medium uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={soldOut}
                onClick={() => handleAddToCart(product)}
                type="button"
              >
                {soldOut ? 'Sold Out' : 'Add to Cart'}
              </button>

              <button
                className="midnight-ghost-button flex w-full justify-center px-5 py-4 text-[11px] font-medium uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={soldOut}
                onClick={handleBuyNow}
                type="button"
              >
                Buy Now
              </button>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="first-light-shell-card rounded-[30px] p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                About this item
              </div>
              <div className="mt-4 text-sm leading-8 text-[#555555]">{product.description}</div>
            </section>

            <div className="space-y-6">
              {product.tags?.length ? (
                <section className="first-light-shell-card rounded-[30px] p-6">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                    Tags
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <div
                        className="rounded-full border border-border bg-[#fcfaf4] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-ink-3"
                        key={tag.id || tag.slug}
                      >
                        {tag.name}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="first-light-shell-card rounded-[30px] p-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                  Good to know
                </div>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#555555]">
                  <div className="rounded-[22px] border border-border bg-[#fcfaf4] px-4 py-4">
                    Free shipping on orders over {formatCurrency(FREE_SHIPPING_THRESHOLD)}.
                  </div>
                  <div className="rounded-[22px] border border-border bg-[#fcfaf4] px-4 py-4">
                    Sign in to add items to your bag and keep order history in one account.
                  </div>
                  <div className="rounded-[22px] border border-border bg-[#fcfaf4] px-4 py-4">
                    Related recommendations below stay in the same category for faster browsing.
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="space-y-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Related products
          </div>
          <div className="font-display text-4xl font-bold italic text-ink">
            More from {product.category?.name || 'this collection'}
          </div>
          <ProductGrid
            isError={false}
            isLoading={false}
            items={relatedProducts}
            onAddToCart={handleAddToCart}
            variant="related"
          />
        </section>
      ) : null}
    </StoreShell>
  )
}
