import { useEffect, useState } from 'react'

/**
 * // [CODEX] React e-commerce component: ProductFilters
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: manages catalog sidebar filters for search, sort, category, featured, and on-sale states.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function ProductFilters({ categories, filters, onApply, onReset, variant = 'default' }) {
  const [form, setForm] = useState(filters)
  const isGold = variant === 'gold'

  useEffect(() => {
    setForm(filters)
  }, [filters])

  const handleSubmit = (event) => {
    event.preventDefault()
    onApply?.(form)
  }

  const setValue = (key, value, shouldApply = false) => {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value,
      }

      if (shouldApply) {
        onApply?.(next)
      }

      return next
    })
  }

  return (
    <form
      className={[
        'space-y-4 p-4 sm:space-y-6 sm:p-7 lg:sticky lg:top-28',
        isGold
          ? 'rounded-[28px] border border-[#e0e0e0] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.08)]'
          : 'rounded-[24px] border border-border bg-surface shadow-sm',
      ].join(' ')}
      onSubmit={handleSubmit}
    >
      <div>
        <div className={isGold ? 'text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]' : 'midnight-section-label'}>Search</div>
        <input
          aria-label="Search catalog products"
          className={
            isGold
              ? 'mt-2 w-full rounded-[16px] border border-[#e0e0e0] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition placeholder:text-[#8a8a8a] focus:border-[#f5c842] focus:shadow-[0_0_0_3px_rgba(245,200,66,0.18)] sm:mt-3 sm:rounded-[18px]'
              : 'midnight-input mt-3 w-full bg-void/90'
          }
          onChange={(event) => setValue('search', event.target.value)}
          placeholder="Search beans, gear, merch..."
          value={form.search}
        />
      </div>

      <div>
        <div className={isGold ? 'text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]' : 'midnight-section-label'}>Sort</div>
        <select
          aria-label="Sort catalog products"
          className={
            isGold
              ? 'mt-2 w-full rounded-[16px] border border-[#e0e0e0] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#f5c842] focus:shadow-[0_0_0_3px_rgba(245,200,66,0.18)] sm:mt-3 sm:rounded-[18px]'
              : 'midnight-input mt-3 w-full bg-void/90'
          }
          onChange={(event) => setValue('sort', event.target.value, true)}
          value={form.sort}
        >
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <div className={isGold ? 'hidden lg:block' : ''}>
        <div className={isGold ? 'text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]' : 'midnight-section-label'}>Category</div>
        <div className="mt-2 space-y-2 sm:mt-3">
          <button
            className={[
              isGold
                ? 'w-full rounded-[16px] border px-4 py-3 text-left text-sm font-semibold transition sm:rounded-[18px]'
                : 'w-full rounded-[10px] border px-4 py-3 text-left text-sm transition',
              !form.category
                ? isGold
                  ? 'first-light-chip-button-active'
                  : 'border-ember bg-ember-l text-ember'
                : isGold
                  ? 'first-light-chip-button'
                  : 'border-border bg-white text-ink-3 hover:border-border-strong hover:text-ink',
            ].join(' ')}
            onClick={() => setValue('category', '', true)}
            type="button"
          >
            All Products
          </button>

          {categories.map((category) => (
            <button
              key={category.id || category.slug}
              className={[
                isGold
                  ? 'w-full rounded-[16px] border px-4 py-3 text-left text-sm font-semibold transition sm:rounded-[18px]'
                  : 'w-full rounded-[10px] border px-4 py-3 text-left text-sm transition',
                form.category === category.slug
                  ? isGold
                    ? 'first-light-chip-button-active'
                    : 'border-ember bg-ember-l text-ember'
                  : isGold
                    ? 'first-light-chip-button'
                    : 'border-border bg-white text-ink-3 hover:border-border-strong hover:text-ink',
              ].join(' ')}
              onClick={() => setValue('category', category.slug, true)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{category.name}</span>
                <span className={isGold ? 'text-[11px] font-bold text-[#1a1a1a]' : 'font-mono text-[11px] text-gold'}>{category.product_count}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className={isGold ? 'flex items-center justify-between gap-3 rounded-[16px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-3 sm:rounded-[18px]' : 'flex items-center justify-between gap-3 rounded-[10px] border border-border bg-white px-4 py-3'}>
          <span className={isGold ? 'text-sm font-semibold text-[#1a1a1a]' : 'text-sm text-ink-2'}>Featured only</span>
          <input
            checked={Boolean(form.featured)}
            className={isGold ? 'h-4 w-4 accent-[#f5c842]' : 'h-4 w-4 accent-ember'}
            aria-label="Filter catalog to featured products only"
            onChange={(event) => setValue('featured', event.target.checked, true)}
            type="checkbox"
          />
        </label>

        <label className={isGold ? 'flex items-center justify-between gap-3 rounded-[16px] border border-[#e0e0e0] bg-[#fafafa] px-4 py-3 sm:rounded-[18px]' : 'flex items-center justify-between gap-3 rounded-[10px] border border-border bg-white px-4 py-3'}>
          <span className={isGold ? 'text-sm font-semibold text-[#1a1a1a]' : 'text-sm text-ink-2'}>On sale only</span>
          <input
            checked={Boolean(form.onSale)}
            className={isGold ? 'h-4 w-4 accent-[#f5c842]' : 'h-4 w-4 accent-ember'}
            aria-label="Filter catalog to products on sale only"
            onChange={(event) => setValue('onSale', event.target.checked, true)}
            type="checkbox"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button className={isGold ? 'first-light-accent-button flex-1 rounded-[16px] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] sm:rounded-[18px]' : 'midnight-ember-button flex-1 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]'} type="submit">
          Search
        </button>
        <button
          className={isGold ? 'flex-1 rounded-[16px] border border-[#e0e0e0] bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] transition hover:bg-[#f7f7f7] sm:rounded-[18px]' : 'midnight-ghost-button flex-1 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]'}
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>
    </form>
  )
}
