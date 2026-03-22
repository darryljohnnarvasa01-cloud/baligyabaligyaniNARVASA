import { Plus, Search } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import StatusBadge from '../../components/admin/StatusBadge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import {
  useAdminUsers,
  useCreateRiderMutation,
} from '../../hooks/admin/useAdminUsers'
import { useAdminOrders } from '../../hooks/admin/useAdminOrders'
import { getAdminToneClasses, getAdminToneDotClasses } from '../../utils/adminTones'

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// [CODEX] React e-commerce component: UsersPage
// Uses: useAdminUsers, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: displays admin, customer, and rider accounts with basic role and activity filtering for operations review.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function UsersPage() {
  const [filters, setFilters] = useState({
    role: '',
    search: '',
    status: '',
    page: 1,
    perPage: 12,
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    is_active: true,
  })
  const [formErrors, setFormErrors] = useState({})
  const deferredSearch = useDeferredValue(filters.search)

  const usersQuery = useAdminUsers({
    ...filters,
    search: deferredSearch,
  })
  const riderOrdersQuery = useAdminOrders({
    status: '',
    paymentStatus: '',
    method: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    perPage: 100,
  })
  const createRiderMutation = useCreateRiderMutation()
  const users = useMemo(() => usersQuery.data?.items || [], [usersQuery.data])
  const meta = usersQuery.data?.meta
  const fieldClassName =
    'first-light-field'
  const riderOrders = useMemo(() => riderOrdersQuery.data?.items || [], [riderOrdersQuery.data])

  const riderLoadById = useMemo(() => {
    const next = new Map()

    riderOrders.forEach((order) => {
      if (!order.rider_id || !['packed', 'shipped', 'out_for_delivery'].includes(order.order_status)) {
        return
      }

      const riderId = Number(order.rider_id)
      next.set(riderId, (next.get(riderId) || 0) + 1)
    })

    return next
  }, [riderOrders])

  const visibleUsers = useMemo(() => {
    return users.filter((user) => {
      const activeLoad = riderLoadById.get(Number(user.id)) || 0
      const statusKey = !user.is_active ? 'inactive' : activeLoad > 0 ? 'busy' : 'ready'

      if (filters.status && statusKey !== filters.status) {
        return false
      }

      return true
    })
  }, [filters.status, riderLoadById, users])

  const userSummary = useMemo(
    () => ({
      riders: visibleUsers.filter((user) => user.role === 'rider').length,
      ready: visibleUsers.filter(
        (user) => user.role === 'rider' && user.is_active && (riderLoadById.get(Number(user.id)) || 0) === 0,
      ).length,
      busy: visibleUsers.filter(
        (user) => user.role === 'rider' && (riderLoadById.get(Number(user.id)) || 0) > 0,
      ).length,
      inactive: visibleUsers.filter((user) => user.role === 'rider' && !user.is_active).length,
    }),
    [riderLoadById, visibleUsers],
  )

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1,
    }))
  }

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))

    setFormErrors((current) => {
      if (!current[key]) {
        return current
      }

      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const handleCreateRider = async (event) => {
    event.preventDefault()
    setFormErrors({})

    try {
      await createRiderMutation.mutateAsync(form)
      toast.success('Rider account created.')
      setForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        is_active: true,
      })
      setFilters((current) => ({
        ...current,
        role: 'rider',
        search: '',
        page: 1,
      }))
      setIsCreateModalOpen(false)
    } catch (error) {
      const nextErrors = error?.response?.data?.errors || {}
      setFormErrors(nextErrors)
      toast.error(error?.response?.data?.message || error?.message || 'Unable to create rider.')
    }
  }

  const getAvailability = (user) => {
    const activeLoad = riderLoadById.get(Number(user.id)) || 0

    if (user.role !== 'rider') {
      return { label: user.role || 'User', tone: 'neutral', activeLoad }
    }

    if (!user.is_active) {
      return { label: 'Unactivated', tone: 'critical', activeLoad }
    }

    if (activeLoad > 0) {
      return { label: 'On run', tone: 'warning', activeLoad }
    }

    return { label: 'Ready', tone: 'healthy', activeLoad }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7e58]">
            Users
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-[#1a1a1a]">
            Rider readiness and directory
          </h1>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create rider
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Riders
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">{userSummary.riders}</div>
          <div className="mt-2 text-sm text-[#666666]">Visible in the current filter set</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Ready
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">{userSummary.ready}</div>
          <div className="mt-2 text-sm text-[#666666]">Available for new assignments</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            On run
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">{userSummary.busy}</div>
          <div className="mt-2 text-sm text-[#666666]">Active dispatch load</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Unactivated
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">{userSummary.inactive}</div>
          <div className="mt-2 text-sm text-[#666666]">Need owner follow-up</div>
        </div>
      </section>

      <section className="first-light-shell-card rounded-[28px] p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a826f]" />
            <input
              aria-label="Search users by name or email"
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search name, email, or phone"
              className="first-light-field pl-12"
            />
          </label>

          <select
            aria-label="Filter users by role"
            value={filters.role}
            onChange={(event) => updateFilter('role', event.target.value)}
            className="first-light-field"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="rider">Rider</option>
          </select>

          <select
            aria-label="Filter users by rider status"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            className="first-light-field"
          >
            <option value="">All statuses</option>
            <option value="ready">Ready</option>
            <option value="busy">On run</option>
            <option value="inactive">Unactivated</option>
          </select>
        </div>
      </section>

      {usersQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-12 w-12" />
        </div>
      ) : usersQuery.isError ? (
        <ErrorState
          title="Unable to load users."
          description="The user directory request failed."
          onAction={() => usersQuery.refetch()}
        />
      ) : visibleUsers.length === 0 ? (
        <EmptyState
          title="No users found."
          description="Adjust the role or search filter."
          titleClassName="italic"
        />
      ) : (
        <section className="first-light-table-shell overflow-hidden rounded-[28px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="first-light-table-head">
                <tr>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    User
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Role
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Activation
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Availability
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Load
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => {
                  const availability = getAvailability(user)

                  return (
                  <tr key={user.id} className="first-light-table-row">
                    <td className="px-5 py-5 align-top">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e0e0e0] bg-[#f4f4f4] text-lg font-bold text-[#8d6b12]">
                          {(user.name || 'U').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#1a1a1a]">{user.name}</div>
                          <div className="mt-1 text-xs text-[#7a7a7a]">{user.email}</div>
                          <div className="mt-1 text-xs text-[#7a7a7a]">{user.phone || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                        {user.role || 'unassigned'}
                      </span>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-5 py-5 align-top">
                      <span
                        className={[
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                          getAdminToneClasses(availability.tone),
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'h-1.5 w-1.5 rounded-full',
                            getAdminToneDotClasses(availability.tone),
                          ].join(' ')}
                        />
                        {availability.label}
                      </span>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="font-mono text-[#8d6b12]">
                        {user.role === 'rider' ? availability.activeLoad : user.orders_count}
                      </div>
                      <div className="mt-1 text-xs text-[#7a7a7a]">
                        {user.role === 'rider'
                          ? `${user.assigned_orders_count || 0} delivered`
                          : `${user.orders_count || 0} orders`}
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top text-[#1a1a1a]">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          disabled={Number(meta?.current_page || 1) <= 1}
          onClick={() => updateFilter('page', Number(meta?.current_page || 1) - 1)}
        >
          Previous
        </Button>
        <div className="text-sm text-[#7a7a7a]">
          Page {meta?.current_page || 1}
          {meta?.last_page ? ` of ${meta.last_page}` : ''}
        </div>
        <Button
          variant="secondary"
          disabled={Number(meta?.current_page || 1) >= Number(meta?.last_page || 1)}
          onClick={() => updateFilter('page', Number(meta?.current_page || 1) + 1)}
        >
          Next
        </Button>
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={() => {
          if (!createRiderMutation.isPending) {
            setIsCreateModalOpen(false)
          }
        }}
        title="Create rider"
        maxWidthClassName="max-w-4xl"
      >
        <form className="space-y-5" onSubmit={handleCreateRider}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7a7a7a]">
                Full name
              </div>
              <input
                className={fieldClassName}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Rider full name"
                type="text"
                value={form.name}
              />
              {formErrors.name ? (
                <div className="mt-2 text-xs text-[#b83030]">{formErrors.name[0]}</div>
              ) : null}
            </label>

            <label className="block">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7a7a7a]">
                Email
              </div>
              <input
                className={fieldClassName}
                onChange={(event) => updateForm('email', event.target.value)}
                placeholder="rider@brewhaus.test"
                type="email"
                value={form.email}
              />
              {formErrors.email ? (
                <div className="mt-2 text-xs text-[#b83030]">{formErrors.email[0]}</div>
              ) : null}
            </label>

            <label className="block">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7a7a7a]">
                Phone
              </div>
              <input
                className={fieldClassName}
                onChange={(event) => updateForm('phone', event.target.value)}
                placeholder="09171230021"
                type="text"
                value={form.phone}
              />
              {formErrors.phone ? (
                <div className="mt-2 text-xs text-[#b83030]">{formErrors.phone[0]}</div>
              ) : null}
            </label>

            <label className="block">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7a7a7a]">
                Password
              </div>
              <input
                className={fieldClassName}
                onChange={(event) => updateForm('password', event.target.value)}
                placeholder="Minimum 8 characters"
                type="password"
                value={form.password}
              />
              {formErrors.password ? (
                <div className="mt-2 text-xs text-[#b83030]">{formErrors.password[0]}</div>
              ) : null}
            </label>

            <label className="block">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7a7a7a]">
                Confirm password
              </div>
              <input
                className={fieldClassName}
                onChange={(event) => updateForm('password_confirmation', event.target.value)}
                placeholder="Repeat password"
                type="password"
                value={form.password_confirmation}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-3 text-[#1a1a1a]">
              <input
                checked={form.is_active}
                className="h-4 w-4 rounded border-[#cfbf95] accent-[#c18d10]"
                onChange={(event) => updateForm('is_active', event.target.checked)}
                type="checkbox"
              />
              <div>
                <div className="text-sm font-medium text-[#1a1a1a]">Active account</div>
                <div className="text-xs text-[#7a7a7a]">Inactive riders cannot log in.</div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[#666666]">
              The rider becomes assignable immediately when active and visible in this list.
            </div>
            <Button disabled={createRiderMutation.isPending} type="submit">
              {createRiderMutation.isPending ? 'Creating rider...' : 'Create rider'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
