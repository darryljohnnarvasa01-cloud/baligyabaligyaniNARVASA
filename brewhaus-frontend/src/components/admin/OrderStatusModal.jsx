import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

const ORDER_STATUSES = [
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

function formatStatusLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

// [CODEX] React e-commerce component: OrderStatusModal
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: updates an order's ecommerce lifecycle status and writes an optional admin note.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function OrderStatusModal({
  open,
  order,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [orderStatus, setOrderStatus] = useState(order?.order_status || 'pending')
  const [note, setNote] = useState('')

  const availableStatuses = useMemo(() => {
    if (order?.payment_status === 'failed') {
      return ['cancelled']
    }

    return ORDER_STATUSES
  }, [order?.payment_status])

  const handleSubmit = async () => {
    if (!order?.id || !orderStatus) {
      return
    }

    try {
      await onSubmit({
        orderId: order.id,
        orderStatus,
        note,
      })
      toast.success('Order status updated.')
      onClose()
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to update order.',
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        order?.order_number
          ? `Update ${order.order_number}`
          : 'Update order status'
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save status'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4 text-sm text-[#666666]">
          Current status: <span className="font-bold text-[#1a1a1a]">{formatStatusLabel(order?.order_status)}</span>
        </div>

        <label className="block">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
            Order Status
          </div>
          <select
            value={orderStatus}
            onChange={(event) => setOrderStatus(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#ddd5c4] bg-white px-4 py-3 text-[#1a1a1a] focus:border-[#c89b2a] focus:outline-none focus:ring-2 focus:ring-[#c89b2a]/25"
          >
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
            Note
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Optional audit note for this change."
            className="mt-2 w-full rounded-xl border border-[#ddd5c4] bg-white px-4 py-3 text-[#1a1a1a] placeholder:text-[#9a9385] focus:border-[#c89b2a] focus:outline-none focus:ring-2 focus:ring-[#c89b2a]/25"
          />
        </label>
      </div>
    </Modal>
  )
}
