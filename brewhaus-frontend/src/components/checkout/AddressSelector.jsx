/**
 * // [CODEX] React e-commerce component: AddressSelector
 * // Uses: checkout address state, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: shows saved delivery addresses as selectable cards and exposes an inline add-address action.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function AddressSelector({ addresses, selectedId, onAddNew, onSelect }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-2">
        {addresses.map((address) => {
          const isActive = Number(selectedId) === Number(address.id)

          return (
            <label
              className={[
                'relative flex min-h-[188px] cursor-pointer flex-col overflow-hidden rounded-[24px] border p-5 text-left transition duration-200',
                isActive
                  ? 'border-[#c89d34] bg-[linear-gradient(135deg,#fff6dd_0%,#ffffff_55%,#fbf1cf_100%)] shadow-[0_18px_36px_rgba(186,138,24,0.16)]'
                  : 'border-[#e4dcc8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,246,239,0.98)_100%)] shadow-[0_12px_28px_rgba(26,25,22,0.05)] hover:-translate-y-[1px] hover:border-[#d4b46c] hover:shadow-[0_16px_32px_rgba(26,25,22,0.08)]',
              ].join(' ')}
              key={address.id}
            >
              {isActive ? <div className="absolute inset-x-0 top-0 h-[3px] bg-[#c89d34]" /> : null}
              <input
                checked={isActive}
                className="sr-only"
                name="shipping_address_id"
                onChange={() => onSelect(address.id)}
                type="radio"
                value={address.id}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[28px] font-bold italic leading-none text-ink">
                      {address.label}
                    </span>
                    {address.is_default ? (
                      <span className="rounded-full border border-live/35 bg-live-l px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-live">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm font-medium text-ink">{address.recipient_name}</div>
                </div>

                <div
                  className={[
                    'rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                    isActive
                      ? 'border-[#c89d34] bg-white text-[#8d6511]'
                      : 'border-[#e2d7bf] bg-white/90 text-ink-3',
                  ].join(' ')}
                >
                  {isActive ? 'Selected' : 'Use this'}
                </div>
              </div>

              <div className="mt-4 flex-1 rounded-[20px] border border-[#eadfca] bg-[rgba(255,255,255,0.88)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <div className="text-sm leading-6 text-ink-3">{address.full_address}</div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-4">
                  {address.phone}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <button
        className="first-light-outline-button flex w-full rounded-[20px] px-5 py-4 text-[11px] font-bold uppercase tracking-[0.2em]"
        onClick={onAddNew}
        type="button"
      >
        Add New Address
      </button>
    </div>
  )
}
