import { Link } from 'react-router-dom'
import SaleBadge from './SaleBadge'
import StockBadge from './StockBadge'
import {
  formatCurrency,
  getCategoryName,
  getDisplayPrice,
  getPrimaryImageUrl,
  isLowStock,
  productRequiresSizeChoice,
} from '../../utils/storefront'

/**
 * // [CODEX] React e-commerce component: ProductCard
 * // Uses: SaleBadge, StockBadge, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: presents a catalog product card with sale, stock, and add-to-bag states.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function ProductCard({ product, onAddToCart, tone = 'default' }) {
  const imageUrl = getPrimaryImageUrl(product)
  const price = getDisplayPrice(product)
  const soldOut = product?.stock_status === 'out_of_stock'
  const lowStock = isLowStock(product)
  const isGold = tone === 'gold'
  const requiresSizeChoice = productRequiresSizeChoice(product)

  const handleAdd = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onAddToCart?.(product)
  }

  return (
    <article className={isGold ? 'group flex h-full flex-col overflow-hidden rounded-[22px] border border-[#e0e0e0] bg-white shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_18px_36px_rgba(0,0,0,0.1)] sm:rounded-[28px]' : 'group flex h-full flex-col overflow-hidden rounded-[14px] border border-border bg-white shadow-sm transition duration-200 hover:-translate-y-[2px] hover:border-border-strong hover:shadow-md'}>
      <div className={isGold ? 'relative overflow-hidden bg-[#f4f4f4]' : 'relative overflow-hidden bg-surface'}>
        <Link className="block" to={`/products/${product.slug}`}>
          <div className={isGold ? 'relative h-[148px] overflow-hidden bg-[#f4f4f4] sm:h-[220px]' : 'relative h-[220px] overflow-hidden bg-surface'}>
            {imageUrl ? (
              <img
                alt={product?.primary_image?.alt_text || product?.name}
                className={[
                  'h-full w-full object-cover transition duration-[350ms]',
                  soldOut ? 'scale-100 grayscale opacity-45' : 'group-hover:scale-105',
                ].join(' ')}
                loading="lazy"
                src={imageUrl}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <div className={isGold ? 'text-[11px] font-bold uppercase tracking-[0.24em] text-[#7a7a7a]' : 'text-[11px] uppercase tracking-[0.36em] text-ink-4'}>DISKR3T</div>
                  <div className={isGold ? 'mt-3 text-3xl font-extrabold text-[#1a1a1a]' : 'mt-3 font-display text-3xl italic text-ink'}>{product?.name}</div>
                </div>
              </div>
            )}

            {soldOut ? (
              <div className={isGold ? 'absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.84)]' : 'absolute inset-0 flex items-center justify-center bg-[rgba(249,249,248,0.88)]'}>
                <div className={isGold ? 'px-3 text-center text-lg font-extrabold text-[#1a1a1a] sm:text-2xl' : 'font-display text-3xl italic text-ink-3'}>Out of Stock</div>
              </div>
            ) : null}
          </div>
        </Link>

        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          <StockBadge status={product?.stock_status} />
        </div>

        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
          <SaleBadge percentage={product?.is_on_sale ? product?.sale_percentage : 0} />
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-3.5 sm:space-y-4 sm:p-5">
        <div className={isGold ? 'inline-flex max-w-full self-start rounded-full bg-[#f5c842] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#1a1a1a] sm:px-3 sm:text-[10px] sm:tracking-[0.18em]' : 'text-[10px] uppercase tracking-[0.28em] text-ink-4'}>{getCategoryName(product)}</div>

        <div className="flex-1 space-y-2.5 sm:space-y-3">
          <Link className="block" to={`/products/${product.slug}`}>
            <h3 className={isGold ? 'line-clamp-2 min-h-[2.8rem] text-[16px] font-extrabold leading-[1.2] text-[#1a1a1a] transition group-hover:text-[#000000] sm:min-h-[3.25rem] sm:text-[18px]' : 'line-clamp-2 min-h-[2.75rem] text-[15px] font-medium text-ink transition group-hover:text-ink-2'}>
              {product?.name}
            </h3>
          </Link>

          {isGold ? <div className="h-1 w-10 rounded-full bg-[#f5c842] sm:w-14" /> : null}

          <div className="flex flex-wrap items-end gap-2">
            {product?.is_on_sale ? (
              <>
                <div className={isGold ? 'text-[12px] text-[#8a8a8a] line-through sm:text-[13px]' : 'text-[13px] text-ash line-through'}>{formatCurrency(product?.price)}</div>
                <div className={isGold ? 'text-[16px] font-extrabold text-[#1a1a1a] sm:text-[18px]' : 'font-mono text-[18px] text-gold'}>{formatCurrency(price)}</div>
              </>
            ) : (
              <div className={isGold ? 'text-[16px] font-extrabold text-[#1a1a1a] sm:text-[18px]' : 'font-mono text-[18px] text-gold'}>{formatCurrency(price)}</div>
            )}
          </div>
        </div>

        {lowStock ? (
          <div className={isGold ? 'text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b5e00] sm:text-[11px] sm:tracking-[0.16em]' : 'text-[11px] uppercase tracking-[0.16em] text-heat'}>
            Only {product?.stock_quantity} left
          </div>
        ) : (
          <div className="h-[12px] sm:h-[14px]" />
        )}

        <button
          className={isGold ? 'first-light-accent-button w-full rounded-full px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3 sm:text-[11px] sm:tracking-[0.18em]' : 'midnight-ember-button w-full px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50'}
          disabled={soldOut}
          onClick={handleAdd}
          type="button"
        >
          <span className="sm:hidden">{requiresSizeChoice ? 'Size' : 'Add'}</span>
          <span className="hidden sm:inline">{requiresSizeChoice ? 'Choose Size' : 'Add to Cart'}</span>
        </button>
      </div>
    </article>
  )
}
