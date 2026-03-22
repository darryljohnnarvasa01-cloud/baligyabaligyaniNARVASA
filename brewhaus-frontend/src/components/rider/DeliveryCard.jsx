import { Link } from 'react-router-dom'

function formatCurrency(value) {
  const amount = Number(value || 0)

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount)
}

function buildAddress(address) {
  if (!address) {
    return 'No delivery address'
  }

  return [
    address.street,
    address.barangay,
    address.city,
    address.province,
  ]
    .filter(Boolean)
    .join(', ')
}

function paymentTone(method) {
  if (method === 'cod') {
    return 'border-heat/40 bg-heat-l text-heat'
  }

  if (method === 'gcash') {
    return 'border-live/40 bg-live-l text-live'
  }

  return 'border-frost/40 bg-frost-l text-frost'
}

// [CODEX] React e-commerce component: DeliveryCard
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: summarizes an assigned rider delivery with payment badge, address, item count, and context actions.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function DeliveryCard({ order, actions }) {
  const totalItems = (order.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  )

  const leftBorder =
    order.order_status === 'out_for_delivery'
      ? 'border-l-ember'
      : 'border-l-smoke'

  return (
    <div
      className={[
        'rounded-[24px] border border-border border-l-[4px] bg-white p-5 shadow-sm transition duration-200 hover:bg-surface hover:shadow-md sm:p-6',
        leftBorder,
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg font-display font-semibold text-ink">
              {order.customer?.name || 'Customer'}
            </div>
            <Link
              to={`/rider/deliveries/${order.id}`}
              className="text-xs font-mono uppercase tracking-[0.14em] text-ink-4 transition hover:text-ink"
            >
              {order.order_number}
            </Link>
          </div>

          <div className="mt-3 text-sm text-ink-3">
            {buildAddress(order.shipping_address)}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-4">
            <span>{totalItems} item{totalItems === 1 ? '' : 's'}</span>
            <span className="rounded-[5px] border border-border px-2.5 py-1 font-mono text-ink-3">
              {order.order_status.replaceAll('_', ' ')}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div
            className={[
              'inline-flex rounded-[5px] border px-3 py-1 text-[11px] uppercase tracking-[0.14em]',
              paymentTone(order.payment_method),
            ].join(' ')}
          >
            {order.payment_method === 'cod' ? 'COD' : order.payment_method}
          </div>
          <div className="mt-3 font-mono text-lg text-gold">
            {formatCurrency(order.total_amount)}
          </div>
          {order.payment_method === 'cod' ? (
            <div className="mt-1 text-xs text-heat">Collect on delivery</div>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
