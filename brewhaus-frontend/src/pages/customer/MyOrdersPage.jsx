import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Archive, ArrowLeft, ArrowRight, ShoppingBag, SlidersHorizontal } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { OrderHistorySkeleton } from '../../components/ui/SkeletonLayouts'
import OrderCard from '../../components/customer/OrderCard'
import { useCustomerOrders } from '../../hooks/customer/useCustomerOrders'

const ACTIVE_FILTERS = [
  { value: '', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
]

const VIEW_OPTIONS = [
  {
    value: 'active',
    label: 'Orders',
    description: 'Keep current, pending, and non-delivered orders in the main queue.',
    icon: ShoppingBag,
  },
  {
    value: 'history',
    label: 'History',
    description: 'Archive delivered orders separately so the page stays shorter.',
    icon: Archive,
  },
]

function updateParams(searchParams, nextValues) {
  const next = new URLSearchParams(searchParams)

  Object.entries(nextValues).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) {
      next.delete(key)
      return
    }

    next.set(key, String(value))
  })

  return next
}

/**
 * // [CODEX] React e-commerce component: MyOrdersPage
 * // Uses: useCustomerOrders, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: lists the authenticated customer's orders with secondary navigation for current orders vs delivered history.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function MyOrdersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const view = searchParams.get('view') === 'history' ? 'history' : 'active'
  const isHistoryView = view === 'history'
  const status = isHistoryView ? '' : searchParams.get('status') || ''
  const { data, isError, isLoading, refetch } = useCustomerOrders({
    page,
    perPage: 6,
    status,
    view,
  })

  const orders = data?.items ?? []
  const meta = data?.meta ?? null
  const activeFilterLabel =
    isHistoryView
      ? 'Delivered'
      : (status ? ACTIVE_FILTERS.find((filter) => filter.value === status)?.label : null) || 'All Orders'
  const visibleRangeText =
    meta?.total && meta?.from && meta?.to ? `${meta.from}-${meta.to}` : orders.length ? `1-${orders.length}` : '0'
  const summaryText = useMemo(() => {
    if (!meta?.total) {
      return isHistoryView ? 'No delivered orders in your history yet.' : 'No orders found yet.'
    }

    return isHistoryView
      ? `${meta.total} delivered order${meta.total === 1 ? '' : 's'} in your history.`
      : `${meta.total} order${meta.total === 1 ? '' : 's'} in your current orders view.`
  }, [isHistoryView, meta?.total])

  const handleViewChange = (nextView) => {
    setSearchParams(
      updateParams(searchParams, {
        view: nextView === 'history' ? 'history' : '',
        status: '',
        page: 1,
      }),
    )
  }

  const handleStatusChange = (nextStatus) => {
    setSearchParams(
      updateParams(searchParams, {
        view: '',
        status: nextStatus || '',
        page: 1,
      }),
    )
  }

  const handlePageChange = (nextPage) => {
    setSearchParams(
      updateParams(searchParams, {
        view: isHistoryView ? 'history' : '',
        status,
        page: nextPage,
      }),
    )
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="rounded-[28px] bg-white px-4 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
              {isHistoryView ? 'Order History' : 'My Orders'}
            </div>
            <h1 className="mt-4 max-w-[11ch] text-[2.2rem] font-extrabold leading-[1.02] text-[#1a1a1a] sm:max-w-none sm:text-5xl">
              {isHistoryView ? 'Delivered orders live here.' : 'Every bag, every status, in one place.'}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#555555] sm:leading-7">
              {isHistoryView
                ? 'History keeps completed deliveries out of the main queue so current orders stay easier to scan.'
                : 'Use the navigation below to keep delivered orders out of the main list and focus on what still needs attention.'}
            </p>
          </div>

          <div className="grid gap-3 sm:min-w-[260px] sm:max-w-[280px]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              <div className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">
                  {isHistoryView ? 'History' : 'Orders'}
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1a1a1a]">{meta?.total || 0}</div>
              </div>
              <div className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">Showing</div>
                <div className="mt-2 text-2xl font-extrabold text-[#1a1a1a]">{visibleRangeText}</div>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.04)] sm:px-5 sm:text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">Current View</div>
              <div className="mt-2 text-lg font-extrabold text-[#1a1a1a] sm:text-2xl">
                {isHistoryView ? 'History' : activeFilterLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] bg-white px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">
            <SlidersHorizontal className="h-4 w-4" />
            Order Navigation
          </div>
          {!isHistoryView && status ? (
            <button
              className="inline-flex items-center justify-center rounded-full border border-[#e0e0e0] bg-[#f5f5f5] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:border-[#f5c842]"
              onClick={() => handleStatusChange('')}
              type="button"
            >
              Clear Filter
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {VIEW_OPTIONS.map((option) => {
            const Icon = option.icon
            const isActive = view === option.value

            return (
              <button
                className={[
                  'rounded-[24px] border px-4 py-4 text-left transition sm:px-5',
                  isActive
                    ? 'border-[#f5c842] bg-[#fff5d5] shadow-[0_12px_26px_rgba(0,0,0,0.06)]'
                    : 'border-[#e0e0e0] bg-[#fafafa] hover:border-[#f5c842]',
                ].join(' ')}
                key={option.value}
                onClick={() => handleViewChange(option.value)}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      'flex h-11 w-11 items-center justify-center rounded-full',
                      isActive ? 'bg-[#f5c842] text-[#1a1a1a]' : 'bg-white text-[#555555]',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">
                      {option.label}
                    </div>
                    <div className="mt-2 text-lg font-extrabold text-[#1a1a1a]">{option.label}</div>
                    <div className="mt-1 text-sm leading-6 text-[#666666]">{option.description}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {isHistoryView ? (
          <div className="mt-4 rounded-[20px] border border-[#efe2ba] bg-[#fff8e3] px-4 py-4 text-sm leading-6 text-[#6d5a1c]">
            Delivered orders are archived here so the main orders view stays lighter and easier to scan.
          </div>
        ) : (
          <>
            <div className="mt-4 sm:hidden">
              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#777777]">
                    Filter Orders
                  </span>
                  <select
                    className="w-full rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-3 text-sm font-semibold text-[#1a1a1a] outline-none transition focus:border-[#f5c842] focus:shadow-[0_0_0_3px_rgba(245,200,66,0.18)]"
                    onChange={(event) => handleStatusChange(event.target.value)}
                    value={status}
                  >
                    {ACTIVE_FILTERS.map((filter) => (
                      <option key={filter.value || 'all-mobile'} value={filter.value}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[20px] border border-[#e0e0e0] bg-[#f5f5f5] px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">Visible Orders</div>
                  <div className="mt-2 text-lg font-extrabold text-[#1a1a1a]">
                    {visibleRangeText} of {meta?.total || 0}
                  </div>
                  <div className="mt-1 text-[13px] leading-6 text-[#666666]">
                    {status ? `Filtered by ${activeFilterLabel}.` : 'Showing all non-delivered orders.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 hidden gap-3 overflow-x-auto pb-1 sm:flex">
              {ACTIVE_FILTERS.map((filter) => (
                <button
                  className={[
                    'shrink-0 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition',
                    status === filter.value
                      ? 'border-[#f5c842] bg-[#f5c842] text-[#1a1a1a]'
                      : 'border-[#e0e0e0] bg-white text-[#555555] hover:border-[#f5c842] hover:text-[#1a1a1a]',
                  ].join(' ')}
                  key={filter.value || 'all'}
                  onClick={() => handleStatusChange(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <OrderHistorySkeleton />
      ) : isError ? (
        <ErrorState
          description="We could not load your order history. Retry once the request settles."
          onAction={refetch}
          title="Unable to load orders."
        />
      ) : orders.length ? (
        <>
          <div className="space-y-3 sm:space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.order_number} order={order} />
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-[28px] border border-[#e0e0e0] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[#555555]">
                Page {meta?.current_page || 1} of {meta?.last_page || 1}
              </div>
              <div className="rounded-full bg-[#f5f5f5] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">
                Showing {visibleRangeText}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e0e0e0] bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-45 sm:py-2"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5c842] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#e8c53a] disabled:cursor-not-allowed disabled:opacity-45 sm:py-2"
                disabled={!meta?.has_more_pages}
                onClick={() => handlePageChange(page + 1)}
                type="button"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          actionLabel={isHistoryView ? 'Back to Orders' : status ? 'Clear Filter' : 'Browse Products'}
          description={
            isHistoryView
              ? 'Delivered orders will appear here once they are completed.'
              : status
                ? 'There are no orders under this status right now. Clear the filter to see everything in your current orders view.'
                : 'Start with a few coffees and your orders will appear here.'
          }
          onAction={() => {
            if (isHistoryView) {
              handleViewChange('active')
              return
            }

            if (status) {
              handleStatusChange('')
              return
            }

            navigate('/shop')
          }}
          title={isHistoryView ? 'No delivered orders yet.' : status ? 'No matching orders.' : 'Your order history is still empty.'}
          titleClassName="text-3xl font-extrabold text-[#1a1a1a]"
        />
      )}
    </section>
  )
}
