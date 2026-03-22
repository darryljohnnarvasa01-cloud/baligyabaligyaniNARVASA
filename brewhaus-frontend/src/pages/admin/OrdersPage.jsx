import { AlertTriangle, PackageCheck, PackageSearch, Truck, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import AssignRiderModal from '../../components/admin/AssignRiderModal'
import OrderStatusModal from '../../components/admin/OrderStatusModal'
import StatusBadge from '../../components/admin/StatusBadge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import {
  useAdminOrders,
  useAssignRiderMutation,
  useAvailableRiders,
  useUpdateOrderStatusMutation,
} from '../../hooks/admin/useAdminOrders'
import { useAdminUsers } from '../../hooks/admin/useAdminUsers'
import { getAdminToneClasses, getAdminToneDotClasses } from '../../utils/adminTones'
import { formatCurrency } from '../../utils/storefront'

const TERMINAL_STATUSES = ['cancelled', 'delivered', 'refunded']
const DISPATCH_STATUSES = ['packed', 'shipped', 'out_for_delivery']
const EMPTY_LIST = []

const ORDER_STATUS_OPTIONS = [
  '',
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]

const PAYMENT_STATUS_OPTIONS = ['', 'pending', 'paid', 'failed', 'refunded']
const PAYMENT_METHOD_OPTIONS = ['', 'gcash', 'paymaya', 'cod']

const PIPELINE_SUMMARY = [
  { id: 'pending', title: 'Pending', description: 'Needs confirmation', matches: (order) => order.order_status === 'pending' },
  { id: 'prep', title: 'Prep', description: 'Confirmed or processing', matches: (order) => ['confirmed', 'processing'].includes(order.order_status) },
  { id: 'dispatch', title: 'Dispatch', description: 'Packed or shipped', matches: (order) => ['packed', 'shipped'].includes(order.order_status) },
  { id: 'live', title: 'Live', description: 'Out for delivery', matches: (order) => order.order_status === 'out_for_delivery' },
  { id: 'done', title: 'Delivered', description: 'Completed', matches: (order) => order.order_status === 'delivered' },
]

function formatDateTime(value) {
  if (!value) return '-'
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

function minutesSince(value) {
  if (!value) return 0
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
}

function getOrderExceptionFlags(order) {
  if (TERMINAL_STATUSES.includes(order.order_status)) return []

  const flags = []
  const ageMinutes = minutesSince(order.created_at)
  const totalAmount = Number(order.total_amount || 0)

  if (!order.rider_id && DISPATCH_STATUSES.includes(order.order_status)) {
    flags.push({ label: 'Unassigned', tone: 'critical' })
  }

  if (order.payment_status === 'failed') {
    flags.push({ label: 'Payment Issue', tone: 'critical' })
  }

  if (ageMinutes >= 180) {
    flags.push({ label: 'Delayed 3h+', tone: 'critical' })
  } else if (ageMinutes >= 90) {
    flags.push({ label: 'Aging', tone: 'warning' })
  }

  if (order.payment_method === 'cod' && totalAmount >= 1000) {
    flags.push({ label: 'High COD', tone: 'warning' })
  }

  return flags
}

function getOrderExceptionScore(order) {
  return getOrderExceptionFlags(order).reduce((score, flag) => {
    if (flag.tone === 'critical') return score + 3
    if (flag.tone === 'warning') return score + 1
    return score
  }, 0)
}

function getRiderAvailability(rider, activeLoadCount) {
  if (!rider.is_active) return { label: 'Inactive', tone: 'critical' }
  if (activeLoadCount > 0) return { label: 'On run', tone: 'warning' }
  return { label: 'Ready', tone: 'healthy' }
}

function SummaryCard({ icon, label, value, helper }) {
  return (
    <div className="first-light-shell-card rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-full bg-[#faf3da] p-2 text-[#8a6400]">{icon}</div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
          {helper}
        </div>
      </div>
      <div className="mt-4 text-3xl font-extrabold text-[#1a1a1a]">{value}</div>
      <div className="mt-2 text-sm text-[#666666]">{label}</div>
    </div>
  )
}

export default function OrdersPage() {
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    method: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    perPage: 12,
  })
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState(null)
  const [bulkStatus, setBulkStatus] = useState({ orderStatus: 'confirmed', note: '' })
  const [bulkAssignment, setBulkAssignment] = useState({ riderId: '', note: '' })

  const ordersQuery = useAdminOrders(filters)
  const ridersQuery = useAvailableRiders()
  const riderDirectoryQuery = useAdminUsers({ role: 'rider', page: 1, perPage: 50 })
  const dispatchOrdersQuery = useAdminOrders({
    status: '',
    paymentStatus: '',
    method: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    perPage: 100,
  })
  const updateStatusMutation = useUpdateOrderStatusMutation()
  const assignRiderMutation = useAssignRiderMutation()

  const orders = ordersQuery.data?.items ?? EMPTY_LIST
  const meta = ordersQuery.data?.meta
  const dispatchOrders = dispatchOrdersQuery.data?.items ?? EMPTY_LIST
  const riderDirectory = riderDirectoryQuery.data?.items ?? EMPTY_LIST

  const riderStatsById = useMemo(
    () => new Map(riderDirectory.map((rider) => [Number(rider.id), rider])),
    [riderDirectory],
  )

  const riderLoadById = useMemo(() => {
    const next = new Map()
    dispatchOrders.forEach((order) => {
      if (!order.rider_id || !DISPATCH_STATUSES.includes(order.order_status)) return
      const riderId = Number(order.rider_id)
      next.set(riderId, (next.get(riderId) || 0) + 1)
    })
    return next
  }, [dispatchOrders])

  const assignableRiders = useMemo(
    () =>
      (ridersQuery.data ?? EMPTY_LIST)
        .map((rider) => {
          const riderStats = riderStatsById.get(Number(rider.id))
          return {
            ...rider,
            active_load_count: riderLoadById.get(Number(rider.id)) || 0,
            assigned_orders_count: riderStats?.assigned_orders_count || 0,
          }
        })
        .sort((left, right) => {
          if (left.active_load_count !== right.active_load_count) {
            return left.active_load_count - right.active_load_count
          }
          return String(left.name || '').localeCompare(String(right.name || ''))
        }),
    [riderLoadById, riderStatsById, ridersQuery.data],
  )

  const orderRows = useMemo(
    () =>
      [...orders]
        .map((order) => ({
          order,
          flags: getOrderExceptionFlags(order),
          score: getOrderExceptionScore(order),
        }))
        .sort((left, right) => {
          if (right.score !== left.score) return right.score - left.score
          if (left.score > 0 && right.score > 0) {
            return new Date(left.order.created_at).getTime() - new Date(right.order.created_at).getTime()
          }
          return new Date(right.order.created_at).getTime() - new Date(left.order.created_at).getTime()
        }),
    [orders],
  )

  const exceptionRows = orderRows.filter((row) => row.score > 0)
  const selectedOrders = orderRows
    .filter((row) => selectedOrderIds.includes(row.order.id))
    .map((row) => row.order)
  const selectableOrderIds = orderRows
    .filter((row) => !TERMINAL_STATUSES.includes(row.order.order_status))
    .map((row) => row.order.id)
  const allSelectableChecked =
    selectableOrderIds.length > 0 &&
    selectableOrderIds.every((orderId) => selectedOrderIds.includes(orderId))

  const pendingReviewCount = dispatchOrders.filter((order) => order.order_status === 'pending').length
  const queueOrders = dispatchOrders.filter(
    (order) => !order.rider_id && ['packed', 'shipped'].includes(order.order_status),
  )
  const liveOrders = dispatchOrders.filter(
    (order) => order.rider_id && order.order_status === 'out_for_delivery',
  )
  const codExposure = dispatchOrders
    .filter(
      (order) =>
        order.payment_method === 'cod' &&
        ['packed', 'shipped', 'out_for_delivery'].includes(order.order_status),
    )
    .reduce((total, order) => total + Number(order.total_amount || 0), 0)

  const pipelineSummary = PIPELINE_SUMMARY.map((column) => ({
    ...column,
    count: dispatchOrders.filter((order) => column.matches(order)).length,
  }))

  const riderLoadCards = [...riderDirectory]
    .map((rider) => {
      const activeLoadCount = riderLoadById.get(Number(rider.id)) || 0
      return {
        ...rider,
        activeLoadCount,
        availability: getRiderAvailability(rider, activeLoadCount),
      }
    })
    .sort((left, right) => {
      if (right.activeLoadCount !== left.activeLoadCount) {
        return right.activeLoadCount - left.activeLoadCount
      }
      return String(left.name || '').localeCompare(String(right.name || ''))
    })

  const canAssignRider = (order) => !TERMINAL_STATUSES.includes(order.order_status)
  const canUpdateStatus = (order) => !TERMINAL_STATUSES.includes(order.order_status)

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }))
  }

  const resetFilters = () => {
    setFilters({
      status: '',
      paymentStatus: '',
      method: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      perPage: 12,
    })
  }

  const openAssignModal = (order) => {
    setSelectedOrder(order)
    setAssignModalOpen(true)
  }

  const openStatusModal = (order) => {
    setSelectedOrder(order)
    setStatusModalOpen(true)
  }

  const toggleSelectedOrder = (orderId) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((value) => value !== orderId)
        : [...current, orderId],
    )
  }

  const toggleSelectAll = () => {
    setSelectedOrderIds((current) =>
      allSelectableChecked
        ? current.filter((id) => !selectableOrderIds.includes(id))
        : selectableOrderIds,
    )
  }

  const closeBulkDialog = () => {
    if (updateStatusMutation.isPending || assignRiderMutation.isPending) return
    setBulkAction(null)
    setBulkStatus({ orderStatus: 'confirmed', note: '' })
    setBulkAssignment({ riderId: '', note: '' })
  }

  const handleBulkStatus = async () => {
    const eligibleOrders = selectedOrders.filter(canUpdateStatus)
    if (!eligibleOrders.length || !bulkStatus.orderStatus) return

    const results = await Promise.allSettled(
      eligibleOrders.map((order) =>
        updateStatusMutation.mutateAsync({
          orderId: order.id,
          orderStatus: bulkStatus.orderStatus,
          note: bulkStatus.note,
        }),
      ),
    )

    const successCount = results.filter((result) => result.status === 'fulfilled').length
    if (successCount > 0) {
      toast.success(`Updated ${successCount} order${successCount === 1 ? '' : 's'}.`)
      setSelectedOrderIds((current) =>
        current.filter((id) => !eligibleOrders.some((order) => order.id === id)),
      )
      closeBulkDialog()
      return
    }

    const rejected = results.find((result) => result.status === 'rejected')
    toast.error(
      rejected?.reason?.response?.data?.message ||
        rejected?.reason?.message ||
        'Failed to update the selected orders.',
    )
  }

  const handleBulkAssign = async () => {
    const eligibleOrders = selectedOrders.filter(canAssignRider)
    if (!eligibleOrders.length || !bulkAssignment.riderId) return

    const results = await Promise.allSettled(
      eligibleOrders.map((order) =>
        assignRiderMutation.mutateAsync({
          orderId: order.id,
          riderId: Number(bulkAssignment.riderId),
          note: bulkAssignment.note,
        }),
      ),
    )

    const successCount = results.filter((result) => result.status === 'fulfilled').length
    if (successCount > 0) {
      toast.success(`Assigned rider to ${successCount} order${successCount === 1 ? '' : 's'}.`)
      setSelectedOrderIds((current) =>
        current.filter((id) => !eligibleOrders.some((order) => order.id === id)),
      )
      closeBulkDialog()
      return
    }

    const rejected = results.find((result) => result.status === 'rejected')
    toast.error(
      rejected?.reason?.response?.data?.message ||
        rejected?.reason?.message ||
        'Failed to assign the selected orders.',
    )
  }

  return (
    <div className="min-w-0 space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7e58]">
            Orders
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-[#1a1a1a]">
            Fulfillment command board
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#666666]">
            Exception orders stay visible first, rider load stays inline, and multi-order actions are handled from one workspace.
          </p>
        </div>
        <div className="text-sm text-[#7a7a7a]">
          {ordersQuery.isFetching || dispatchOrdersQuery.isFetching
            ? 'Refreshing orders...'
            : 'Latest 100 orders powering dispatch insights'}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          helper="New orders waiting"
          icon={<PackageSearch className="h-4 w-4" />}
          label="Pending review"
          value={pendingReviewCount}
        />
        <SummaryCard
          helper="Pinned to the top"
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Exceptions"
          value={exceptionRows.length}
        />
        <SummaryCard
          helper="Currently on the road"
          icon={<Truck className="h-4 w-4" />}
          label="Live runs"
          value={liveOrders.length}
        />
        <SummaryCard
          helper="Cash in active delivery"
          icon={<PackageCheck className="h-4 w-4" />}
          label="COD exposure"
          value={formatCurrency(codExposure)}
        />
      </section>

      <section className="first-light-shell-card rounded-[28px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
              Fulfillment lanes
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-[#1a1a1a]">
              Current movement at a glance
            </h2>
          </div>
          <div className="rounded-full border border-[#e7dfcd] bg-[#fff9eb] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6400]">
            Queue waiting for rider: {queueOrders.length}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {pipelineSummary.map((column) => (
            <div
              key={column.id}
              className="rounded-[24px] border border-[#e6decd] bg-[#fcfaf4] px-4 py-4"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                {column.title}
              </div>
              <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">{column.count}</div>
              <div className="mt-2 text-sm text-[#666666]">{column.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="first-light-shell-card rounded-[28px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                Exception queue
              </div>
              <h2 className="mt-3 text-2xl font-extrabold text-[#1a1a1a]">
                Orders pinned for action
              </h2>
            </div>
            <div className="rounded-full border border-[#ecd0d0] bg-[#fff4f4] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b3535]">
              {exceptionRows.length} exception orders
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {dispatchOrdersQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="h-12 w-12" />
              </div>
            ) : exceptionRows.length === 0 ? (
              <EmptyState
                title="No active exceptions."
                description="Unassigned, delayed, and COD-heavy orders will appear here automatically."
                titleClassName="text-xl font-extrabold text-[#1a1a1a]"
              />
            ) : (
              exceptionRows.slice(0, 6).map(({ order, flags }) => {
                const riderLoadCount = order.rider_id
                  ? riderLoadById.get(Number(order.rider_id)) || 0
                  : 0

                return (
                  <article
                    key={order.id}
                    className="rounded-[24px] border border-[#e6decd] bg-[#fcfaf4] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-mono text-sm font-bold text-[#8d6b12] transition hover:text-[#1a1a1a]"
                        >
                          {order.order_number}
                        </Link>
                        <div className="mt-2 text-sm font-bold text-[#1a1a1a]">
                          {order.customer?.name || 'Guest'}
                        </div>
                        <div className="mt-1 text-xs text-[#777777]">
                          {formatDateTime(order.created_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-[#1a1a1a]">
                          {formatCurrency(order.total_amount)}
                        </div>
                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          <StatusBadge status={order.order_status} />
                          <StatusBadge status={order.payment_status} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {flags.map((flag) => (
                        <span
                          key={`${order.id}-${flag.label}`}
                          className={[
                            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                            getAdminToneClasses(flag.tone),
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'h-1.5 w-1.5 rounded-full',
                              getAdminToneDotClasses(flag.tone),
                            ].join(' ')}
                          />
                          {flag.label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="text-sm text-[#666666]">
                        Rider:{' '}
                        <span className="font-bold text-[#1a1a1a]">
                          {order.rider?.name || 'Unassigned'}
                        </span>
                        {order.rider_id ? ` • ${riderLoadCount} active load` : ''}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canAssignRider(order) ? (
                          <Button className="px-3 py-2 text-[11px]" onClick={() => openAssignModal(order)}>
                            Assign rider
                          </Button>
                        ) : null}
                        {canUpdateStatus(order) ? (
                          <Button
                            className="px-3 py-2 text-[11px]"
                            onClick={() => openStatusModal(order)}
                            variant="secondary"
                          >
                            Update status
                          </Button>
                        ) : null}
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="first-light-chip-button inline-flex min-h-[40px] items-center rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>

        <div className="first-light-shell-card rounded-[28px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
                Rider load
              </div>
              <h2 className="mt-3 text-2xl font-extrabold text-[#1a1a1a]">
                Dispatch readiness
              </h2>
            </div>
            <div className="rounded-full border border-[#d8eadf] bg-[#edf8f0] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#23613a]">
              <Users className="mr-2 inline h-4 w-4" />
              {
                riderLoadCards.filter((rider) => rider.availability.label === 'Ready').length
              } ready
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {riderDirectoryQuery.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="h-12 w-12" />
              </div>
            ) : riderLoadCards.length === 0 ? (
              <EmptyState
                description="Create rider accounts from the directory to start assigning deliveries."
                title="No riders found."
                titleClassName="text-xl font-extrabold text-[#1a1a1a]"
              />
            ) : (
              riderLoadCards.map((rider) => (
                <div
                  key={rider.id}
                  className="rounded-[22px] border border-[#e6decd] bg-[#fcfaf4] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#1a1a1a]">{rider.name}</div>
                      <div className="mt-1 text-xs text-[#777777]">
                        {rider.phone || rider.email || 'No contact available'}
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

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-[16px] bg-white px-3 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                        Active
                      </div>
                      <div className="mt-2 text-lg font-extrabold text-[#1a1a1a]">
                        {rider.activeLoadCount}
                      </div>
                    </div>
                    <div className="rounded-[16px] bg-white px-3 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                        Delivered
                      </div>
                      <div className="mt-2 text-lg font-extrabold text-[#1a1a1a]">
                        {rider.assigned_orders_count || 0}
                      </div>
                    </div>
                    <div className="rounded-[16px] bg-white px-3 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                        Status
                      </div>
                      <div className="mt-2 text-sm font-extrabold text-[#1a1a1a]">
                        {rider.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="first-light-shell-card rounded-[28px] p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              Order status
            </div>
            <select
              className="first-light-field mt-2"
              onChange={(event) => updateFilter('status', event.target.value)}
              value={filters.status}
            >
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status ? formatStatusLabel(status) : 'All statuses'}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              Payment status
            </div>
            <select
              className="first-light-field mt-2"
              onChange={(event) => updateFilter('paymentStatus', event.target.value)}
              value={filters.paymentStatus}
            >
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status ? formatStatusLabel(status) : 'All payments'}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              Payment method
            </div>
            <select
              className="first-light-field mt-2"
              onChange={(event) => updateFilter('method', event.target.value)}
              value={filters.method}
            >
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method || 'all'} value={method}>
                  {method || 'All methods'}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              Date from
            </div>
            <input
              className="first-light-field mt-2"
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
              type="date"
              value={filters.dateFrom}
            />
          </label>

          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              Date to
            </div>
            <input
              className="first-light-field mt-2"
              onChange={(event) => updateFilter('dateTo', event.target.value)}
              type="date"
              value={filters.dateTo}
            />
          </label>

          <div className="flex items-end">
            <Button className="w-full" onClick={resetFilters} variant="secondary">
              Reset filters
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece4d5] pt-5">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-[#1a1a1a]">
            <input
              checked={allSelectableChecked}
              className="h-4 w-4 rounded border-[#cfbf95] accent-[#c18d10]"
              onChange={toggleSelectAll}
              type="checkbox"
            />
            Select all actionable orders on this page
          </label>

          {selectedOrderIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-[#ecd18c] bg-[#fff7de] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6400]">
                {selectedOrderIds.length} selected
              </div>
              <Button onClick={() => setBulkAction('status')} variant="secondary">
                Bulk status update
              </Button>
              <Button onClick={() => setBulkAction('assign')}>Bulk assign rider</Button>
            </div>
          ) : (
            <div className="text-sm text-[#777777]">
              Select orders to update status or assign one rider to multiple deliveries.
            </div>
          )}
        </div>
      </section>

      {ordersQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-12 w-12" />
        </div>
      ) : ordersQuery.isError ? (
        <ErrorState
          description="The admin order list request failed."
          onAction={() => ordersQuery.refetch()}
          title="Unable to load orders."
        />
      ) : orderRows.length === 0 ? (
        <EmptyState
          description="Adjust the status, payment, or date range to widen the result set."
          title="No orders match these filters."
          titleClassName="italic"
        />
      ) : (
        <section className="space-y-4">
          {orderRows.map(({ order, flags, score }) => {
            const riderLoadCount = order.rider_id
              ? riderLoadById.get(Number(order.rider_id)) || 0
              : 0
            const isSelected = selectedOrderIds.includes(order.id)

            return (
              <article
                key={order.id}
                className={[
                  'first-light-shell-card rounded-[28px] p-5 transition',
                  isSelected ? 'ring-2 ring-[#d4a843]/40' : '',
                  score > 0 ? 'border-[#ecd0d0]' : '',
                ].join(' ')}
              >
                <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1.25fr)_minmax(0,1fr)_auto] xl:items-start">
                  <label className="inline-flex items-start gap-3">
                    <input
                      checked={isSelected}
                      className="mt-1 h-4 w-4 rounded border-[#cfbf95] accent-[#c18d10]"
                      disabled={TERMINAL_STATUSES.includes(order.order_status)}
                      onChange={() => toggleSelectedOrder(order.id)}
                      type="checkbox"
                    />
                    <div>
                      <Link
                        className="font-mono text-sm font-bold text-[#8d6b12] transition hover:text-[#1a1a1a]"
                        to={`/admin/orders/${order.id}`}
                      >
                        {order.order_number}
                      </Link>
                      <div className="mt-2 text-sm font-bold text-[#1a1a1a]">
                        {order.customer?.name || 'Guest'}
                      </div>
                      <div className="mt-1 text-xs text-[#777777]">
                        {order.customer?.email || 'No customer email'}
                      </div>
                      <div className="mt-1 text-xs text-[#777777]">
                        Created {formatDateTime(order.created_at)}
                      </div>
                    </div>
                  </label>

                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={order.order_status} />
                      <StatusBadge status={order.payment_status} />
                      <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                        {formatStatusLabel(order.payment_method)}
                      </span>
                    </div>

                    {flags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {flags.map((flag) => (
                          <span
                            key={`${order.id}-${flag.label}`}
                            className={[
                              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                              getAdminToneClasses(flag.tone),
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'h-1.5 w-1.5 rounded-full',
                                getAdminToneDotClasses(flag.tone),
                              ].join(' ')}
                            />
                            {flag.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-[#777777]">
                        No active exceptions on this order.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                        Total
                      </div>
                      <div className="mt-2 font-mono text-lg font-bold text-[#1a1a1a]">
                        {formatCurrency(order.total_amount)}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                        Rider load
                      </div>
                      <div className="mt-2 text-sm font-bold text-[#1a1a1a]">
                        {order.rider?.name || 'Unassigned'}
                      </div>
                      <div className="mt-1 text-xs text-[#777777]">
                        {order.rider_id
                          ? `${riderLoadCount} active orders`
                          : 'Needs rider assignment'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                    {canUpdateStatus(order) ? (
                      <Button
                        className="px-3 py-2"
                        onClick={() => openStatusModal(order)}
                        variant="secondary"
                      >
                        Update status
                      </Button>
                    ) : null}
                    {canAssignRider(order) ? (
                      <Button className="px-3 py-2" onClick={() => openAssignModal(order)}>
                        Assign rider
                      </Button>
                    ) : null}
                    <Link
                      className="first-light-chip-button inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                      to={`/admin/orders/${order.id}`}
                    >
                      Open order
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          disabled={Number(meta?.current_page || 1) <= 1}
          onClick={() => updateFilter('page', Number(meta?.current_page || 1) - 1)}
          variant="secondary"
        >
          Previous
        </Button>
        <div className="text-sm text-[#7a7a7a]">
          Page {meta?.current_page || 1}
          {meta?.last_page ? ` of ${meta.last_page}` : ''}
        </div>
        <Button
          disabled={Number(meta?.current_page || 1) >= Number(meta?.last_page || 1)}
          onClick={() => updateFilter('page', Number(meta?.current_page || 1) + 1)}
          variant="secondary"
        >
          Next
        </Button>
      </div>

      {statusModalOpen && selectedOrder ? (
        <OrderStatusModal
          key={`status-${selectedOrder.id}`}
          isSubmitting={updateStatusMutation.isPending}
          onClose={() => {
            if (!updateStatusMutation.isPending) {
              setStatusModalOpen(false)
              setSelectedOrder(null)
            }
          }}
          onSubmit={(payload) => updateStatusMutation.mutateAsync(payload)}
          open={statusModalOpen}
          order={selectedOrder}
        />
      ) : null}

      {assignModalOpen && selectedOrder ? (
        <AssignRiderModal
          key={`assign-${selectedOrder.id}`}
          isLoadingRiders={ridersQuery.isLoading || riderDirectoryQuery.isLoading}
          isSubmitting={assignRiderMutation.isPending}
          onClose={() => {
            if (!assignRiderMutation.isPending) {
              setAssignModalOpen(false)
              setSelectedOrder(null)
            }
          }}
          onSubmit={(payload) => assignRiderMutation.mutateAsync(payload)}
          open={assignModalOpen}
          order={selectedOrder}
          riders={assignableRiders}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel={
          bulkAction === 'status'
            ? `Update ${selectedOrders.filter(canUpdateStatus).length} orders`
            : `Assign ${selectedOrders.filter(canAssignRider).length} orders`
        }
        isSubmitting={updateStatusMutation.isPending || assignRiderMutation.isPending}
        message={
          bulkAction === 'status'
            ? 'Review the shared status change before it is applied to every selected order.'
            : 'Review the shared rider assignment before it is applied to every selected order.'
        }
        onClose={closeBulkDialog}
        onConfirm={bulkAction === 'status' ? handleBulkStatus : handleBulkAssign}
        open={Boolean(bulkAction)}
        title={
          bulkAction === 'status'
            ? 'Confirm bulk status update'
            : 'Confirm bulk rider assignment'
        }
      >
        {bulkAction === 'status' ? (
          <div className="space-y-4">
            <label className="block">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
                New status
              </div>
              <select
                className="first-light-field mt-2"
                onChange={(event) =>
                  setBulkStatus((current) => ({
                    ...current,
                    orderStatus: event.target.value,
                  }))
                }
                value={bulkStatus.orderStatus}
              >
                {ORDER_STATUS_OPTIONS.filter(Boolean).map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
                Note
              </div>
              <textarea
                className="first-light-field mt-2 min-h-[110px]"
                onChange={(event) =>
                  setBulkStatus((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional audit note for this bulk update."
                value={bulkStatus.note}
              />
            </label>

            <div className="rounded-[20px] border border-[#ecd18c] bg-[#fff7de] px-4 py-3 text-sm text-[#8a6400]">
              {selectedOrders.filter(canUpdateStatus).length} actionable orders will be updated after confirmation.
            </div>
          </div>
        ) : bulkAction === 'assign' ? (
          <div className="space-y-4">
            <label className="block">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
                Rider
              </div>
              <select
                className="first-light-field mt-2"
                onChange={(event) =>
                  setBulkAssignment((current) => ({
                    ...current,
                    riderId: event.target.value,
                  }))
                }
                value={bulkAssignment.riderId}
              >
                <option value="">Select rider</option>
                {assignableRiders.map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.name} • {rider.active_load_count || 0} active
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
                Note
              </div>
              <textarea
                className="first-light-field mt-2 min-h-[110px]"
                onChange={(event) =>
                  setBulkAssignment((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional dispatch note for the rider."
                value={bulkAssignment.note}
              />
            </label>

            <div className="rounded-[20px] border border-[#d8eadf] bg-[#edf8f0] px-4 py-3 text-sm text-[#23613a]">
              {selectedOrders.filter(canAssignRider).length} actionable orders will receive the same rider after confirmation.
            </div>
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
