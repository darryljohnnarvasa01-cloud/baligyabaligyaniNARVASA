import { ShoppingBag } from 'lucide-react'

/**
 * // [CODEX] React e-commerce component: CartButton
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: opens the cart drawer and shows the current item count in a fixed floating button.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function CartButton({ count, isOpen = false, onClick }) {
  return (
    <button
      aria-controls="cart-drawer"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={`Open bag with ${count} item${count === 1 ? '' : 's'}`}
      className="brewhaus-gold-button fixed bottom-5 right-5 z-40 flex h-[62px] w-[62px] items-center justify-center rounded-[20px] p-0 shadow-[0_18px_38px_rgba(0,0,0,0.26)] transition-all duration-150 animate-[cartPop_320ms_cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 sm:bottom-8 sm:right-8"
      onClick={onClick}
      type="button"
    >
      <ShoppingBag className="h-6 w-6" />
      <span className="absolute -right-1 -top-1 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full border border-white/10 bg-[#1a1a1a] px-1 text-[10px] font-medium text-white animate-[cartBadgePop_360ms_cubic-bezier(0.16,1,0.3,1)]">
        {count}
      </span>
    </button>
  )
}
