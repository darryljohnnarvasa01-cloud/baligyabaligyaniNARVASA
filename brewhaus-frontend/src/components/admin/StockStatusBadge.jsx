import { getAdminToneClasses, getAdminToneDotClasses } from '../../utils/adminTones'

// [CODEX] React e-commerce component: StockStatusBadge
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: displays product-centric stock state for admin inventory and product tables.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function StockStatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()

  const styles = {
    in_stock: {
      label: 'In Stock',
      tone: 'healthy',
    },
    low_stock: {
      label: 'Low Stock',
      tone: 'warning',
    },
    out_of_stock: {
      label: 'Out of Stock',
      tone: 'critical',
    },
  }

  const style = styles[normalized] || {
    label: normalized.replaceAll('_', ' ') || 'Unknown',
    tone: 'neutral',
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]',
        getAdminToneClasses(style.tone),
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          getAdminToneDotClasses(style.tone),
        ].join(' ')}
      />
      {style.label}
    </span>
  )
}
