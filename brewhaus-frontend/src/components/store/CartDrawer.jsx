import { useRef } from 'react'
import { Dialog } from '@headlessui/react'
import { ShoppingBag, X } from 'lucide-react'
import Spinner from '../ui/Spinner'
import CartItem from './CartItem'
import CartSummary from './CartSummary'

/**
 * // [CODEX] React e-commerce component: CartDrawer
 * // Uses: CartItem, CartSummary, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: slides in from the right to show the active server-synced cart.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function CartDrawer({
  isLoading,
  isOpen,
  isPending,
  itemCount,
  items,
  onClear,
  onClose,
  onProceed,
  onRemove,
  onUpdateQty,
  subtotal,
}) {
  const closeButtonRef = useRef(null)

  return (
    <Dialog
      className="relative z-50"
      initialFocus={closeButtonRef}
      onClose={onClose}
      open={isOpen}
    >
      <div className="fixed inset-0 bg-[rgba(10,10,10,0.68)] backdrop-blur-[6px]" />

      <div className="fixed inset-0 flex justify-end">
        <Dialog.Panel
          className="flex h-full w-screen flex-col border-l border-[#3a3427] bg-[#1a1a1a] text-white shadow-[0_28px_80px_rgba(0,0,0,0.38)] transition duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:max-w-[440px]"
          id="cart-drawer"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#3a3427] px-5 py-5 sm:px-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,168,76,0.22)] bg-[#212121] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c9a84c]">
                <ShoppingBag className="h-3.5 w-3.5" />
                Bag Preview
              </div>
              <Dialog.Title className="mt-4 font-display text-[2rem] font-bold italic leading-none text-white">
                Your Bag
              </Dialog.Title>
              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#a0a0a0]">
                {itemCount} item(s) staged for checkout
              </div>
            </div>

            <button
              aria-label="Close bag preview"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#3a3427] bg-[#212121] text-[#a0a0a0] transition hover:border-[#c9a84c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.08),transparent_42%)] px-4 py-5 sm:px-5">
            {isLoading ? (
              <div className="flex min-h-full items-center justify-center py-12">
                <Spinner className="h-12 w-12" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-full items-center">
                <div className="w-full rounded-[30px] border border-[#3a3427] bg-[#212121] px-6 py-10 text-center shadow-[0_16px_32px_rgba(0,0,0,0.22)]">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(201,168,76,0.28)] bg-[#1a1a1a] text-[#c9a84c]">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c9a84c]">
                    Bag Is Waiting
                  </div>
                  <div className="mt-3 font-display text-4xl font-bold italic text-white">
                    Your cart is empty.
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#a0a0a0]">
                    Build your next brew with beans, gear, and bundles before heading to checkout.
                  </p>
                  <button
                    className="brewhaus-gold-button mt-6 w-full px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em]"
                    onClick={onClose}
                    type="button"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <CartItem
                    item={item}
                    isPending={isPending}
                    key={item.id}
                    onRemove={onRemove}
                    onUpdateQty={onUpdateQty}
                  />
                ))}
              </div>
            )}
          </div>

          <CartSummary
            isDisabled={items.length === 0}
            isPending={isPending}
            itemCount={itemCount}
            onClear={onClear}
            onContinue={onClose}
            onProceed={onProceed}
            subtotal={subtotal}
          />
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
