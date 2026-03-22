import { FREE_SHIPPING_THRESHOLD } from '../../utils/checkout'
import { formatCurrency } from '../../utils/storefront'

/**
 * // [CODEX] React e-commerce component: ShippingEstimate
 * // Uses: checkout subtotal state, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: previews the shipping rule used by checkout and reinforces the free-shipping threshold.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function ShippingEstimate({ shippingFee, subtotal }) {
  const amount = Number(subtotal || 0)
  const qualifiesForFreeShipping = amount >= FREE_SHIPPING_THRESHOLD
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - amount)
  const progress = Math.min(100, Math.round((amount / FREE_SHIPPING_THRESHOLD) * 100))

  return (
    <div className="rounded-[28px] border border-[#ddcfaa] bg-[linear-gradient(135deg,#fff8e8_0%,#ffffff_55%,#f7eed0_100%)] px-5 py-5 shadow-[0_18px_38px_rgba(17,12,7,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full bg-[#1f1b15] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f5d679]">
            Shipping Estimate
          </div>
          <div className="mt-2 text-lg font-semibold text-ink">
            {qualifiesForFreeShipping
              ? 'Free shipping is active on this order.'
              : `${formatCurrency(remaining)} away from free shipping.`}
          </div>
          <div className="mt-2 text-sm leading-6 text-ink-3">
            {qualifiesForFreeShipping
              ? 'Delivery fee has been waived at checkout.'
              : `Spend ${formatCurrency(FREE_SHIPPING_THRESHOLD)} or more to remove the delivery fee.`}
          </div>
        </div>
        <div className="rounded-[18px] border border-[#d8c48b] bg-white px-4 py-3 text-right shadow-[0_10px_20px_rgba(178,123,13,0.08)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">Current Fee</div>
          <div className="mt-1 font-mono text-lg text-gold">{formatCurrency(shippingFee)}</div>
        </div>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/70 shadow-[inset_0_1px_2px_rgba(17,12,7,0.08)]">
        <div
          className={qualifiesForFreeShipping ? 'h-full rounded-full bg-live' : 'h-full rounded-full bg-[#c89d34]'}
          style={{ width: `${qualifiesForFreeShipping ? 100 : progress}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em] text-ink-4">
        <span>Cart {formatCurrency(amount)}</span>
        <span>Target {formatCurrency(FREE_SHIPPING_THRESHOLD)}</span>
      </div>
    </div>
  )
}
