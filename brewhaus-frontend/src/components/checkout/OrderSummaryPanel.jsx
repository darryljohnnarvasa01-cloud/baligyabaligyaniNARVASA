import { CreditCard, MapPin, ShieldCheck, TicketPercent, Truck } from 'lucide-react'
import PlaceOrderButton from './PlaceOrderButton'
import { getPaymentMethodMeta } from '../../utils/checkout'
import { formatCurrency } from '../../utils/storefront'

/**
 * // [CODEX] React e-commerce component: OrderSummaryPanel
 * // Uses: checkout cart state, PlaceOrderButton, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the sticky order summary, coupon application state, totals, and the final place-order action.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function OrderSummaryPanel({
  appliedCoupon,
  couponCode,
  discountAmount,
  freeShippingGap = 0,
  isApplyingCoupon,
  isPlacing,
  items,
  onApplyCoupon,
  onCouponChange,
  onPlaceOrder,
  paymentMethod,
  selectedAddress = null,
  shippingFee,
  subtotal,
  totalAmount,
}) {
  const paymentMeta = getPaymentMethodMeta(paymentMethod)
  const totalUnits = items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
  const hasFreeShipping = Number(freeShippingGap || 0) <= 0
  const addressSummary = selectedAddress
    ? `${selectedAddress.label}${selectedAddress.city ? `, ${selectedAddress.city}` : ''}`
    : 'Select address'
  const addressDetail = selectedAddress
    ? selectedAddress.full_address || selectedAddress.recipient_name
    : 'Choose where the order should be delivered.'

  return (
    <aside className="relative overflow-hidden rounded-[36px] border border-[rgba(200,157,52,0.55)] bg-[linear-gradient(180deg,#241b12_0%,#1b140d_52%,#15100a_100%)] p-6 text-white shadow-[0_28px_70px_rgba(0,0,0,0.24)] lg:sticky lg:top-28 lg:p-7">
      <div className="pointer-events-none absolute -right-20 top-0 h-44 w-44 rounded-full bg-[rgba(245,200,66,0.16)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[#f0b548]/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-[rgba(245,200,66,0.3)] bg-[rgba(245,200,66,0.12)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f5d679]">
              Checkout Summary
            </div>
            <h2 className="mt-4 font-display text-[34px] font-bold italic leading-none text-white">Ready to place</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
              Delivery, payment, and final charge stay visible here while you finish the order.
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.08)] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.55)]">Bag Units</div>
            <div className="mt-1 font-mono text-2xl text-[#f5c842]">{totalUnits}</div>
          </div>
        </div>

        <div className="mt-5 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.07)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.55)]">Estimated Charge</div>
              <div className="mt-2 font-display text-[34px] font-bold italic leading-none text-white">
                {formatCurrency(totalAmount)}
              </div>
            </div>

            <div className="rounded-full border border-[rgba(245,200,66,0.28)] bg-[rgba(245,200,66,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5d679]">
              {paymentMeta.shortLabel}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.12)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.45)]">Subtotal</div>
              <div className="mt-2 font-mono text-sm text-[#f5c842]">{formatCurrency(subtotal)}</div>
            </div>
            <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.12)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.45)]">Shipping</div>
              <div className="mt-2 font-mono text-sm text-[#f5c842]">{formatCurrency(shippingFee)}</div>
            </div>
            <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.12)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.45)]">Discount</div>
              <div className="mt-2 font-mono text-sm text-[#f5c842]">-{formatCurrency(discountAmount)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.07)] px-4 py-4 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[rgba(0,0,0,0.12)] text-[#f5d679]">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Deliver To</div>
                <div className="mt-1 text-sm font-semibold text-white">{addressSummary}</div>
                <div className="mt-1 text-sm leading-6 text-[rgba(255,255,255,0.68)]">{addressDetail}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.07)] px-4 py-4 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[rgba(0,0,0,0.12)] text-[#f5d679]">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Payment</div>
                <div className="mt-1 text-sm font-semibold text-white">{paymentMeta.label}</div>
                <div className="mt-1 text-sm leading-6 text-[rgba(255,255,255,0.68)]">{paymentMeta.customerNote}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.07)] px-4 py-4 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[rgba(0,0,0,0.12)] text-[#f5d679]">
                <Truck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Shipping</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {hasFreeShipping ? 'Free shipping unlocked' : `${formatCurrency(shippingFee)} delivery fee`}
                </div>
                <div className="mt-1 text-sm leading-6 text-[rgba(255,255,255,0.68)]">
                  {hasFreeShipping
                    ? 'This order already cleared the free shipping threshold.'
                    : `${formatCurrency(freeShippingGap)} more unlocks free shipping.`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.55)]">Bag Lines</div>
              <div className="mt-1 text-sm text-[rgba(255,255,255,0.65)]">{items.length} products in this order</div>
            </div>
            <div className="rounded-full border border-white/10 bg-[rgba(0,0,0,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.55)]">
              Scrollable
            </div>
          </div>

          <div className="mt-4 max-h-[240px] space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                className="flex items-start justify-between gap-4 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.14)] px-4 py-4"
                key={item.id || item.product_id}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{item.name}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.45)]">
                    Qty {item.qty}
                    {item.selected_size ? ` • Size ${item.selected_size}` : ''}
                  </div>
                </div>
                <div className="shrink-0 font-mono text-sm text-[#f5c842]">{formatCurrency(item.line_subtotal)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[rgba(0,0,0,0.12)] text-[#f5d679]">
              <TicketPercent className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.55)]">Coupon</div>
              <div className="mt-1 text-sm text-[rgba(255,255,255,0.68)]">Apply any active promo before confirming.</div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <input
              aria-label="Coupon code"
              className="min-h-[48px] flex-1 rounded-[16px] border border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.16)] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-[rgba(245,200,66,0.45)] focus:bg-black/20 focus:ring-2 focus:ring-[rgba(245,200,66,0.15)]"
              onChange={(event) => onCouponChange(event.target.value)}
              placeholder="Coupon code"
              value={couponCode}
            />
            <button
              className="first-light-accent-button min-w-[98px] rounded-[16px] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
              disabled={isApplyingCoupon || !couponCode.trim()}
              onClick={onApplyCoupon}
              type="button"
            >
              {isApplyingCoupon ? 'Applying' : 'Apply'}
            </button>
          </div>

          {appliedCoupon ? (
            <div className="mt-4 rounded-[18px] border border-[rgba(26,122,74,0.35)] bg-[rgba(26,122,74,0.16)] px-4 py-4 text-sm text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[#8de3b5]">Applied Coupon</div>
                  <div className="mt-1 font-mono text-base text-[#f5c842]">{appliedCoupon.coupon.code}</div>
                </div>
                <div className="text-right text-white/70">
                  {appliedCoupon.coupon.type === 'percent'
                    ? `${Number(appliedCoupon.coupon.value || 0)}% off`
                    : `${formatCurrency(appliedCoupon.coupon.value)} off`}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.07)] px-4 py-4 text-sm text-white/70 backdrop-blur">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8de3b5]" />
            <div>
              Payment follows the existing checkout flow. Your delivery details stay on this page until you confirm the
              order.
            </div>
          </div>
        </div>

        <div className="mt-6">
          <PlaceOrderButton disabled={items.length === 0} isPending={isPlacing} onClick={onPlaceOrder} />
        </div>

        <div className="mt-4 text-[11px] italic text-white/45">
          By placing your order you agree to our Terms of Service.
        </div>
      </div>
    </aside>
  )
}
