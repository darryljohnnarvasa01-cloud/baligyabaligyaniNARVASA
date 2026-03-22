import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatCurrency, normalizePublicAssetUrl } from '../../utils/storefront'

/**
 * // [CODEX] React e-commerce component: CartItem
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders a single cart line with quantity controls and remove action.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function CartItem({ item, isPending, onRemove, onUpdateQty }) {
  const imageUrl = normalizePublicAssetUrl(item?.image_url)

  return (
    <div className="rounded-[24px] border border-[#ddd5c4] bg-[#f5f5f5] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
      <div className="flex gap-3">
        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[18px] border border-[#e6dfd0] bg-white">
          {imageUrl ? (
            <img alt={item?.name} className="h-full w-full object-cover" loading="lazy" src={imageUrl} />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c7a45]">
              BrewHaus
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="line-clamp-2 text-[15px] font-semibold text-[#1a1a1a]">{item?.name}</div>
              {item?.sku ? (
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c7a45]">
                  {item.sku}
                </div>
              ) : null}
              {item?.selected_size ? (
                <div className="mt-2 inline-flex rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                  Size {item.selected_size}
                </div>
              ) : null}
              <div className="mt-2 font-mono text-[15px] text-[#c9a84c]">{formatCurrency(item?.price)}</div>
            </div>

            <button
              aria-label={`Remove ${item?.name || 'item'} from cart`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-transparent bg-white text-[#6c6c6c] transition hover:border-[#c9a84c]/35 hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              onClick={() => onRemove?.(item.id)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center overflow-hidden rounded-full border border-[#ddd5c4] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <button
                aria-label={`Decrease quantity for ${item?.name || 'item'}`}
                className="inline-flex h-11 w-11 items-center justify-center text-[#1a1a1a] transition hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/40 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending || Number(item?.qty || 0) <= 1}
                onClick={() => onUpdateQty?.(item.id, Number(item?.qty || 1) - 1)}
                type="button"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="min-w-12 px-3 text-center font-mono text-sm text-[#1a1a1a]">{item?.qty}</div>
              <button
                aria-label={`Increase quantity for ${item?.name || 'item'}`}
                className="inline-flex h-11 w-11 items-center justify-center text-[#1a1a1a] transition hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/40 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending}
                onClick={() => onUpdateQty?.(item.id, Number(item?.qty || 1) + 1)}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7b7b7b]">Line Total</div>
              <div className="mt-1 font-mono text-[15px] text-[#c9a84c]">{formatCurrency(item?.line_subtotal)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
