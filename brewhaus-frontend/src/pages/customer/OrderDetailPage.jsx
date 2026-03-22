import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, MapPin, Package, ReceiptText, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import OrderItemsList from '../../components/customer/OrderItemsList'
import OrderTracker from '../../components/customer/OrderTracker'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import { useCancelOrderMutation, useCustomerOrder } from '../../hooks/customer/useCustomerOrders'
import { getPaymentMethodMeta } from '../../utils/checkout'
import { formatCurrency, normalizePublicAssetUrl } from '../../utils/storefront'

function formatLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDateTime(value) {
  if (!value) {
    return 'Not available yet'
  }

  return new Date(value).toLocaleString()
}

/**
 * // [CODEX] React e-commerce component: OrderDetailPage
 * // Uses: useCustomerOrder, useCancelOrderMutation, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: displays a single order, tracking progress, status log, items, and customer cancellation when allowed.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function OrderDetailPage() {
  const navigate = useNavigate()
  const { number } = useParams()
  const { data: order, isError, isLoading, refetch } = useCustomerOrder(number, { poll: true })
  const cancelMutation = useCancelOrderMutation()

  const latestLog = order?.status_logs?.length ? order.status_logs[order.status_logs.length - 1] : null
  const canCancel = order?.order_status === 'pending' && order?.payment_status === 'pending'
  const deliveryProofUrl = normalizePublicAssetUrl(order?.delivery_proof_url)
  const hasDeliveryProof =
    order?.order_status === 'delivered' || deliveryProofUrl || order?.delivery_proof_notes

  const handleCancel = async () => {
    if (!order?.order_number) {
      return
    }

    if (!window.confirm('Cancel this pending unpaid order and restore the stock?')) {
      return
    }

    try {
      await cancelMutation.mutateAsync(order.order_number)
      toast.success('Order cancelled.')
      refetch()
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[420px] items-center justify-center">
        <Spinner className="h-12 w-12" />
      </section>
    )
  }

  if (isError || !order) {
    return (
      <ErrorState
        description="We could not load the order tracking details. Retry once the request settles."
        onAction={refetch}
        title="Unable to load this order."
      />
    )
  }

  const paymentMeta = getPaymentMethodMeta(order.payment_method)
  const isCodOrder = order.payment_method === 'cod'

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-[#2c2c2c] bg-[#1a1a1a] px-6 py-7 text-white shadow-[0_22px_52px_rgba(0,0,0,0.2)] sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <button
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0] transition hover:text-white"
              onClick={() => navigate('/customer/orders')}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </button>

            <div className="mt-5 inline-flex rounded-full border border-[rgba(201,168,76,0.22)] bg-[#212121] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c9a84c]">
              Tracking Page
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold italic text-white sm:text-5xl">
              {order.order_number}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#a0a0a0]">
              Follow delivery progress, review the full timeline, and keep the order details close while your bag is on the way.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[rgba(201,168,76,0.18)] bg-[#212121] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0]">Total Amount</div>
              <div className="mt-2 font-mono text-2xl text-[#d4a843]">{formatCurrency(order.total_amount)}</div>
            </div>
            <div className="rounded-[24px] border border-[rgba(201,168,76,0.18)] bg-[#212121] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0]">Placed On</div>
              <div className="mt-2 text-sm leading-6 text-white">{formatDateTime(order.created_at)}</div>
            </div>
            <div className="rounded-[24px] border border-[rgba(201,168,76,0.18)] bg-[#212121] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0]">Payment</div>
              <div className="mt-2 text-sm leading-6 text-white">
                {paymentMeta.label} / {formatLabel(order.payment_status)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#d4a843] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
            {formatLabel(order.order_status)}
          </span>
          <span className="rounded-full border border-[rgba(201,168,76,0.24)] bg-[#212121] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            {formatLabel(order.payment_status)}
          </span>
          <span className="rounded-full border border-[rgba(201,168,76,0.24)] bg-[#212121] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            {paymentMeta.shortLabel}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="brewhaus-outline-button px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em]" to="/shop">
            Continue Shopping
          </Link>
          {canCancel ? (
            <button
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[rgba(158,77,77,0.45)] bg-[rgba(158,77,77,0.12)] px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[rgba(158,77,77,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(158,77,77,0.36)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={cancelMutation.isPending}
              onClick={handleCancel}
              type="button"
            >
              {cancelMutation.isPending ? 'Cancelling Order' : 'Cancel Order'}
            </button>
          ) : null}
        </div>
      </div>

      <OrderTracker
        createdAt={order.created_at}
        deliveredAt={order.delivered_at}
        latestLog={latestLog}
        logs={order.status_logs ?? []}
        rider={order.rider}
        status={order.order_status}
      />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-6 py-6 shadow-[0_16px_34px_rgba(0,0,0,0.08)] sm:px-8">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8c7a45]">
            <Package className="h-4 w-4" />
            Order Items
          </div>
          <div className="mt-5">
            {order.items?.length ? (
              <OrderItemsList items={order.items} />
            ) : (
              <EmptyState
                description="The order item snapshot is missing for this record."
                title="No items found."
                titleClassName="font-display text-3xl italic text-[#1a1a1a]"
              />
            )}
          </div>
        </div>

        <div className="space-y-6">
          {isCodOrder ? (
            <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-6 py-6 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8c7a45]">Cash On Delivery</div>
              <div className="mt-4 text-sm leading-7 text-[#555555]">
                {order.payment_status === 'paid'
                  ? `Cash collection for ${formatCurrency(order.total_amount)} has already been recorded for this order.`
                  : `Cash on Delivery was selected for this order. Prepare ${formatCurrency(order.total_amount)} for the rider when your order arrives.`}
              </div>
            </div>
          ) : null}

          <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-6 py-6 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8c7a45]">
              <MapPin className="h-4 w-4" />
              Delivery Address
            </div>
            {order.shipping_address ? (
              <div className="mt-5 space-y-3 text-sm text-[#555555]">
                <div className="font-display text-2xl italic text-[#1a1a1a]">{order.shipping_address.label}</div>
                <div>{order.shipping_address.recipient_name}</div>
                <div>{order.shipping_address.phone}</div>
                <div className="leading-7">{order.shipping_address.full_address}</div>
              </div>
            ) : (
              <div className="mt-5 text-sm italic text-[#777777]">
                No shipping address snapshot is available for this order.
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-6 py-6 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8c7a45]">
              <ReceiptText className="h-4 w-4" />
              Payment Snapshot
            </div>
            <div className="mt-5 space-y-3 text-sm text-[#555555]">
              <div className="flex items-center justify-between gap-4 border-b border-[#e6dfd0] pb-3">
                <span>Method</span>
                <span className="font-semibold text-[#1a1a1a]">{paymentMeta.label}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#e6dfd0] pb-3">
                <span>Status</span>
                <span className="font-semibold text-[#1a1a1a]">{formatLabel(order.payment_status)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#e6dfd0] pb-3">
                <span>Subtotal</span>
                <span className="font-mono text-[#c9a84c]">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#e6dfd0] pb-3">
                <span>Shipping Fee</span>
                <span className="font-mono text-[#c9a84c]">{formatCurrency(order.shipping_fee)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Discount</span>
                <span className="font-mono text-[#c9a84c]">{formatCurrency(order.discount_amount)}</span>
              </div>
            </div>
          </div>

          {hasDeliveryProof ? (
            <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-6 py-6 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8c7a45]">
                <Camera className="h-4 w-4" />
                Proof Of Delivery
              </div>
              <div className="mt-5 space-y-4">
                {deliveryProofUrl ? (
                  <a
                    className="inline-flex text-sm font-bold text-[#8c7a45] underline decoration-[#c9a84c]/60 decoration-2 underline-offset-4"
                    href={deliveryProofUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open full image
                  </a>
                ) : null}

                <div className="overflow-hidden rounded-[22px] border border-[#e6dfd0] bg-white">
                  {deliveryProofUrl ? (
                    <img
                      alt="Delivery proof"
                      className="h-64 w-full object-cover"
                      src={deliveryProofUrl}
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center px-4 text-center text-sm italic text-[#777777]">
                      No proof image was uploaded for this delivery.
                    </div>
                  )}
                </div>

                <div className="rounded-[20px] border border-[#e6dfd0] bg-white px-4 py-4 text-sm text-[#555555]">
                  {order.delivery_proof_notes || 'No rider delivery note was recorded.'}
                </div>

                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b7b7b]">
                  Delivered at: {formatDateTime(order.delivered_at)}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-6 py-6 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8c7a45]">
              <Truck className="h-4 w-4" />
              Order Notes
            </div>
            <div className="mt-5 rounded-[22px] border border-[#e6dfd0] bg-white px-4 py-4 text-sm leading-7 text-[#555555]">
              {order.notes || 'No customer notes were attached to this order.'}
            </div>
            <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b7b7b]">
              Last updated: {formatDateTime(latestLog?.created_at || order.updated_at)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
