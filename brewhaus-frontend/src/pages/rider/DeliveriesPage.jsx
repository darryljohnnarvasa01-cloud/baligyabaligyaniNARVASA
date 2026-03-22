import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Navigation, Phone, RefreshCw, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import DeliveryCard from '../../components/rider/DeliveryCard'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import {
  useAcceptOrderMutation,
  usePickupOrderMutation,
  useRiderQueue,
  useRiderOrders,
  useRiderSummary,
} from '../../hooks/rider/useRiderOrders'
import { buildGoogleMapsSearchUrl } from '../../utils/maps'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function buildAddress(address) {
  if (!address) {
    return 'No delivery address'
  }

  return (
    address.full_address ||
    [address.street, address.barangay, address.city, address.province].filter(Boolean).join(', ')
  )
}

function buildItemSummary(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No item summary available.'
  }

  const names = items.slice(0, 2).map((item) => item.product_name || item.name || 'Item')
  const remainingCount = Math.max(0, items.length - names.length)

  return remainingCount > 0 ? `${names.join(', ')} + ${remainingCount} more` : names.join(', ')
}

function formatLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function SummaryCard({
  label,
  value,
  detail,
  kicker,
  panelClassName = '',
  valueClassName = '',
}) {
  return (
    <div
      className={[
        'group relative overflow-hidden rounded-[24px] border p-4 shadow-[0_18px_40px_rgba(26,25,22,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(26,25,22,0.12)] sm:rounded-[28px] sm:p-5',
        panelClassName,
      ].join(' ')}
    >
      <div className="absolute inset-x-5 top-0 h-[3px] rounded-full bg-gradient-to-r from-[#c9a84c] via-[#f2d58d] to-transparent" />
      <div className="text-[11px] uppercase tracking-[0.22em] text-ink-4">{label}</div>
      <div className={['mt-4', valueClassName].filter(Boolean).join(' ')}>{value}</div>
      <div className="mt-3 max-w-[24ch] text-sm leading-6 text-ink-3">{detail}</div>
      {kicker ? (
        <div className="mt-4 inline-flex rounded-full border border-[#e6ddca] bg-white/88 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-4">
          {kicker}
        </div>
      ) : null}
    </div>
  )
}

// [CODEX] React e-commerce component: DeliveriesPage
// Uses: useRiderOrders, usePickupOrderMutation, useDeliverOrderMutation, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: lists rider orders in packed and out-for-delivery states and exposes pickup or delivered actions.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function DeliveriesPage() {
  const ordersQuery = useRiderOrders()
  const queueQuery = useRiderQueue()
  const summaryQuery = useRiderSummary()
  const acceptMutation = useAcceptOrderMutation()
  const pickupMutation = usePickupOrderMutation()

  const orders = ordersQuery.data ?? []
  const queue = queueQuery.data ?? []
  const summary = summaryQuery.data ?? null
  const activeDelivery =
    orders.find((order) => order.order_status === 'out_for_delivery') ||
    orders.find((order) => ['packed', 'shipped'].includes(order.order_status)) ||
    null
  const activeDeliveryMapsUrl = buildGoogleMapsSearchUrl(activeDelivery?.shipping_address)
  const isRefreshing =
    ordersQuery.isFetching || queueQuery.isFetching || summaryQuery.isFetching
  const summaryCards = summary
    ? [
        {
          label: 'Active runs',
          value: summary.active_runs,
          detail: activeDelivery
            ? `${activeDelivery.order_number} is the next stop that needs your attention.`
            : 'No live stop right now. Your rider slate is open for the next assignment.',
          kicker: activeDelivery ? formatLabel(activeDelivery.order_status) : 'Standby',
          panelClassName:
            'border-[#e8ddc7] bg-[linear-gradient(180deg,#fffdfa_0%,#ffffff_100%)]',
          valueClassName: 'text-4xl font-display font-bold italic text-ink',
        },
        {
          label: 'Queue open',
          value: summary.queue_open,
          detail:
            summary.queue_open > 0
              ? `${summary.queue_open} unclaimed stop${summary.queue_open === 1 ? '' : 's'} are ready for riders below.`
              : 'Dispatch is caught up. New queued stops will appear here as soon as they open.',
          kicker: summary.queue_open > 0 ? 'Claim available' : 'Queue clear',
          panelClassName:
            'border-[#e8ddc7] bg-[linear-gradient(180deg,#fcf8ef_0%,#ffffff_100%)]',
          valueClassName: 'text-4xl font-display font-bold italic text-ink',
        },
        {
          label: 'COD to collect',
          value: formatCurrency(summary.cod_to_collect),
          detail:
            summary.cod_to_collect > 0
              ? 'Cash collection still pending on active runs. Keep this visible before each handoff.'
              : 'No cash collection is pending on your current board.',
          kicker: summary.cod_to_collect > 0 ? 'Cash on hand' : 'Fully settled',
          panelClassName:
            'border-[#ead8b2] bg-[linear-gradient(180deg,#fff8ea_0%,#ffffff_100%)]',
          valueClassName: 'font-mono text-[2rem] text-gold',
        },
        {
          label: 'Estimated payout today',
          value: formatCurrency(summary.estimated_earnings_today),
          detail: `Delivered today: ${summary.delivered_today} | Total completed: ${summary.delivered_total}`,
          kicker: `Lifetime ${formatCurrency(summary.estimated_earnings_total)}`,
          panelClassName:
            'border-[#e8ddc7] bg-[linear-gradient(180deg,#f8f5ec_0%,#ffffff_100%)]',
          valueClassName: 'font-mono text-[2rem] text-gold',
        },
      ]
    : []

  const handleAccept = async (orderId) => {
    try {
      await acceptMutation.mutateAsync({ orderId })
      toast.success('Delivery accepted.')
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Unable to accept delivery.'
      toast.error(message)
    }
  }

  const handlePickup = async (orderId) => {
    try {
      await pickupMutation.mutateAsync(orderId)
      toast.success('Order picked up.')
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Pickup failed.'
      toast.error(message)
    }
  }

  const handleRefreshBoard = async () => {
    await Promise.allSettled([
      ordersQuery.refetch(),
      queueQuery.refetch(),
      summaryQuery.refetch(),
    ])
  }

  return (
    <div className="space-y-6 animate-fade-up sm:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[#e7dcc5] bg-[radial-gradient(circle_at_top_left,rgba(201,168,76,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(194,98,26,0.08),transparent_30%),linear-gradient(180deg,#fffdf8_0%,#f6efe1_100%)] p-5 shadow-[0_24px_60px_rgba(26,25,22,0.08)] sm:rounded-[36px] sm:p-7">
        <div className="absolute left-0 top-0 h-28 w-28 -translate-x-6 -translate-y-5 rounded-full bg-[rgba(201,168,76,0.14)] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-[#e2d4b7] bg-white/82 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-ink-3 shadow-xs">
              Rider Console
            </div>
            <h1 className="mt-4 text-[2.9rem] font-display font-bold italic leading-none text-ink sm:text-[4.4rem]">
              Delivery Hub
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-3 sm:text-[15px]">
              Queue visibility, active stops, COD collection, and rider payout snapshots stay in one place so you can move from dispatch to doorstep without hunting through the page.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex w-full items-center justify-center rounded-full border border-[#e5d8c0] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-ink-3 shadow-xs sm:w-auto">
                Updates every 15 seconds
              </span>
              <span className="inline-flex w-full items-center justify-center rounded-full border border-[#e5d8c0] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-ink-3 shadow-xs sm:w-auto">
                {activeDelivery
                  ? `Live stop ${activeDelivery.order_number}`
                  : summary?.queue_open
                    ? `${summary.queue_open} queued stop${summary.queue_open === 1 ? '' : 's'} open`
                    : 'Queue is clear'}
              </span>
              {activeDelivery ? (
                <Link
                  to={`/rider/deliveries/${activeDelivery.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#d5c191] bg-[#fff0c7] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink shadow-xs transition hover:-translate-y-0.5 hover:bg-[#ffe7a6] sm:w-auto"
                >
                  Open current stop
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : summary?.queue_open ? (
                <a
                  href="#available-queue"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#d5c191] bg-[#fff0c7] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink shadow-xs transition hover:-translate-y-0.5 hover:bg-[#ffe7a6] sm:w-auto"
                >
                  Review open queue
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="w-full max-w-[360px] flex-1">
            <div className="rounded-[24px] border border-[#e6dbc8] bg-white/82 p-4 shadow-[0_16px_34px_rgba(26,25,22,0.08)] backdrop-blur sm:rounded-[26px] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-ink-4">
                    Board status
                  </div>
                  <div className="mt-2 text-[1.65rem] font-display font-bold italic leading-none text-ink sm:text-[2rem]">
                    {isRefreshing
                      ? 'Refreshing live data'
                      : activeDelivery
                        ? 'Run in motion'
                        : 'Ready for dispatch'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshBoard}
                  disabled={isRefreshing}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e3d8c1] bg-[#fff9ef] text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-[#c9a84c] hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf1] disabled:opacity-60"
                  title="Refresh rider board"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-ink-3">
                {activeDelivery
                  ? `${activeDelivery.customer?.name || 'Your customer'} is the live stop at the top of your board.`
                  : summary?.queue_open
                    ? `${summary.queue_open} queued stop${summary.queue_open === 1 ? '' : 's'} can be claimed below right now.`
                    : 'No live stop is assigned at the moment. Stay available and the next run will surface here.'}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-[#ece3d0] bg-[#fffaf2] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-4">Assigned</div>
                  <div className="mt-2 text-3xl font-display font-bold italic text-ink">
                    {summary?.active_runs ?? 0}
                  </div>
                </div>
                <div className="rounded-[20px] border border-[#ece3d0] bg-[#fffaf2] px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-4">Delivered today</div>
                  <div className="mt-2 text-3xl font-display font-bold italic text-ink">
                    {summary?.delivered_today ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryQuery.isLoading || !summary ? (
          <div className="flex items-center justify-center py-10 md:col-span-2 xl:col-span-4">
            <Spinner className="h-12 w-12" />
          </div>
        ) : (
          summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)
        )}
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-[#2f271d] bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.18),transparent_28%),linear-gradient(180deg,#1f1a14_0%,#161616_100%)] px-5 py-5 text-white shadow-[0_26px_58px_rgba(0,0,0,0.2)] sm:rounded-[34px] sm:px-7 sm:py-6">
        <div className="absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-[rgba(201,168,76,0.08)] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#c9a84c]">
              Active Delivery
            </div>
            <h2 className="mt-2 text-[2rem] font-display font-bold italic text-white sm:text-3xl">
              {activeDelivery ? 'Your next rider action' : 'Waiting for the next run'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
              Keep the current stop visible so pickup, route navigation, customer contact, and proof submission stay one tap away from the moment a run goes live.
            </p>
          </div>
          <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/72">
            {activeDelivery ? formatLabel(activeDelivery.order_status) : 'Stand by'}
          </div>
        </div>

        {activeDelivery ? (
          <div className="relative mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 backdrop-blur-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/58">
                    {activeDelivery.order_number}
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-white">
                    {activeDelivery.customer?.name || 'Customer'}
                  </div>
                </div>
                <div className="rounded-full bg-[#c9a84c] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1a1a1a]">
                  {activeDelivery.payment_method === 'cod' ? 'COD stop' : 'Paid online'}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-black/18 px-4 py-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/58">
                    <MapPin className="h-4 w-4" />
                    Address
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/82">
                    {buildAddress(activeDelivery.shipping_address)}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/18 px-4 py-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/58">
                    <Truck className="h-4 w-4" />
                    Items Summary
                  </div>
                  <div className="mt-3 text-sm leading-7 text-white/82">
                    {buildItemSummary(activeDelivery.items)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/10 bg-black/18 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/58">
                      Order Value
                    </div>
                    <div className="mt-2 font-mono text-2xl text-[#d4a843]">
                      {formatCurrency(activeDelivery.total_amount)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-white/72">
                    {activeDelivery.customer?.phone ? `Call: ${activeDelivery.customer.phone}` : 'No phone available'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c9a84c]">
                Ready Actions
              </div>
              <div className="mt-4 grid gap-3 content-start">
                {['packed', 'shipped'].includes(activeDelivery.order_status) ? (
                  <button
                    type="button"
                    onClick={() => handlePickup(activeDelivery.id)}
                    className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#c9a84c] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#d4a843] disabled:opacity-60"
                    disabled={pickupMutation.isPending}
                  >
                    <Truck className="h-4 w-4" />
                    {pickupMutation.isPending ? 'Starting Delivery...' : 'Start Delivery'}
                  </button>
                ) : (
                  <Link
                    to={`/rider/deliveries/${activeDelivery.id}`}
                    className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#c9a84c] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#d4a843]"
                  >
                    <Truck className="h-4 w-4" />
                    Submit Delivery Proof
                  </Link>
                )}

                {activeDeliveryMapsUrl ? (
                  <a
                    href={activeDeliveryMapsUrl}
                    rel="noreferrer"
                    target="_blank"
                    className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-white/8 px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/12"
                  >
                    <Navigation className="h-4 w-4" />
                    Open In Maps
                  </a>
                ) : null}

                {activeDelivery.customer?.phone ? (
                  <a
                    href={`tel:${activeDelivery.customer.phone}`}
                    className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-white/8 px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/12"
                  >
                    <Phone className="h-4 w-4" />
                    Call Customer
                  </a>
                ) : null}

                <Link
                  to={`/rider/deliveries/${activeDelivery.id}`}
                  className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-transparent px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/8"
                >
                  Review Full Delivery
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c9a84c]">
                Dispatch Snapshot
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/76">
                {summary?.queue_open
                  ? 'There are queued deliveries ready to claim. Once you accept a stop, it will replace this empty state and move into your live rider workflow.'
                  : 'No active or staged delivery is assigned right now. Stay available and this board will refresh automatically when dispatch opens the next stop.'}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Queue open</div>
                  <div className="mt-2 text-3xl font-display font-bold italic text-white">
                    {summary?.queue_open ?? 0}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Delivered today</div>
                  <div className="mt-2 text-3xl font-display font-bold italic text-white">
                    {summary?.delivered_today ?? 0}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">Payout total</div>
                  <div className="mt-2 font-mono text-lg text-[#d4a843]">
                    {formatCurrency(summary?.estimated_earnings_total ?? 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[rgba(201,168,76,0.22)] bg-[linear-gradient(180deg,rgba(201,168,76,0.16),rgba(201,168,76,0.04))] p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f0d58b]">
                Next Best Action
              </div>
              <h3 className="mt-3 text-[1.75rem] font-display font-bold italic leading-none text-white sm:text-[2rem]">
                {summary?.queue_open ? 'Claim the next open stop' : 'Stay ready for dispatch'}
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/76">
                {summary?.queue_open
                  ? 'Open queue cards below already include the customer snapshot and accept action, so you can move into a live run in one tap.'
                  : 'This workspace is already polling in the background. If dispatch opens a run, it will surface here without reloading the page.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {summary?.queue_open ? (
                  <a
                    href="#available-queue"
                    className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#c9a84c] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#d4a843] sm:w-auto"
                  >
                    Review open queue
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleRefreshBoard}
                  disabled={isRefreshing}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-white/14 bg-white/8 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/12 disabled:opacity-60 sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Sync now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="scroll-mt-24 space-y-4 sm:scroll-mt-32" id="available-queue">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-ink-3">Available queue</div>
            <h2 className="mt-2 text-2xl font-display font-bold italic text-ink">Claim a delivery</h2>
          </div>
          {summary ? (
            <div className="w-full rounded-full border border-border bg-white px-4 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-ink-3 shadow-xs sm:w-auto">
              Estimated lifetime payout {formatCurrency(summary.estimated_earnings_total)}
            </div>
          ) : null}
        </div>

        {queueQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-12 w-12" />
          </div>
        ) : queueQuery.isError ? (
          <ErrorState
            title="Unable to load delivery queue."
            onAction={() => queueQuery.refetch()}
          />
        ) : queue.length === 0 ? (
          <EmptyState
            title="Queue is clear."
            description="No unclaimed deliveries are waiting right now."
            titleClassName="italic"
          />
        ) : (
          <div className="grid gap-4">
            {queue.map((order, idx) => (
              <div
                key={order.id}
                className="animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <DeliveryCard
                  order={order}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => handleAccept(order.id)}
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[8px] bg-ember px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#A85418] hover:shadow-md disabled:opacity-60 sm:w-auto"
                        disabled={acceptMutation.isPending}
                      >
                        {acceptMutation.isPending ? 'Claiming...' : 'Accept Delivery'}
                      </button>
                      {order.customer?.phone ? (
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[8px] border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface sm:w-auto"
                        >
                          Call Customer
                        </a>
                      ) : null}
                    </>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-ink-3">Assigned runs</div>
          <h2 className="mt-2 text-2xl font-display font-bold italic text-ink">My deliveries</h2>
        </div>

        {ordersQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-12 w-12" />
          </div>
        ) : ordersQuery.isError ? (
          <ErrorState
            title="Unable to load deliveries."
            onAction={() => ordersQuery.refetch()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No active deliveries."
            description="Accept a queued order or wait for dispatch to assign one."
            titleClassName="italic"
          />
        ) : (
          <div className="grid gap-4">
            {orders.map((order, idx) => (
              <div
                key={order.id}
                className="animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <DeliveryCard
                  order={order}
                  actions={
                    <>
                      {['packed', 'shipped'].includes(order.order_status) ? (
                        <button
                          type="button"
                          onClick={() => handlePickup(order.id)}
                          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[8px] bg-ember px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#A85418] hover:shadow-md disabled:opacity-60 sm:w-auto"
                          disabled={pickupMutation.isPending}
                        >
                          {pickupMutation.isPending ? 'Updating...' : 'Picked Up'}
                        </button>
                      ) : null}
                      {order.order_status === 'out_for_delivery' ? (
                        <Link
                          to={`/rider/deliveries/${order.id}`}
                          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[8px] border border-live/60 px-4 py-2 text-sm font-medium text-live transition hover:bg-live-l sm:w-auto"
                        >
                          Add Proof & Complete
                        </Link>
                      ) : null}
                      {order.customer?.phone ? (
                        <a
                          href={`tel:${order.customer.phone}`}
                          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[8px] border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface sm:w-auto"
                        >
                          Call
                        </a>
                      ) : null}
                    </>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-[24px] border border-[#eadfc9] bg-[linear-gradient(180deg,#fffdf8_0%,#f8f1e4_100%)] p-5 shadow-[0_18px_40px_rgba(26,25,22,0.08)]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-ink-3">Delivery history</div>
          <h2 className="mt-2 text-2xl font-display font-bold italic text-ink">Completed runs live in a separate page</h2>
          <p className="mt-2 text-sm text-ink-3">
            On mobile, completed deliveries are easier to review from the dedicated history screen instead of at the bottom of the live board.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/rider/history"
            className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#c9a84c] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#d4a843] sm:w-auto"
          >
            Open history
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-sm leading-7 text-ink-3">
            History keeps completed proof images and finished stops in a cleaner archive view, which makes the live board shorter and easier to use on smaller screens.
          </p>
        </div>
      </section>
    </div>
  )
}
