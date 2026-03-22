import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  ClipboardList,
  MapPin,
  Phone,
  ShieldAlert,
  Truck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import AssignRiderModal from '../../components/admin/AssignRiderModal'
import OrderStatusModal from '../../components/admin/OrderStatusModal'
import StatusBadge from '../../components/admin/StatusBadge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import {
  useAdminOrder,
  useAdminOrders,
  useAssignRiderMutation,
  useAvailableRiders,
  useUpdateOrderStatusMutation,
} from '../../hooks/admin/useAdminOrders'
import { useAdminUsers } from '../../hooks/admin/useAdminUsers'
import { getAdminToneClasses, getAdminToneDotClasses } from '../../utils/adminTones'
import { normalizePublicAssetUrl } from '../../utils/storefront'

const ORDER_STEPS = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
]

const EMPTY_LIST = []
const TERMINAL_STATUSES = ['cancelled', 'delivered', 'refunded']
const DISPATCH_STATUSES = ['packed', 'shipped', 'out_for_delivery']

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatStatusLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function buildAddress(address) {
  if (!address) {
    return 'No shipping address attached.'
  }

  return [
    address.recipient_name,
    address.phone,
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.zip_code,
  ]
    .filter(Boolean)
    .join(', ')
}

function minutesSince(value) {
  if (!value) {
    return 0
  }

  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
}

function formatAge(value) {
  const totalMinutes = minutesSince(value)

  if (totalMinutes < 60) {
    return `${totalMinutes}m`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours < 24) {
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`
}

function getOrderFlags(order) {
  if (!order) {
    return []
  }

  const flags = []
  const totalAmount = Number(order.total_amount || 0)
  const ageMinutes = minutesSince(order.created_at)

  if (!order.rider_id && DISPATCH_STATUSES.includes(order.order_status)) {
    flags.push({ label: 'Unassigned dispatch', tone: 'critical' })
  }

  if (order.payment_status === 'failed') {
    flags.push({ label: 'Payment issue', tone: 'critical' })
  }

  if (order.payment_method === 'cod' && totalAmount >= 1000) {
    flags.push({ label: 'High COD', tone: 'warning' })
  }

  if (ageMinutes >= 180 && !TERMINAL_STATUSES.includes(order.order_status)) {
    flags.push({ label: 'Delayed 3h+', tone: 'warning' })
  }

  if (order.order_status === 'delivered' && !order.delivery_proof_url && !order.delivery_proof_notes) {
    flags.push({ label: 'Proof missing', tone: 'critical' })
  }

  return flags
}

function getSuggestedStatuses(order) {
  if (!order || TERMINAL_STATUSES.includes(order.order_status)) {
    return []
  }

  if (order.payment_status === 'failed') {
    return ['cancelled']
  }

  const currentIndex = ORDER_STEPS.indexOf(order.order_status)

  if (currentIndex === -1 || currentIndex === ORDER_STEPS.length - 1) {
    return []
  }

  return ORDER_STEPS.slice(currentIndex + 1, currentIndex + 3)
}

function getRiderAvailability(rider, activeLoadCount) {
  if (!rider?.is_active) {
    return { label: 'Inactive', tone: 'critical' }
  }

  if (activeLoadCount > 0) {
    return { label: 'On run', tone: 'warning' }
  }

  return { label: 'Ready', tone: 'healthy' }
}

function getProofState(order) {
  if (order?.delivery_proof_url || order?.delivery_proof_notes) {
    return { label: 'Submitted', tone: 'healthy' }
  }

  if (order?.order_status === 'delivered') {
    return { label: 'Missing', tone: 'critical' }
  }

  return { label: 'Waiting', tone: 'neutral' }
}

export default function OrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const orderQuery = useAdminOrder(id, { poll: true })
  const ridersQuery = useAvailableRiders()
  const riderDirectoryQuery = useAdminUsers({ role: 'rider', page: 1, perPage: 50 })
  const dispatchOrdersQuery = useAdminOrders({ page: 1, perPage: 100 })
  const updateStatusMutation = useUpdateOrderStatusMutation()
  const assignRiderMutation = useAssignRiderMutation()

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [quickStatusTarget, setQuickStatusTarget] = useState('')
  const [quickAssignRider, setQuickAssignRider] = useState(null)

  const order = orderQuery.data
  const deliveryProofUrl = normalizePublicAssetUrl(order?.delivery_proof_url)

  const riderDirectory = riderDirectoryQuery.data?.items || EMPTY_LIST
  const dispatchOrders = dispatchOrdersQuery.data?.items || EMPTY_LIST
  const orderItems = order?.items || EMPTY_LIST
  const statusLogs = order?.status_logs || EMPTY_LIST

  const riderStatsById = useMemo(
    () => new Map(riderDirectory.map((rider) => [Number(rider.id), rider])),
    [riderDirectory],
  )

  const activeLoadById = useMemo(() => {
    const next = new Map()

    dispatchOrders.forEach((candidate) => {
      if (!candidate.rider_id || !DISPATCH_STATUSES.includes(candidate.order_status)) {
        return
      }

      const riderId = Number(candidate.rider_id)
      next.set(riderId, (next.get(riderId) || 0) + 1)
    })

    return next
  }, [dispatchOrders])

  const orderFlags = useMemo(() => getOrderFlags(order), [order])
  const suggestedStatuses = useMemo(() => getSuggestedStatuses(order), [order])
  const proofState = useMemo(() => getProofState(order), [order])

  const latestLog = useMemo(() => {
    return [...statusLogs].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    )[0]
  }, [statusLogs])

  const currentStep = useMemo(() => {
    const index = ORDER_STEPS.indexOf(order?.order_status || '')
    return index >= 0 ? index : 0
  }, [order?.order_status])

  const assignableRiders = useMemo(() => {
    const toneOrder = { healthy: 0, warning: 1, critical: 2, neutral: 3 }

    return (ridersQuery.data || [])
      .map((rider) => {
        const riderStats = riderStatsById.get(Number(rider.id))
        const activeLoadCount = activeLoadById.get(Number(rider.id)) || 0
        const availability = getRiderAvailability(
          riderStats || { ...rider, is_active: rider.is_active ?? true },
          activeLoadCount,
        )

        return {
          ...rider,
          is_active: riderStats?.is_active ?? rider.is_active ?? true,
          active_load_count: activeLoadCount,
          assigned_orders_count: Number(riderStats?.assigned_orders_count || 0),
          availability,
        }
      })
      .sort((left, right) => {
        const toneDifference =
          (toneOrder[left.availability.tone] ?? 10) - (toneOrder[right.availability.tone] ?? 10)

        if (toneDifference !== 0) {
          return toneDifference
        }

        if (left.active_load_count !== right.active_load_count) {
          return left.active_load_count - right.active_load_count
        }

        return String(left.name || '').localeCompare(String(right.name || ''))
      })
  }, [activeLoadById, riderStatsById, ridersQuery.data])

  const topRiderSuggestions = assignableRiders.slice(0, 3)

  const currentRiderStats = order?.rider_id ? riderStatsById.get(Number(order.rider_id)) || null : null

  const currentRiderLoad = order?.rider_id ? activeLoadById.get(Number(order.rider_id)) || 0 : 0
  const currentRiderAvailability = order?.rider_id
    ? getRiderAvailability(currentRiderStats || { is_active: true }, currentRiderLoad)
    : null

  const financialRows = useMemo(() => {
    if (!order) {
      return []
    }

    const discountAmount = Number(order.discount_amount || 0)

    return [
      { label: 'Subtotal', value: formatCurrency(order.subtotal) },
      { label: 'Shipping', value: formatCurrency(order.shipping_fee) },
      {
        label: 'Discount',
        value: discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : formatCurrency(discountAmount),
      },
      { label: 'Total', value: formatCurrency(order.total_amount), emphasized: true },
    ]
  }, [order])

  const commandSummaryCards = useMemo(() => {
    if (!order) {
      return []
    }

    return [
      {
        label: 'Order value',
        value: formatCurrency(order.total_amount),
        helper: order.payment_method === 'cod' ? 'Collect on delivery' : 'Paid online',
      },
      {
        label: 'Order age',
        value: formatAge(order.created_at),
        helper: `Created ${formatDateTime(order.created_at)}`,
      },
      {
        label: 'Items',
        value: String(orderItems.length),
        helper: `${orderItems.reduce((total, item) => total + Number(item.quantity || 0), 0)} units`,
      },
      {
        label: 'Proof',
        value: proofState.label,
        helper: latestLog ? `Last touched ${formatDateTime(latestLog.created_at)}` : 'Waiting for next update',
        tone: proofState.tone,
      },
    ]
  }, [latestLog, order, orderItems, proofState])

  const canAssignRider = order && !TERMINAL_STATUSES.includes(order.order_status)

  const handleQuickStatusConfirm = async () => {
    if (!order?.id || !quickStatusTarget) {
      return
    }

    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        orderStatus: quickStatusTarget,
        note: '',
      })
      toast.success(`Order moved to ${formatStatusLabel(quickStatusTarget)}.`)
      setQuickStatusTarget('')
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update order.')
    }
  }

  const handleQuickAssignConfirm = async () => {
    if (!order?.id || !quickAssignRider?.id) {
      return
    }

    try {
      await assignRiderMutation.mutateAsync({
        orderId: order.id,
        riderId: Number(quickAssignRider.id),
      })
      toast.success(`Assigned to ${quickAssignRider.name}.`)
      setQuickAssignRider(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to assign rider.')
    }
  }

  if (orderQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <ErrorState
        title="Order not found."
        description="The admin order detail request failed."
        onAction={() => orderQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="inline-flex items-center gap-2 text-sm text-[#7a7a7a] transition hover:text-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </button>
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7e58]">
            Order Detail
          </div>
          <h1 className="mt-2 text-4xl font-extrabold text-[#1a1a1a]">{order.order_number}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={order.order_status} />
            <StatusBadge status={order.payment_status} />
            <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
              {String(order.payment_method || '').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.customer?.phone ? (
            <a
              href={`tel:${order.customer.phone}`}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface"
            >
              <Phone className="h-4 w-4" />
              Call customer
            </a>
          ) : null}
          {canAssignRider ? (
            <Button variant="secondary" onClick={() => setAssignModalOpen(true)}>
              <Truck className="h-4 w-4" />
              Browse riders
            </Button>
          ) : null}
          <Button onClick={() => setStatusModalOpen(true)}>Full status editor</Button>
        </div>
      </div>

      <section className="first-light-shell-card rounded-[30px] p-6">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
              <AlertTriangle className="h-4 w-4 text-[#8a6400]" />
              Order command
            </div>
            <h2 className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
              Act on status, dispatch, and risk without leaving this page
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {orderFlags.length === 0 ? (
                <span className="rounded-full border border-[#d8eadf] bg-[#edf8f0] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#23613a]">
                  No active exceptions
                </span>
              ) : (
                orderFlags.map((flag) => (
                  <span
                    key={flag.label}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]',
                      getAdminToneClasses(flag.tone),
                    ].join(' ')}
                  >
                    <span
                      className={['h-1.5 w-1.5 rounded-full', getAdminToneDotClasses(flag.tone)].join(' ')}
                    />
                    {flag.label}
                  </span>
                ))
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {suggestedStatuses.map((status, index) => (
                <Button
                  key={status}
                  variant={index === 0 ? 'primary' : 'secondary'}
                  className="rounded-full px-5"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => setQuickStatusTarget(status)}
                >
                  Mark {formatStatusLabel(status)}
                </Button>
              ))}

              {!order.rider_id && topRiderSuggestions[0] && canAssignRider ? (
                <Button
                  variant="secondary"
                  className="rounded-full px-5"
                  disabled={assignRiderMutation.isPending}
                  onClick={() => setQuickAssignRider(topRiderSuggestions[0])}
                >
                  Assign {topRiderSuggestions[0].name}
                </Button>
              ) : null}

              {suggestedStatuses.length === 0 && (!canAssignRider || order.rider_id || !topRiderSuggestions[0]) ? (
                <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                  No quick actions pending
                </span>
              ) : null}
            </div>

            <div className="mt-4 text-sm text-[#666666]">
              {latestLog
                ? `Last admin touch ${formatDateTime(latestLog.created_at)} by ${latestLog.user?.name || 'System'}.`
                : `Created ${formatDateTime(order.created_at)}.`}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {commandSummaryCards.map((card) => (
              <div
                key={card.label}
                className={[
                  'rounded-[20px] border bg-[#fcfaf4] px-4 py-4',
                  card.tone ? getAdminToneClasses(card.tone) : 'border-[#ece4d5] text-[#1a1a1a]',
                ].join(' ')}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                  {card.label}
                </div>
                <div className="mt-2 text-xl font-bold text-[#1a1a1a]">{card.value}</div>
                <div className="mt-2 text-xs text-[#666666]">{card.helper}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="first-light-shell-card rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
              Order lifecycle
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-[#1a1a1a]">
              Current stage: {formatStatusLabel(order.order_status)}
            </h2>
          </div>
          <div className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
            Refreshed every 10s
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {ORDER_STEPS.map((step, index) => {
            const isCancelled = ['cancelled', 'refunded'].includes(order.order_status)
            const isComplete = !isCancelled && index <= currentStep
            const isActive = !isCancelled && index === currentStep

            return (
              <div
                key={step}
                className={[
                  'rounded-2xl border px-3 py-4 text-center',
                  isCancelled
                    ? 'border-[#f0b9b9] bg-[#fff1f1] text-[#9b3535]'
                    : isComplete
                      ? 'border-[#bfe1c8] bg-[#edf8f0] text-[#23613a]'
                      : 'border-[#ddd5c4] bg-[#f6f3ec] text-[#5f5642]',
                ].join(' ')}
              >
                <div
                  className={[
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium',
                    isCancelled
                      ? 'border-[#f0b9b9] bg-[#fff1f1]'
                      : isComplete
                        ? 'border-[#bfe1c8] bg-[#edf8f0]'
                        : 'border-[#ddd5c4] bg-white',
                    isActive ? 'animate-status-pulse' : '',
                  ].join(' ')}
                >
                  {index + 1}
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.14em]">
                  {formatStatusLabel(step)}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-6">
          <div className="first-light-shell-card rounded-[28px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                  <ClipboardList className="h-4 w-4 text-[#8a6400]" />
                  Order Items
                </div>
                <div className="mt-2 text-sm text-[#666666]">
                  {orderItems.length} lines and {orderItems.reduce((total, item) => total + Number(item.quantity || 0), 0)} units
                </div>
              </div>
              <div className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                Total {formatCurrency(order.total_amount)}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#1a1a1a]">{item.product_name}</div>
                      <div className="mt-1 text-xs font-mono text-[#7a7a7a]">
                        {item.product_sku || 'No SKU captured'}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold text-[#8d6b12]">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                      Qty {item.quantity}
                    </span>
                    {item.selected_size ? (
                      <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                        Size {item.selected_size}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                      Unit {formatCurrency(item.unit_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="first-light-shell-card rounded-[28px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                  Status Log
                </div>
                <div className="mt-2 text-sm text-[#666666]">
                  Latest operational updates for this order
                </div>
              </div>
              <div className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                {statusLogs.length} entries
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {statusLogs.length === 0 ? (
                <div className="rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-5 text-sm italic text-[#7a7a7a]">
                  No status logs yet.
                </div>
              ) : (
                statusLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#8a6400]" />
                      <span className="mt-2 h-full w-px bg-[#ece4d5]" />
                    </div>
                    <div className="flex-1 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={log.order_status} />
                          <span className="text-xs text-[#7a7a7a]">
                            by {log.user?.name || 'System'}
                          </span>
                        </div>
                        <div className="text-xs text-[#7a7a7a]">{formatDateTime(log.created_at)}</div>
                      </div>
                      {log.note ? (
                        <div className="mt-3 text-sm leading-7 text-[#1a1a1a]">{log.note}</div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
 
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <div className="first-light-shell-card rounded-[28px] p-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
              <MapPin className="h-4 w-4 text-[#8a6400]" />
              Customer and dispatch
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-[#1a1a1a]">
              {order.customer?.name || 'Customer'}
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4 text-sm text-[#1a1a1a]">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                  Email
                </div>
                <div className="mt-2 break-all">{order.customer?.email || '-'}</div>
              </div>
              <div className="rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4 text-sm text-[#1a1a1a]">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                  Phone
                </div>
                <div className="mt-2">{order.customer?.phone || '-'}</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                Shipping Address
              </div>
              <div className="mt-3 text-sm leading-7 text-[#666666]">{buildAddress(order.shipping_address)}</div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                    Assigned Rider
                  </div>
                  <div className="mt-2 text-sm font-bold text-[#1a1a1a]">
                    {order.rider?.name || 'Unassigned'}
                  </div>
                  <div className="mt-1 text-xs text-[#7a7a7a]">
                    {order.rider?.phone || order.rider?.email || 'Pick a rider to move dispatch forward.'}
                  </div>
                </div>

                {currentRiderAvailability ? (
                  <span
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                      getAdminToneClasses(currentRiderAvailability.tone),
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        getAdminToneDotClasses(currentRiderAvailability.tone),
                      ].join(' ')}
                    />
                    {currentRiderAvailability.label}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#ece4d5] bg-white px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                    Active Load
                  </div>
                  <div className="mt-2 text-lg font-bold text-[#1a1a1a]">{currentRiderLoad}</div>
                </div>
                <div className="rounded-xl border border-[#ece4d5] bg-white px-4 py-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                    Completed
                  </div>
                  <div className="mt-2 text-lg font-bold text-[#1a1a1a]">
                    {Number(currentRiderStats?.assigned_orders_count || 0)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {order.rider?.phone ? (
                  <a
                    href={`tel:${order.rider.phone}`}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface"
                  >
                    <Phone className="h-4 w-4" />
                    Call rider
                  </a>
                ) : null}
                {canAssignRider ? (
                  <Button variant="secondary" onClick={() => setAssignModalOpen(true)}>
                    Reassign
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="first-light-shell-card rounded-[28px] p-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
              <Clock3 className="h-4 w-4 text-[#8a6400]" />
              Payment and note
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={order.payment_status} />
              <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                {String(order.payment_method || '').toUpperCase()}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {financialRows.map((row) => (
                <div
                  key={row.label}
                  className={[
                    'flex items-center justify-between gap-4 rounded-2xl border px-4 py-4',
                    row.emphasized
                      ? 'border-[#ecd18c] bg-[#fff7de]'
                      : 'border-[#ece4d5] bg-[#fcfaf4]',
                  ].join(' ')}
                >
                  <span className="text-sm text-[#5f5642]">{row.label}</span>
                  <span
                    className={[
                      'font-mono text-sm font-bold',
                      row.emphasized ? 'text-[#8d6b12]' : 'text-[#1a1a1a]',
                    ].join(' ')}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                Customer Note
              </div>
              <div className="mt-3 text-sm leading-7 text-[#1a1a1a]">
                {order.notes || 'No customer note attached to this order.'}
              </div>
            </div>

            <div className="mt-4 text-xs text-[#7a7a7a]">
              Paid at {formatDateTime(order.payment?.paid_at)}. Last updated{' '}
              {formatDateTime(latestLog?.created_at || order.updated_at)}.
            </div>
          </div>

          <div className="first-light-shell-card rounded-[28px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                  Proof Of Delivery
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1a1a1a]">
                  Rider completion evidence
                </div>
              </div>
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                  getAdminToneClasses(proofState.tone),
                ].join(' ')}
              >
                <span className={['h-1.5 w-1.5 rounded-full', getAdminToneDotClasses(proofState.tone)].join(' ')} />
                {proofState.label}
              </span>
            </div>

            {deliveryProofUrl ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#ece4d5] bg-[#fcfaf4]">
                <img
                  src={deliveryProofUrl}
                  alt="Delivery proof"
                  className="h-64 w-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-5 flex h-44 items-center justify-center rounded-2xl border border-dashed border-[#ddd5c4] bg-[#fcfaf4] px-4 text-center text-sm text-[#7a7a7a]">
                No proof image uploaded yet.
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm leading-7 text-[#1a1a1a]">
                {order.delivery_proof_notes || 'No rider delivery note recorded.'}
              </div>
              {deliveryProofUrl ? (
                <a
                  href={deliveryProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold text-gold underline decoration-gold/60 decoration-2 underline-offset-4"
                >
                  Open full image
                </a>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                  Delivered At
                </div>
                <div className="mt-2 text-sm text-[#1a1a1a]">{formatDateTime(order.delivered_at)}</div>
              </div>
              <div className="rounded-xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                  COD Amount
                </div>
                <div className="mt-2 font-mono text-sm text-[#8d6b12]">
                  {order.payment_method === 'cod' ? formatCurrency(order.total_amount) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="first-light-shell-card rounded-[28px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                  <ShieldAlert className="h-4 w-4 text-[#8a6400]" />
                  Dispatch readiness
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1a1a1a]">
                  Best riders for reassignment
                </div>
              </div>
              <div className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                {assignableRiders.length} candidates
              </div>
            </div>

            <div className="mt-3 text-sm text-[#666666]">
              Lightest load appears first so dispatch can move without opening a separate board.
            </div>

            {ridersQuery.isLoading || riderDirectoryQuery.isLoading || dispatchOrdersQuery.isLoading ? (
              <div className="mt-5 flex items-center justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : topRiderSuggestions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-5 text-sm text-[#666666]">
                No rider candidates are available right now.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {topRiderSuggestions.map((rider, index) => {
                  const isCurrentRider = Number(order.rider_id) === Number(rider.id)

                  return (
                    <div
                      key={rider.id}
                      className={[
                        'rounded-2xl border px-4 py-4',
                        index === 0 ? 'border-[#ecd18c] bg-[#fff7de]' : 'border-[#ece4d5] bg-[#fcfaf4]',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[#1a1a1a]">{rider.name}</div>
                          <div className="mt-1 text-xs text-[#7a7a7a]">
                            {rider.phone || rider.email || 'No rider contact available'}
                          </div>
                        </div>
                        <span
                          className={[
                            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                            getAdminToneClasses(rider.availability.tone),
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'h-1.5 w-1.5 rounded-full',
                              getAdminToneDotClasses(rider.availability.tone),
                            ].join(' ')}
                          />
                          {rider.availability.label}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[#ece4d5] bg-white px-4 py-4">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                            Active Load
                          </div>
                          <div className="mt-2 text-lg font-bold text-[#1a1a1a]">
                            {rider.active_load_count}
                          </div>
                        </div>
                        <div className="rounded-xl border border-[#ece4d5] bg-white px-4 py-4">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                            Completed
                          </div>
                          <div className="mt-2 text-lg font-bold text-[#1a1a1a]">
                            {rider.assigned_orders_count}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {rider.phone ? (
                          <a
                            href={`tel:${rider.phone}`}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface"
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </a>
                        ) : null}
                        {canAssignRider ? (
                          <Button
                            className="flex-1"
                            disabled={assignRiderMutation.isPending || isCurrentRider}
                            variant={index === 0 && !isCurrentRider ? 'primary' : 'secondary'}
                            onClick={() => setQuickAssignRider(rider)}
                          >
                            {isCurrentRider ? 'Already assigned' : 'Assign now'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {statusModalOpen ? (
        <OrderStatusModal
          key={`detail-status-${order.id}`}
          open={statusModalOpen}
          order={order}
          isSubmitting={updateStatusMutation.isPending}
          onClose={() => {
            if (!updateStatusMutation.isPending) {
              setStatusModalOpen(false)
            }
          }}
          onSubmit={(payload) => updateStatusMutation.mutateAsync(payload)}
        />
      ) : null}

      {assignModalOpen ? (
        <AssignRiderModal
          key={`detail-assign-${order.id}`}
          open={assignModalOpen}
          order={order}
          riders={assignableRiders}
          isLoadingRiders={
            ridersQuery.isLoading || riderDirectoryQuery.isLoading || dispatchOrdersQuery.isLoading
          }
          isSubmitting={assignRiderMutation.isPending}
          onClose={() => {
            if (!assignRiderMutation.isPending) {
              setAssignModalOpen(false)
            }
          }}
          onSubmit={(payload) => assignRiderMutation.mutateAsync(payload)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(quickStatusTarget)}
        title={
          quickStatusTarget
            ? `Move order to ${formatStatusLabel(quickStatusTarget)}?`
            : 'Move order'
        }
        message={
          quickStatusTarget
            ? `This will update ${order.order_number} from ${formatStatusLabel(order.order_status)} to ${formatStatusLabel(quickStatusTarget)}.`
            : ''
        }
        confirmLabel={quickStatusTarget ? `Mark ${formatStatusLabel(quickStatusTarget)}` : 'Confirm'}
        isSubmitting={updateStatusMutation.isPending}
        onClose={() => {
          if (!updateStatusMutation.isPending) {
            setQuickStatusTarget('')
          }
        }}
        onConfirm={handleQuickStatusConfirm}
      />

      <ConfirmDialog
        open={Boolean(quickAssignRider)}
        title={quickAssignRider ? `Assign ${quickAssignRider.name}?` : 'Assign rider'}
        message={
          quickAssignRider
            ? `Dispatch ${order.order_number} to ${quickAssignRider.name}. Current active load: ${quickAssignRider.active_load_count || 0}.`
            : ''
        }
        confirmLabel="Confirm assignment"
        isSubmitting={assignRiderMutation.isPending}
        onClose={() => {
          if (!assignRiderMutation.isPending) {
            setQuickAssignRider(null)
          }
        }}
        onConfirm={handleQuickAssignConfirm}
      />
    </div>
  )
}
