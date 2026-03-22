import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import CouponFormModal from '../../components/admin/CouponFormModal'
import {
  useAdminCoupons,
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useUpdateCouponMutation,
} from '../../hooks/admin/useAdminCoupons'
import { buildCouponUpdatePayload } from '../../utils/adminPayloads'
import { formatCurrency } from '../../utils/storefront'

function initialCouponState() {
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  return {
    code: '',
    type: 'percent',
    value: '10.00',
    min_order_amount: '',
    usage_limit: '100',
    expires_at: nextWeek.toISOString().slice(0, 16),
    is_active: true,
  }
}

function toFormState(coupon) {
  return {
    code: coupon.code || '',
    type: coupon.type || 'percent',
    value: coupon.value != null ? String(coupon.value) : '0.00',
    min_order_amount: coupon.min_order_amount != null ? String(coupon.min_order_amount) : '',
    usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : '',
    expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : '',
    is_active: Boolean(coupon.is_active),
  }
}

function toPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: Number(form.value || 0),
    min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount),
    usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
    expires_at: form.expires_at || null,
    is_active: Boolean(form.is_active),
  }
}

function formatDateTime(value) {
  if (!value) {
    return 'No expiry'
  }

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function couponValueLabel(coupon) {
  if (coupon.type === 'percent') {
    return `${Number(coupon.value || 0)}% off`
  }

  return `${formatCurrency(coupon.value)} off`
}

function couponStatus(coupon) {
  if (coupon.is_expired) {
    return { label: 'Expired', className: 'border-flame/30 bg-flame/12 text-flame' }
  }

  if (!coupon.is_active) {
    return { label: 'Inactive', className: 'border-smoke/60 bg-roast/70 text-ash' }
  }

  if (coupon.remaining_uses === 0) {
    return { label: 'Exhausted', className: 'border-heat/35 bg-heat/12 text-heat' }
  }

  return { label: 'Active', className: 'border-live/35 bg-live/10 text-live' }
}

function isExpiringSoon(coupon) {
  if (!coupon.expires_at || coupon.is_expired) {
    return false
  }

  const diffMs = new Date(coupon.expires_at).getTime() - Date.now()
  return diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000
}

// [CODEX] React e-commerce component: CouponsPage
// Uses: useAdminCoupons, coupon mutations, CouponFormModal, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: manages coupon creation, editing, deletion, and promotion status review from the admin workspace.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function CouponsPage() {
  const couponsQuery = useAdminCoupons()
  const createMutation = useCreateCouponMutation()
  const updateMutation = useUpdateCouponMutation()
  const deleteMutation = useDeleteCouponMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [deleteCoupon, setDeleteCoupon] = useState(null)
  const [form, setForm] = useState(initialCouponState)

  const coupons = useMemo(() => couponsQuery.data || [], [couponsQuery.data])
  const isPending = createMutation.isPending || updateMutation.isPending
  const orderedCoupons = useMemo(
    () =>
      [...coupons].sort((left, right) => {
        const leftUrgent = isExpiringSoon(left) ? 1 : 0
        const rightUrgent = isExpiringSoon(right) ? 1 : 0

        if (rightUrgent !== leftUrgent) {
          return rightUrgent - leftUrgent
        }

        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      }),
    [coupons],
  )

  const openCreateModal = () => {
    setEditingCoupon(null)
    setForm(initialCouponState())
    setFormOpen(true)
  }

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon)
    setForm(toFormState(coupon))
    setFormOpen(true)
  }

  const closeModal = () => {
    if (isPending) {
      return
    }

    setFormOpen(false)
    setEditingCoupon(null)
    setForm(initialCouponState())
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const payload = toPayload(form)

      if (editingCoupon) {
        await updateMutation.mutateAsync({ id: editingCoupon.id, payload })
        toast.success('Coupon updated.')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Coupon created.')
      }

      closeModal()
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save coupon.')
    }
  }

  const handleDelete = async () => {
    if (!deleteCoupon) {
      return
    }

    try {
      await deleteMutation.mutateAsync(deleteCoupon.id)
      toast.success('Coupon deleted.')
      setDeleteCoupon(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete coupon.')
    }
  }

  const handleQuickToggle = async (coupon) => {
    try {
      await updateMutation.mutateAsync({
        id: coupon.id,
        payload: buildCouponUpdatePayload(coupon, {
          is_active: !coupon.is_active,
        }),
      })
      toast.success(`Coupon ${coupon.is_active ? 'deactivated' : 'activated'}.`)
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update coupon.')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-ash">Coupons</div>
          <h1 className="mt-2 text-4xl font-display font-bold italic text-parchment">Promotion Control</h1>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Add coupon
        </Button>
      </div>

      {couponsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-12 w-12" />
        </div>
      ) : couponsQuery.isError ? (
        <ErrorState
          title="Unable to load coupons."
          description="The promotion request failed. Retry once the API is available."
          onAction={() => couponsQuery.refetch()}
        />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="No coupons yet."
          description="Create your first storefront promotion and attach it to checkout."
          actionLabel="Add coupon"
          onAction={openCreateModal}
          titleClassName="italic"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orderedCoupons.map((coupon) => {
            const status = couponStatus(coupon)
            const expiringSoon = isExpiringSoon(coupon)

            return (
              <article
                key={coupon.id}
                className="rounded-[28px] border border-smoke/60 bg-espresso p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-ash">Coupon Code</div>
                    <h2 className="mt-3 font-mono text-2xl text-gold">{coupon.code}</h2>
                    <div className="mt-2 text-sm text-linen">{couponValueLabel(coupon)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={['rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em]', status.className].join(' ')}>
                      {status.label}
                    </span>
                    {expiringSoon ? (
                      <span className="rounded-full border border-[#ecd18c] bg-[#fff7de] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#8a6400]">
                        Expiring soon
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm text-ash">
                  <div className="rounded-2xl border border-smoke/50 bg-roast/60 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-ash">Minimum Order</div>
                    <div className="mt-2 font-mono text-gold">
                      {coupon.min_order_amount != null ? formatCurrency(coupon.min_order_amount) : 'None'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-smoke/50 bg-roast/60 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-ash">Usage</div>
                    <div className="mt-2 font-mono text-gold">
                      {coupon.used_count}
                      {coupon.usage_limit != null ? ` / ${coupon.usage_limit}` : ' / unlimited'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-smoke/50 bg-roast/60 px-4 py-3 sm:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-ash">Expires</div>
                    <div className="mt-2 text-linen">{formatDateTime(coupon.expires_at)}</div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleQuickToggle(coupon)}
                    variant="secondary"
                  >
                    {coupon.is_active ? 'Set inactive' : 'Set active'}
                  </Button>
                  <Button className="flex-1" variant="secondary" onClick={() => openEditModal(coupon)}>
                    Edit
                  </Button>
                  <Button className="flex-1" variant="danger" onClick={() => setDeleteCoupon(coupon)}>
                    Delete
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <CouponFormModal
        editingCoupon={editingCoupon}
        form={form}
        isPending={isPending}
        onClose={closeModal}
        onSubmit={handleSubmit}
        open={formOpen}
        setForm={setForm}
      />

      <ConfirmDialog
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete Coupon'}
        message={deleteCoupon ? `Delete ${deleteCoupon.code}? This removes it from future checkout use.` : ''}
        open={Boolean(deleteCoupon)}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteCoupon(null)
          }
        }}
        onConfirm={handleDelete}
        title="Delete coupon"
      />
    </div>
  )
}
