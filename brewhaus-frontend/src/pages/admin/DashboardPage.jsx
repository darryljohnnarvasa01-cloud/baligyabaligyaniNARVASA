import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Clock3,
  Copy,
  DollarSign,
  PackageCheck,
  RefreshCcw,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import EmptyState from '../../components/ui/EmptyState'
import AssignRiderModal from '../../components/admin/AssignRiderModal'
import OrderStatusModal from '../../components/admin/OrderStatusModal'
import RestockModal from '../../components/admin/RestockModal'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/admin/StatCard'
import StatusBadge from '../../components/admin/StatusBadge'
import StockStatusBadge from '../../components/admin/StockStatusBadge'
import {
  useAdminOrders,
  useAssignRiderMutation,
  useAvailableRiders,
  useUpdateOrderStatusMutation,
} from '../../hooks/admin/useAdminOrders'
import { useAdminUsers } from '../../hooks/admin/useAdminUsers'
import { useRestockInventoryMutation } from '../../hooks/admin/useInventory'
import { useDashboardStats } from '../../hooks/admin/useDashboardStats'
import { useAdminInventory } from '../../hooks/admin/useInventory'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
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

function buildLowStockReport(items) {
  if (!items.length) {
    return 'DISKR3T Low Stock Report\n\nAll tracked products are currently healthy.'
  }

  return [
    'DISKR3T Low Stock Report',
    '',
    ...items.map(
      (item) =>
        `${item.name} | SKU: ${item.sku} | Stock: ${item.stock_quantity} | Threshold: ${item.low_stock_threshold} | Status: ${item.stock_status}`,
    ),
  ].join('\n')
}

export default function DashboardPage() {
  const statsQuery = useDashboardStats()
  const inventoryQuery = useAdminInventory()
  const ordersQuery = useAdminOrders({
    status: '',
    paymentStatus: '',
    method: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    perPage: 100,
  })
  const ridersQuery = useAvailableRiders()
  const riderDirectoryQuery = useAdminUsers({
    role: 'rider',
    page: 1,
    perPage: 50,
  })
  const updateStatusMutation = useUpdateOrderStatusMutation()
  const assignRiderMutation = useAssignRiderMutation()
  const restockMutation = useRestockInventoryMutation()
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [restockProduct, setRestockProduct] = useState(null)

  const stats = statsQuery.data
  const lowStockItems = (inventoryQuery.data || [])
    .filter((item) => item.stock_status !== 'in_stock')
    .slice(0, 8)
  const activeOrders = useMemo(() => ordersQuery.data?.items || [], [ordersQuery.data])
  const isRefreshing = statsQuery.isFetching || inventoryQuery.isFetching
  const codExposure = activeOrders
    .filter((order) =>
      order.payment_method === 'cod' &&
      ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(order.order_status),
    )
    .reduce((total, order) => total + Number(order.total_amount || 0), 0)
  const pendingOrders = activeOrders.filter((order) => order.order_status === 'pending')
  const unassignedQueue = activeOrders.filter(
    (order) => !order.rider_id && ['packed', 'shipped'].includes(order.order_status),
  )
  const riderLoadById = useMemo(() => {
    const next = new Map()
    activeOrders.forEach((order) => {
      if (!order.rider_id || !['packed', 'shipped', 'out_for_delivery'].includes(order.order_status)) {
        return
      }

      const riderId = Number(order.rider_id)
      next.set(riderId, (next.get(riderId) || 0) + 1)
    })
    return next
  }, [activeOrders])
  const riderStatsById = useMemo(
    () => new Map((riderDirectoryQuery.data?.items || []).map((rider) => [Number(rider.id), rider])),
    [riderDirectoryQuery.data],
  )
  const assignableRiders = useMemo(
    () =>
      (ridersQuery.data || []).map((rider) => ({
        ...rider,
        active_load_count: riderLoadById.get(Number(rider.id)) || 0,
        assigned_orders_count: riderStatsById.get(Number(rider.id))?.assigned_orders_count || 0,
      })),
    [riderLoadById, riderStatsById, ridersQuery.data],
  )

  const chartData = {
    labels: (stats?.monthly_revenue_chart || []).map((entry) => entry.label),
    datasets: [
      {
        label: 'Revenue',
        data: (stats?.monthly_revenue_chart || []).map((entry) => entry.revenue),
        backgroundColor: '#f5c842',
        borderRadius: 18,
        borderSkipped: false,
        hoverBackgroundColor: '#e8c53a',
      },
    ],
  }

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#111111',
        borderColor: '#111111',
        borderWidth: 1,
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        callbacks: {
          label: (context) => formatCurrency(context.parsed.y),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#777777' },
      },
      y: {
        grid: { color: '#e7e7e7' },
        ticks: {
          color: '#777777',
          callback: (value) => `P${value}`,
        },
      },
    },
  }

  const handleRefresh = async () => {
    try {
      await Promise.all([statsQuery.refetch(), inventoryQuery.refetch()])
      toast.success('Dashboard refreshed.')
    } catch {
      toast.error('Unable to refresh dashboard.')
    }
  }

  const handleCopyLowStockReport = async () => {
    try {
      await navigator.clipboard.writeText(buildLowStockReport(lowStockItems))
      toast.success('Low-stock report copied.')
    } catch {
      toast.error('Unable to copy the report.')
    }
  }

  const handleRestock = async ({ quantityToAdd, note }) => {
    if (!restockProduct) {
      return
    }

    try {
      await restockMutation.mutateAsync({
        id: restockProduct.id,
        quantityToAdd,
        note,
      })
      toast.success('Inventory restocked.')
      setRestockProduct(null)
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to restock inventory.',
      )
    }
  }

  const openAssignModal = (order) => {
    setSelectedOrder(order)
    setAssignModalOpen(true)
  }

  const openStatusModal = (order) => {
    setSelectedOrder(order)
    setStatusModalOpen(true)
  }

  if (statsQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    )
  }

  if (statsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load admin dashboard."
        description="The analytics payload did not load cleanly."
        onAction={() => statsQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b3535]">
            Critical alerts
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {stats?.low_stock_count || 0}
          </div>
          <div className="mt-2 text-sm text-[#666666]">
            Low-stock products are above the fold for the morning restock pass.
          </div>
          <Link
            to="/admin/inventory"
            className="mt-4 inline-flex text-sm font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4"
          >
            Open inventory
          </Link>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6400]">
            Pending orders
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {pendingOrders.length}
          </div>
          <div className="mt-2 text-sm text-[#666666]">
            Orders still waiting for owner confirmation or dispatch movement.
          </div>
          <Link
            to="/admin/orders"
            className="mt-4 inline-flex text-sm font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4"
          >
            Open orders
          </Link>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6400]">
            COD exposure
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {formatCurrency(codExposure)}
          </div>
          <div className="mt-2 text-sm text-[#666666]">
            Cash tied up in active orders, including {unassignedQueue.length} waiting for riders.
          </div>
          <Link
            to="/admin/orders"
            className="mt-4 inline-flex text-sm font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4"
          >
            Review queue
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[34px] bg-[#111111] px-6 py-7 text-white shadow-[0_24px_52px_rgba(0,0,0,0.16)] sm:px-8">
          <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
            Admin Dashboard
          </div>
          <h1 className="mt-4 max-w-[12ch] text-4xl font-extrabold leading-[1.02] sm:max-w-none sm:text-5xl">
            DISKR3T command center for orders, stock, and sales.
          </h1>
          <div className="mt-3 h-1 w-24 rounded-full bg-[#f5c842]" />
          <p className="mt-5 max-w-[38rem] text-sm leading-7 text-white/72">
            Monitor sales movement, catch stock issues early, and move directly into the admin module that needs attention.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="first-light-accent-button rounded-full px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-60"
              disabled={isRefreshing}
              onClick={handleRefresh}
              type="button"
            >
              <RefreshCcw className={['h-4 w-4', isRefreshing ? 'animate-spin' : ''].join(' ')} />
              {isRefreshing ? 'Refreshing' : 'Refresh Data'}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/12"
              onClick={handleCopyLowStockReport}
              type="button"
            >
              <Copy className="h-4 w-4" />
              Copy Low-Stock Report
            </button>
          </div>
        </div>

        <section className="rounded-[34px] bg-white px-6 py-7 shadow-[0_18px_40px_rgba(0,0,0,0.08)] sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                Action Center
              </div>
              <h2 className="mt-4 text-3xl font-extrabold text-[#1a1a1a]">
                Quick operational moves
              </h2>
              <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
            </div>
            <div className="rounded-full border border-[#e0e0e0] bg-[#fafafa] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]">
              Pending {stats?.pending_orders || 0} | Low stock {stats?.low_stock_count || 0}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4 transition hover:bg-white" to="/admin/orders">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-[#1a1a1a]">Open Orders Queue</div>
                <ArrowUpRight className="h-4 w-4 text-[#1a1a1a]" />
              </div>
              <div className="mt-2 text-sm leading-6 text-[#666666]">
                Review current orders and unblock fulfillment work.
              </div>
            </Link>
            <Link className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4 transition hover:bg-white" to="/admin/inventory">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-[#1a1a1a]">Inventory Watchlist</div>
                <ArrowUpRight className="h-4 w-4 text-[#1a1a1a]" />
              </div>
              <div className="mt-2 text-sm leading-6 text-[#666666]">
                Restock products crossing threshold values.
              </div>
            </Link>
            <Link className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4 transition hover:bg-white" to="/admin/products/new">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-[#1a1a1a]">Add Product</div>
                <ArrowUpRight className="h-4 w-4 text-[#1a1a1a]" />
              </div>
              <div className="mt-2 text-sm leading-6 text-[#666666]">
                Launch new catalog items directly from the dashboard.
              </div>
            </Link>
            <Link className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4 transition hover:bg-white" to="/admin/coupons">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-[#1a1a1a]">Coupons</div>
                <ArrowUpRight className="h-4 w-4 text-[#1a1a1a]" />
              </div>
              <div className="mt-2 text-sm leading-6 text-[#666666]">
                Adjust live promotions without leaving admin.
              </div>
            </Link>
          </div>
        </section>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard
          helper="Orders created today"
          icon={<PackageCheck className="h-4 w-4" />}
          label="Today Orders"
          value={stats?.today_orders || 0}
        />
        <StatCard
          helper="Paid and COD revenue"
          icon={<DollarSign className="h-4 w-4" />}
          label="Today Revenue"
          value={formatCurrency(stats?.today_revenue)}
        />
        <StatCard
          helper="Active catalog footprint"
          icon={<Box className="h-4 w-4" />}
          label="Products"
          value={stats?.total_products || 0}
        />
        <StatCard
          helper="Needs replenishment"
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Low Stock"
          value={stats?.low_stock_count || 0}
        />
        <StatCard
          helper="Awaiting confirmation"
          icon={<Clock3 className="h-4 w-4" />}
          label="Pending Orders"
          value={stats?.pending_orders || 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="rounded-[30px] border border-[#e0e0e0] bg-white p-6 shadow-[0_16px_34px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                Monthly Revenue
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-[#1a1a1a]">
                Last six months
              </h2>
              <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#777777]">
                Six-Month Total
              </div>
              <div className="mt-2 text-xl font-extrabold text-[#1a1a1a]">
                {formatCurrency(
                  (stats?.monthly_revenue_chart || []).reduce(
                    (total, entry) => total + Number(entry.revenue || 0),
                    0,
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(stats?.monthly_revenue_chart || []).slice(-3).map((entry) => (
              <div
                key={entry.label}
                className="rounded-[18px] border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
                  {entry.label}
                </div>
                <div className="mt-2 text-lg font-extrabold text-[#1a1a1a]">
                  {formatCurrency(entry.revenue)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 h-[290px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </section>

        <section className="rounded-[30px] border border-[#e0e0e0] bg-white p-6 shadow-[0_16px_34px_rgba(0,0,0,0.06)]">
          <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
            Top Products
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-[#1a1a1a]">Best sellers</h2>
          <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />

          <div className="mt-6 space-y-3">
            {(stats?.top_products || []).length === 0 ? (
              <EmptyState
                title="No sales data yet."
                description="Top products will appear once orders start moving."
                titleClassName="text-2xl font-extrabold text-[#1a1a1a]"
              />
            ) : (
              stats.top_products.map((product, index) => (
                <div
                  key={`${product.product_id}-${index}`}
                  className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#1a1a1a]">
                        {product.product_name}
                      </div>
                      <div className="mt-1 text-xs text-[#777777]">
                        {product.product_sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1a1a1a]">
                        {product.units_sold} sold
                      </div>
                      <div className="mt-1 text-xs text-[#666666]">
                        {formatCurrency(product.revenue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[30px] border border-[#e0e0e0] bg-white p-6 shadow-[0_16px_34px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                Recent Orders
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-[#1a1a1a]">Latest eight</h2>
            </div>
            <Link
              to="/admin/orders"
              className="text-sm font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4"
            >
              Open orders
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e0e0e0]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fafafa] text-[#666666]">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-[0.14em]">Order</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-[0.14em]">Customer</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-[0.14em]">Status</th>
                  <th className="px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Total</th>
                  <th className="px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Action</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent_orders || []).map((order, index) => (
                  <tr
                    key={order.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'}
                  >
                    <td className="px-4 py-4 align-top">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-bold text-[#1a1a1a] transition hover:text-[#8b5e00]"
                      >
                        {order.order_number}
                      </Link>
                      <div className="mt-1 text-xs text-[#777777]">
                        {formatDateTime(order.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-[#1a1a1a]">
                      {order.customer?.name || 'Guest'}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={order.order_status} />
                        <StatusBadge status={order.payment_status} />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right align-top font-bold text-[#1a1a1a]">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-4 text-right align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!['cancelled', 'delivered', 'refunded'].includes(order.order_status) &&
                        !order.rider_id ? (
                          <button
                            className="first-light-outline-button rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                            onClick={() => openAssignModal(order)}
                            type="button"
                          >
                            Assign
                          </button>
                        ) : !['cancelled', 'delivered', 'refunded'].includes(order.order_status) ? (
                          <button
                            className="first-light-outline-button rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                            onClick={() => openStatusModal(order)}
                            type="button"
                          >
                            Update
                          </button>
                        ) : null}
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="first-light-chip-button inline-flex min-h-[40px] items-center rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#e0e0e0] bg-white p-6 shadow-[0_16px_34px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                Low Stock Alerts
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-[#1a1a1a]">
                Inventory watchlist
              </h2>
            </div>
            <Link
              to="/admin/inventory"
              className="text-sm font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4"
            >
              Open inventory
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {inventoryQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-12 w-12" />
              </div>
            ) : inventoryQuery.isError ? (
              <ErrorState
                title="Unable to load inventory."
                description="Low-stock products could not be loaded."
                onAction={() => inventoryQuery.refetch()}
              />
            ) : lowStockItems.length === 0 ? (
              <EmptyState
                title="All products are healthy."
                description="No stock thresholds have been crossed."
                titleClassName="text-2xl font-extrabold text-[#1a1a1a]"
              />
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#1a1a1a]">
                        {item.name}
                      </div>
                      <div className="mt-1 text-xs text-[#777777]">{item.sku}</div>
                    </div>
                    <StockStatusBadge status={item.stock_status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#666666]">
                    <span>Threshold: {item.low_stock_threshold}</span>
                    <span className="font-bold text-[#1a1a1a]">
                      Stock: {item.stock_quantity}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="first-light-outline-button rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                      onClick={() => setRestockProduct(item)}
                      type="button"
                    >
                      Restock
                    </button>
                    <Link
                      to="/admin/inventory"
                      className="first-light-chip-button inline-flex min-h-[40px] items-center rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                    >
                      Open inventory
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {statusModalOpen && selectedOrder ? (
        <OrderStatusModal
          key={`dashboard-status-${selectedOrder.id}`}
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
          key={`dashboard-assign-${selectedOrder.id}`}
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

      <RestockModal
        key={restockProduct?.id || 'dashboard-restock'}
        open={Boolean(restockProduct)}
        item={restockProduct}
        isSubmitting={restockMutation.isPending}
        onClose={() => {
          if (!restockMutation.isPending) {
            setRestockProduct(null)
          }
        }}
        onSubmit={handleRestock}
      />
    </div>
  )
}
