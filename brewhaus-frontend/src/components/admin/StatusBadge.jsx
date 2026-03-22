import { getAdminToneClasses, getAdminToneDotClasses } from '../../utils/adminTones'

function getStatusStyle(status) {
  const normalized = String(status || '').toLowerCase()

  const map = {
    pending: { label: 'Pending', tone: 'warning' },
    confirmed: { label: 'Confirmed', tone: 'warning' },
    processing: { label: 'Processing', tone: 'warning', pulse: true },
    preparing: { label: 'Preparing', tone: 'warning', pulse: true },
    packed: { label: 'Packed', tone: 'warning' },
    ready: { label: 'Ready', tone: 'healthy' },
    shipped: { label: 'Shipped', tone: 'warning' },
    assigned: { label: 'Assigned', tone: 'warning' },
    out_for_delivery: { label: 'Out for Delivery', tone: 'warning', pulse: true },
    delivered: { label: 'Delivered', tone: 'healthy' },
    cancelled: { label: 'Cancelled', tone: 'critical' },
    refunded: { label: 'Refunded', tone: 'neutral' },
    paid: { label: 'Paid', tone: 'healthy' },
    failed: { label: 'Failed', tone: 'critical' },
    inactive: { label: 'Inactive', tone: 'critical' },
    active: { label: 'Active', tone: 'healthy' },
    awaiting_payment: { label: 'Awaiting Payment', tone: 'warning' },
  }

  const style = map[normalized] || {
    label: normalized.replaceAll('_', ' ') || 'Unknown',
    tone: 'neutral',
  }

  return {
    ...style,
    className: getAdminToneClasses(style.tone),
    dot: getAdminToneDotClasses(style.tone),
  }
}

// [CODEX] React e-commerce component: StatusBadge
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: displays order or payment statuses across admin and rider screens with ecommerce-specific labels and tones.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function StatusBadge({ status }) {
  const style = getStatusStyle(status)

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]',
        style.className,
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          style.dot,
          style.pulse ? 'animate-status-pulse' : '',
        ].join(' ')}
      />
      {style.label}
    </span>
  )
}
