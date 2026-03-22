import Modal from '../ui/Modal'
import Button from '../ui/Button'

/**
 * // [CODEX] React e-commerce component: CouponFormModal
 * // Uses: Modal, Button, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the admin coupon create and edit form with promotion rules, expiry, and usage fields.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function CouponFormModal({
  open,
  onClose,
  onSubmit,
  form,
  setForm,
  editingCoupon,
  isPending,
}) {
  const applyPreset = (nextValues) => {
    setForm((current) => ({ ...current, ...nextValues }))
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isPending) {
          onClose()
        }
      }}
      title={editingCoupon ? `Edit ${editingCoupon.code}` : 'Create coupon'}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="rounded-2xl border border-smoke/60 bg-roast/60 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ash">Quick presets</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-smoke/60 bg-roast px-3 py-1.5 text-xs font-medium text-linen"
              onClick={() => applyPreset({ type: 'percent', value: '10.00', usage_limit: '100' })}
            >
              10% launch
            </button>
            <button
              type="button"
              className="rounded-full border border-smoke/60 bg-roast px-3 py-1.5 text-xs font-medium text-linen"
              onClick={() => applyPreset({ type: 'percent', value: '15.00', usage_limit: '50' })}
            >
              15% flash
            </button>
            <button
              type="button"
              className="rounded-full border border-smoke/60 bg-roast px-3 py-1.5 text-xs font-medium text-linen"
              onClick={() => applyPreset({ type: 'fixed', value: '100.00', min_order_amount: '500' })}
            >
              P100 off
            </button>
            <button
              type="button"
              className="rounded-full border border-smoke/60 bg-roast px-3 py-1.5 text-xs font-medium text-linen"
              onClick={() => {
                const nextWeek = new Date()
                nextWeek.setDate(nextWeek.getDate() + 7)
                applyPreset({ expires_at: nextWeek.toISOString().slice(0, 16) })
              }}
            >
              +7 days
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash">Code</div>
            <input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 text-linen focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
              placeholder="MIDNIGHT10"
              required
            />
          </label>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash">Type</div>
            <select
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 text-linen focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash">
              {form.type === 'percent' ? 'Percent Value' : 'Discount Value'}
            </div>
            <input
              min="0.01"
              step="0.01"
              type="number"
              value={form.value}
              onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 font-mono text-gold focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
              required
            />
          </label>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash">Minimum Order</div>
            <input
              min="0"
              step="0.01"
              type="number"
              value={form.min_order_amount}
              onChange={(event) => setForm((current) => ({ ...current, min_order_amount: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 font-mono text-gold focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash">Usage Limit</div>
            <input
              min="1"
              step="1"
              type="number"
              value={form.usage_limit}
              onChange={(event) => setForm((current) => ({ ...current, usage_limit: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 text-linen focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
              placeholder="Optional"
            />
          </label>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ash">Expires At</div>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 text-linen focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
            />
          </label>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-smoke/60 bg-roast/70 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-parchment">Coupon Active</div>
            <div className="mt-1 text-xs text-ash">Inactive coupons stay visible to admins but cannot be used at checkout.</div>
          </div>
          <input
            checked={form.is_active}
            onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
            type="checkbox"
            className="h-5 w-5 rounded border-smoke/60 bg-roast text-ember focus:ring-ember/40"
          />
        </label>

        <div className="flex justify-end gap-3">
          <Button disabled={isPending} onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isPending} type="submit">
            {isPending ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
