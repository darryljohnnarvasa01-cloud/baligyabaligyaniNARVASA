import { formatCurrency } from '../../utils/storefront'

/**
 * // [CODEX] React e-commerce component: CartSummary
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the sticky cart subtotal area and storefront checkout actions.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function CartSummary({
  itemCount,
  subtotal,
  isPending,
  isDisabled,
  onClear,
  onContinue,
  onProceed,
}) {
  return (
    <div className="space-y-5 border-t border-[#3a3427] bg-[#212121] px-5 pb-6 pt-5 text-white sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0]">Bag Subtotal</div>
          <div className="mt-1 text-sm text-[#a0a0a0]">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0]">Total</div>
          <div className="mt-1 font-mono text-[24px] text-[#d4a843]">{formatCurrency(subtotal)}</div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[rgba(201,168,76,0.16)] bg-[#1a1a1a] px-4 py-3 text-[12px] leading-6 text-[#a0a0a0]">
        Shipping, delivery notes, and payment are finalized on the next step.
      </div>

      <div className="space-y-3">
        <button
          className="brewhaus-gold-button w-full px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled || isPending}
          onClick={onProceed}
          type="button"
        >
          View Bag / Checkout
        </button>

        <button
          className="brewhaus-outline-button w-full px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em]"
          onClick={onContinue}
          type="button"
        >
          Keep Browsing
        </button>

        {itemCount > 0 ? (
          <button
            className="w-full text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#212121]"
            disabled={isPending}
            onClick={onClear}
            type="button"
          >
            Clear Bag
          </button>
        ) : null}
      </div>
    </div>
  )
}
