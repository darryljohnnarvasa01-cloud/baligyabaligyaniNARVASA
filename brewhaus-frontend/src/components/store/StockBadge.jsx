const badgeMap = {
  in_stock: {
    label: 'In Stock',
    className: 'border-live/40 bg-live/10 text-live',
  },
  low_stock: {
    label: 'Low Stock',
    className: 'border-heat/40 bg-heat/10 text-heat',
  },
  out_of_stock: {
    label: 'Out of Stock',
    className: 'border-flame/40 bg-flame/10 text-flame',
  },
}

/**
 * // [CODEX] React e-commerce component: StockBadge
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: displays the current stock status using the store catalog contract values.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function StockBadge({ status }) {
  const state = badgeMap[status] || badgeMap.in_stock

  return (
    <div
      className={[
        'inline-flex items-center gap-2 rounded-[5px] border px-3 py-1 text-[11px] uppercase tracking-[0.16em]',
        state.className,
      ].join(' ')}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {state.label}
    </div>
  )
}
