import { Link } from 'react-router-dom'
import { ChevronRight, Clock3 } from 'lucide-react'
import { getPaymentMethodMeta } from '../../utils/checkout'
import { formatCurrency } from '../../utils/storefront'

function formatLabel(value) {
  return String(value || 'pending').replaceAll('_', ' ')
}

function formatDate(value) {
  if (!value) {
    return 'Pending'
  }

  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildItemSummary(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Items will appear once the order is confirmed.'
  }

  const names = items.slice(0, 2).map((item) => item?.product_name || item?.name || 'Item')
  const remainingCount = Math.max(0, items.length - names.length)

  return remainingCount > 0 ? `${names.join(', ')} + ${remainingCount} more` : names.join(', ')
}

/**
 * // [CODEX] React e-commerce component: OrderCard
 * // Uses: React Router, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: presents a compact customer order summary with number, statuses, amount, and a direct detail link.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function OrderCard({ order }) {
  const itemCount = Array.isArray(order?.items)
    ? order.items.reduce((total, item) => total + Number(item?.quantity || 0), 0)
    : 0
  const isClosed = ['cancelled', 'refunded'].includes(String(order?.order_status || ''))
  const ctaLabel = isClosed ? 'View Order' : 'Track Order'
  const itemSummary = buildItemSummary(order?.items)
  const paymentMeta = getPaymentMethodMeta(order?.payment_method)

  return (
    <Link
      className="group block rounded-[24px] border border-[#e0e0e0] bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-[2px] hover:shadow-[0_18px_36px_rgba(0,0,0,0.1)] sm:rounded-[28px] sm:p-6"
      to={`/customer/orders/${order.order_number}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">
            {order.order_number}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#e0e0e0] bg-[#fafafa] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#555555]">
              {formatLabel(order.order_status)}
            </span>
            <span className="rounded-full bg-[#f5c842] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1a1a1a]">
              {formatLabel(order.payment_status)}
            </span>
          </div>
        </div>

        <div className="sm:text-right">
          <div className="text-lg font-extrabold text-[#1a1a1a] sm:text-xl">
            {formatCurrency(order.total_amount)}
          </div>
          <div className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDate(order.created_at)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden">
        <div className="rounded-[18px] border border-[#e0e0e0] bg-[#f5f5f5] px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#555555]">Items</div>
          <div className="mt-2 text-base font-extrabold text-[#1a1a1a]">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </div>
        </div>
        <div className="rounded-[18px] border border-[#e0e0e0] bg-[#f5f5f5] px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#555555]">
            Payment
          </div>
          <div className="mt-2 text-base font-extrabold text-[#1a1a1a]">
            {paymentMeta.shortLabel}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-[#e0e0e0] bg-[#f5f5f5] px-4 py-4 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#555555]">
          Order Snapshot
        </div>
        <div className="mt-2 text-sm font-semibold leading-6 text-[#1a1a1a]">{itemSummary}</div>
        <div className="mt-1 hidden text-sm leading-6 text-[#555555] sm:block">
          {itemCount} item{itemCount === 1 ? '' : 's'} | {paymentMeta.label}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[#e0e0e0] pt-4 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="text-sm leading-6 text-[#555555] sm:hidden">
          Tap to open the full order timeline, payment details, and delivery updates.
        </div>
        <div className="inline-flex w-full items-center justify-between gap-2 rounded-full bg-[#f5c842] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition group-hover:bg-[#e8c53a] sm:w-auto sm:bg-[#f7f7f7] sm:group-hover:bg-[#f5f5f5]">
          <span>{ctaLabel}</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}
