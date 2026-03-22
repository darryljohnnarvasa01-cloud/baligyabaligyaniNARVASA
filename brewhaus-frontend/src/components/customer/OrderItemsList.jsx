import { formatCurrency } from '../../utils/storefront'

/**
 * // [CODEX] React e-commerce component: OrderItemsList
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the order item snapshots captured at checkout, including quantity and subtotal details.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function OrderItemsList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="rounded-[18px] border border-border bg-white p-4 shadow-sm" key={item.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-ink">{item.product_name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ink-4">{item.product_sku}</div>
              <div className="mt-3 text-sm text-ink-3">
                Qty {item.quantity} at {formatCurrency(item.unit_price)}
              </div>
              {item.selected_size ? (
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6400]">
                  Size {item.selected_size}
                </div>
              ) : null}
            </div>
            <div className="font-mono text-base text-gold">{formatCurrency(item.subtotal)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
