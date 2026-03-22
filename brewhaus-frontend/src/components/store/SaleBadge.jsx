/**
 * // [CODEX] React e-commerce component: SaleBadge
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders an ember promotional chip when a product is on sale.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function SaleBadge({ percentage }) {
  if (!percentage) {
    return null
  }

  return (
    <div className="rounded-[5px] bg-ember px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white shadow-sm">
      -{percentage}% Off
    </div>
  )
}
