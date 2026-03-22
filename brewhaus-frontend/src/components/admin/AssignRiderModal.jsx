import toast from 'react-hot-toast'
import { getAdminToneClasses, getAdminToneDotClasses } from '../../utils/adminTones'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

// [CODEX] React e-commerce component: AssignRiderModal
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: assigns a rider to an order and stores an optional dispatch note.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function AssignRiderModal({
  open,
  order,
  riders = [],
  isLoadingRiders,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const handleSubmit = async (riderId) => {
    if (!order?.id || !riderId) {
      return
    }

    try {
      await onSubmit({
        orderId: order.id,
        riderId: Number(riderId),
      })
      toast.success('Rider assigned.')
      onClose()
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to assign rider.',
      )
    }
  }

  return (
    <Modal
      maxWidthClassName="max-w-3xl"
      open={open}
      onClose={onClose}
      title={
        order?.order_number
          ? `Assign rider to ${order.order_number}`
          : 'Assign rider'
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
            Available Riders
          </div>
          <p className="mt-2 text-sm leading-7 text-[#666666]">
            Riders are sorted with the lightest current load first so dispatch can assign quickly.
          </p>
        </div>

        {isLoadingRiders ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-12 w-12" />
          </div>
        ) : riders.length === 0 ? (
          <EmptyState
            description="All active riders are currently busy or no rider accounts are active."
            title="No rider available."
            titleClassName="text-2xl font-extrabold text-[#1a1a1a]"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {riders.map((rider) => (
              <div
                className="rounded-[22px] border border-[#ece4d5] bg-[#fcfaf4] p-4 shadow-sm"
                key={rider.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-[#1a1a1a]">{rider.name}</div>
                    <div className="mt-1 text-sm text-[#666666]">
                      {rider.phone || rider.email || 'No rider contact available'}
                    </div>
                  </div>
                  <div
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                      getAdminToneClasses(rider.availability?.tone || 'healthy'),
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        getAdminToneDotClasses(rider.availability?.tone || 'healthy'),
                      ].join(' ')}
                    />
                    {rider.availability?.label || 'Ready'}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[16px] border border-[#ece4d5] bg-white px-3 py-3 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">Current Load</div>
                    <div className="mt-2 text-xl font-extrabold text-[#1a1a1a]">{rider.active_load_count || 0}</div>
                  </div>
                  <div className="rounded-[16px] border border-[#ece4d5] bg-white px-3 py-3 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">Completed</div>
                    <div className="mt-2 text-xl font-extrabold text-[#1a1a1a]">{rider.assigned_orders_count || 0}</div>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(rider.id)}
                >
                  {isSubmitting ? 'Assigning...' : 'Assign rider'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
