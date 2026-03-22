/**
 * // [CODEX] React e-commerce component: CategoryBar
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders horizontal category tabs for fast public catalog switching.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function CategoryBar({ categories, activeSlug, onChange, variant = 'default' }) {
  const tabs = [{ slug: '', name: 'All' }, ...(categories || [])]
  const isGold = variant === 'gold'

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {tabs.map((category) => {
        const slug = category.slug || ''
        const active = activeSlug === slug

        return (
          <button
            key={slug || 'all'}
            className={[
              isGold
                ? 'shrink-0 rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition'
                : 'shrink-0 rounded-[8px] border px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition',
              active
                ? isGold
                  ? 'first-light-chip-button-active'
                  : 'border-ember bg-ember-l text-ember shadow-xs'
                : isGold
                  ? 'first-light-chip-button'
                  : 'border-border bg-white text-ink-3 hover:border-border-strong hover:text-ink',
            ].join(' ')}
            onClick={() => onChange?.(slug)}
            type="button"
          >
            {category.name}
            {category.product_count !== undefined ? ` (${category.product_count})` : ''}
          </button>
        )
      })}
    </div>
  )
}
