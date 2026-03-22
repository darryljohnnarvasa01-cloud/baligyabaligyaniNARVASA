import { Check, PackageCheck, Phone, ReceiptText, Truck, X } from 'lucide-react'

const CUSTOMER_STEPS = [
  {
    id: 'placed',
    label: 'Placed',
    description: 'Your order is in BrewHaus.',
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    description: 'Payment or COD checks are complete.',
  },
  {
    id: 'out_for_delivery',
    label: 'Out for Delivery',
    description: 'A rider is heading your way.',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    description: 'Your brew has arrived.',
  },
]

const STATUS_TO_STEP_INDEX = {
  pending: 0,
  confirmed: 1,
  processing: 1,
  packed: 1,
  shipped: 1,
  out_for_delivery: 2,
  delivered: 3,
}

function formatLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDateTime(value) {
  if (!value) {
    return 'Awaiting update'
  }

  return new Date(value).toLocaleString()
}

function sortLogs(logs) {
  return [...(Array.isArray(logs) ? logs : [])].sort(
    (left, right) => new Date(left?.created_at || 0).getTime() - new Date(right?.created_at || 0).getTime(),
  )
}

function findFirstLogDate(logs, statuses) {
  return logs.find((log) => statuses.includes(log?.order_status))?.created_at ?? null
}

function getCustomerStepDate(stepId, logs, createdAt, deliveredAt) {
  switch (stepId) {
    case 'placed':
      return createdAt || findFirstLogDate(logs, ['pending'])
    case 'confirmed':
      return findFirstLogDate(logs, [
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
      ])
    case 'out_for_delivery':
      return findFirstLogDate(logs, ['out_for_delivery'])
    case 'delivered':
      return deliveredAt || findFirstLogDate(logs, ['delivered'])
    default:
      return null
  }
}

function getActiveStepIndex(status, logs) {
  const directIndex = STATUS_TO_STEP_INDEX[status]

  if (typeof directIndex === 'number') {
    return directIndex
  }

  return logs.reduce((highest, log) => {
    const nextIndex = STATUS_TO_STEP_INDEX[log?.order_status]

    return typeof nextIndex === 'number' ? Math.max(highest, nextIndex) : highest
  }, 0)
}

function getFallbackTimelineEntry(latestLog, status, createdAt) {
  if (!status) {
    return []
  }

  return [
    {
      id: 'timeline-fallback',
      order_status: status,
      note: latestLog?.note || 'We will post the next movement here as soon as the order changes state.',
      created_at: latestLog?.created_at || createdAt || null,
      user: latestLog?.user || null,
    },
  ]
}

/**
 * // [CODEX] React e-commerce component: OrderTracker
 * // Uses: order status data, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: visualizes the current customer delivery lifecycle, the latest status log, and assigned rider info when available.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function OrderTracker({
  createdAt,
  deliveredAt,
  latestLog,
  logs = [],
  rider,
  status,
}) {
  const sortedLogs = sortLogs(logs)
  const timelineEntries = sortedLogs.length
    ? [...sortedLogs].reverse()
    : getFallbackTimelineEntry(latestLog, status, createdAt)
  const isCancelled = status === 'cancelled' || status === 'refunded'
  const activeIndex = getActiveStepIndex(status, sortedLogs)

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-[#3a3427] bg-[#1a1a1a] px-5 py-6 text-white shadow-[0_22px_52px_rgba(0,0,0,0.22)] sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-[rgba(201,168,76,0.24)] bg-[#212121] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c9a84c]">
              Delivery Timeline
            </div>
            <h3 className="mt-4 font-display text-3xl font-bold italic text-white sm:text-4xl">
              Track every step to your door.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#a0a0a0]">
              The customer view stays simple: placed, confirmed, dispatched, and delivered. Detailed backend updates still appear in the timeline below.
            </p>
          </div>

          <div className="rounded-[24px] border border-[rgba(201,168,76,0.18)] bg-[#212121] px-4 py-4 text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a0a0]">Current Status</div>
            <div className="mt-2 text-xl font-extrabold text-white">{formatLabel(status)}</div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">
              {formatDateTime(latestLog?.created_at || createdAt)}
            </div>
          </div>
        </div>

        {isCancelled ? (
          <div className="mt-5 rounded-[24px] border border-[rgba(158,77,77,0.44)] bg-[rgba(158,77,77,0.12)] px-4 py-4 text-sm leading-7 text-[#f0d6d6]">
            This order is no longer active. The tracker shows the last completed delivery stage before it was marked as {formatLabel(status)}.
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="grid min-w-[720px] grid-cols-4 gap-4">
            {CUSTOMER_STEPS.map((step, index) => {
              const isCurrent = !isCancelled && activeIndex === index
              const isReached = activeIndex >= index
              const stepDate = getCustomerStepDate(step.id, sortedLogs, createdAt, deliveredAt)

              return (
                <div className="relative text-center" key={step.id}>
                  {index < CUSTOMER_STEPS.length - 1 ? (
                    <div
                      className={[
                        'absolute left-[55%] top-5 h-[2px] w-[90%] -translate-y-1/2',
                        activeIndex > index ? 'bg-[#c9a84c]' : 'bg-[#4a4a4a]',
                      ].join(' ')}
                    />
                  ) : null}

                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold shadow-[0_10px_24px_rgba(0,0,0,0.12)]',
                        isCurrent
                          ? 'border-[#d4a843] bg-[#d4a843] text-[#1a1a1a]'
                          : isReached
                            ? 'border-[rgba(201,168,76,0.42)] bg-[rgba(201,168,76,0.16)] text-white'
                            : 'border-[#4a4a4a] bg-[#212121] text-[#a0a0a0]',
                      ].join(' ')}
                    >
                      {isReached && !isCurrent ? <Check className="h-4 w-4" /> : index + 1}
                    </div>

                    <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#c9a84c]">
                      {step.label}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white">{step.description}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#a0a0a0]">
                      {formatDateTime(stepDate)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-5 py-5 shadow-[0_16px_34px_rgba(0,0,0,0.08)] sm:px-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c7a45]">
            <ReceiptText className="h-4 w-4" />
            Status Timeline
          </div>

          <div className="mt-5 space-y-4">
            {timelineEntries.map((log, index) => {
              const isFinalEntry = index === timelineEntries.length - 1
              const isCancelEntry = log.order_status === 'cancelled' || log.order_status === 'refunded'

              return (
                <div className="flex gap-3" key={log.id || `${log.order_status}-${index}`}>
                  <div className="flex w-5 flex-col items-center">
                    <div
                      className={[
                        'mt-1 h-3 w-3 rounded-full border',
                        isCancelEntry
                          ? 'border-[#9e4d4d] bg-[#9e4d4d]'
                          : 'border-[#c9a84c] bg-[#c9a84c]',
                      ].join(' ')}
                    />
                    {!isFinalEntry ? <div className="mt-1 w-px flex-1 bg-[#ddd5c4]" /> : null}
                  </div>

                  <div className="flex-1 rounded-[22px] border border-[#e6dfd0] bg-white p-4 shadow-[0_10px_22px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c7a45]">
                          {formatLabel(log.order_status)}
                        </div>
                        <div className="mt-2 text-lg font-extrabold text-[#1a1a1a]">
                          {log.note ? 'Status updated' : 'Movement recorded'}
                        </div>
                      </div>

                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b7b7b]">
                        {formatDateTime(log.created_at)}
                      </div>
                    </div>

                    <div className="mt-3 text-sm leading-7 text-[#555555]">
                      {log.note || 'No note was recorded for this update.'}
                    </div>

                    <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#7b7b7b]">
                      {log.user?.name ? `Updated by ${log.user.name}` : 'BrewHaus system update'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[30px] border border-[#3a3427] bg-[#212121] px-5 py-5 text-white shadow-[0_16px_36px_rgba(0,0,0,0.16)]">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c9a84c]">
              <PackageCheck className="h-4 w-4" />
              Latest Movement
            </div>
            <div className="mt-4 text-2xl font-extrabold text-white">{formatLabel(status)}</div>
            <div className="mt-3 text-sm leading-7 text-[#a0a0a0]">
              {latestLog?.note || 'We will post the next movement here as soon as the order changes state.'}
            </div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[#c9a84c]">
              {formatDateTime(latestLog?.created_at || createdAt)}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#ddd5c4] bg-[#f5f5f5] px-5 py-5 shadow-[0_16px_34px_rgba(0,0,0,0.08)]">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c7a45]">
              <Truck className="h-4 w-4" />
              Rider Contact
            </div>

            {rider ? (
              <>
                <div className="mt-4 text-2xl font-extrabold text-[#1a1a1a]">{rider.name}</div>
                <div className="mt-2 text-sm leading-7 text-[#555555]">
                  {rider.email || 'A rider has been assigned to your delivery.'}
                </div>

                {rider.phone ? (
                  <a
                    className="brewhaus-gold-button mt-5 w-full px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em]"
                    href={`tel:${rider.phone}`}
                  >
                    <Phone className="h-4 w-4" />
                    Call Rider
                  </a>
                ) : null}
              </>
            ) : (
              <div className="mt-4 text-sm leading-7 text-[#555555]">
                A rider will appear here once the order moves into delivery dispatch.
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-[#ddd5c4] bg-white px-5 py-5 shadow-[0_14px_30px_rgba(0,0,0,0.06)]">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c7a45]">
              {isCancelled ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              Tracking Snapshot
            </div>

            <div className="mt-5 space-y-3 text-sm text-[#555555]">
              <div className="flex items-center justify-between gap-4 border-b border-[#ece6d8] pb-3">
                <span>Order placed</span>
                <span className="font-semibold text-[#1a1a1a]">{formatDateTime(createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#ece6d8] pb-3">
                <span>Latest movement</span>
                <span className="font-semibold text-[#1a1a1a]">{formatDateTime(latestLog?.created_at || createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>{isCancelled ? 'Order closed' : 'Delivery completed'}</span>
                <span className="font-semibold text-[#1a1a1a]">
                  {isCancelled ? formatDateTime(latestLog?.created_at) : formatDateTime(deliveredAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
