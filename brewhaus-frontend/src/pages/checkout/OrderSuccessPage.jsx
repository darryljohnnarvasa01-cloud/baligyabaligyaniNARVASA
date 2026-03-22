import { useEffect } from 'react'
import { Check, ReceiptText } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import StoreShell from '../../components/store/StoreShell'
import ErrorState from '../../components/ui/ErrorState'
import { OrderOutcomeSkeleton } from '../../components/ui/SkeletonLayouts'
import useCheckout from '../../hooks/checkout/useCheckout'
import useAuth from '../../hooks/useAuth'
import { getPaymentMethodMeta } from '../../utils/checkout'
import { resetStoreCatalogQueries } from '../../utils/storeQueries'
import { formatCurrency } from '../../utils/storefront'

function formatLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

/**
 * // [CODEX] React e-commerce component: OrderSuccessPage
 * // Uses: useCheckout, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: confirms the order after checkout, shows payment details, and links the customer back into their account or the storefront.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderNumber = searchParams.get('order')
  const queryClient = useQueryClient()
  const { isAuthenticated, role } = useAuth()
  const { isOrderError, isOrderLoading, order, orderErrorMessage, refetchOrder } = useCheckout(orderNumber)

  useEffect(() => {
    if (!order?.order_number) {
      return
    }

    resetStoreCatalogQueries(queryClient)
  }, [order?.order_number, queryClient])

  if (!orderNumber) {
    return (
      <StoreShell>
        <ErrorState description="The success page is missing an order number." title="Order reference not found." />
      </StoreShell>
    )
  }

  if (!isAuthenticated) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-[720px]">
          <ErrorState
            description="Sign in again to load the order details after checkout."
            actionLabel="Go to Login"
            onAction={() => {
              window.location.assign('/login')
            }}
            title="Your session expired."
          />
        </div>
      </StoreShell>
    )
  }

  if (role !== 'customer') {
    return (
      <StoreShell>
        <div className="mx-auto max-w-[760px]">
          <ErrorState
            description="This order confirmation can only be loaded from the customer account that placed the order."
            actionLabel="Go to Login"
            onAction={() => {
              window.location.assign('/login')
            }}
            title="Customer account required."
          />
        </div>
      </StoreShell>
    )
  }

  if (isOrderLoading) {
    return (
      <StoreShell>
        <OrderOutcomeSkeleton />
      </StoreShell>
    )
  }

  if (isOrderError || !order) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-[760px]">
          <ErrorState
            description={orderErrorMessage || 'We could not load the order confirmation details. Retry once the payment redirect settles.'}
            onAction={refetchOrder}
            title="Unable to load the order."
          />
        </div>
      </StoreShell>
    )
  }

  const paymentMeta = getPaymentMethodMeta(order.payment_method)
  const isCodOrder = order.payment_method === 'cod'
  const onlinePaymentPending = order.payment_method !== 'cod' && order.payment_status !== 'paid'

  return (
    <StoreShell>
      <section className="mx-auto max-w-[760px]">
        <div className="midnight-surface rounded-[32px] px-6 py-10 text-center sm:px-10">
          <div className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full border border-live/35 bg-live/10 text-live shadow-[0_0_0_10px_rgba(78,143,114,0.06)]">
            <Check className="h-10 w-10" strokeWidth={2.2} />
          </div>

          <div className="mt-6 font-display text-5xl font-bold italic text-parchment">Order Confirmed!</div>
          <div className="mt-3 text-sm text-ash">Order #{order.order_number} has been placed.</div>
          <div className="mt-6 font-mono text-[32px] text-gold">{formatCurrency(order.total_amount)}</div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="rounded-full border border-smoke/55 bg-darkwood/72 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-ash">
              {paymentMeta.label}
            </div>
            <div className="rounded-full border border-live/35 bg-live/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-live">
              {formatLabel(order.payment_status)}
            </div>
            <div className="rounded-full border border-smoke/55 bg-darkwood/72 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-ash">
              {formatLabel(order.order_status)}
            </div>
          </div>

          {isCodOrder ? (
            <div className="mx-auto mt-6 max-w-[520px] rounded-[20px] border border-[rgba(201,168,76,0.26)] bg-[#212121] px-5 py-4 text-sm text-[#f5f5f5]">
              Cash on Delivery selected. Prepare <span className="font-mono text-[#d4a843]">{formatCurrency(order.total_amount)}</span> for the rider when your order arrives. No online payment redirect is needed for this order.
            </div>
          ) : null}

          {onlinePaymentPending ? (
            <div className="mx-auto mt-6 max-w-[520px] rounded-[20px] border border-heat/35 bg-heat/8 px-5 py-4 text-sm text-heat">
              Payment is still being verified by PayMongo. Refresh this page if the status does not update after a moment.
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="midnight-ember-button px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em]"
              to={`/customer/orders/${encodeURIComponent(order.order_number)}`}
            >
              <ReceiptText className="h-4 w-4" />
              Track Your Order
            </Link>
            <Link className="midnight-ghost-button px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em]" to="/shop">
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    </StoreShell>
  )
}
