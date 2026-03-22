/**
 * // [CODEX] React e-commerce component: PlaceOrderButton
 * // Uses: checkout submit state, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the final checkout submission CTA with loading and disabled states.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function PlaceOrderButton({ disabled, isPending, onClick }) {
  return (
    <button
      className="first-light-accent-button flex w-full rounded-[20px] px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || isPending}
      onClick={onClick}
      type="button"
    >
      {isPending ? 'Placing Order' : 'Place Order'}
    </button>
  )
}
