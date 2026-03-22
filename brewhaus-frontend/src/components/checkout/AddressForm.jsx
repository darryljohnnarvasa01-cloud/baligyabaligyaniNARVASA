const fields = [
  { key: 'label', label: 'Label', placeholder: 'Home' },
  { key: 'recipient_name', label: 'Recipient Name', placeholder: 'Sofia Alvarez' },
  { key: 'phone', label: 'Phone', placeholder: '09171234567' },
  { key: 'street', label: 'Street', placeholder: '123 Roast Street' },
  { key: 'barangay', label: 'Barangay', placeholder: 'Poblacion District' },
  { key: 'city', label: 'City', placeholder: 'Valencia City' },
  { key: 'province', label: 'Province', placeholder: 'Bukidnon' },
  { key: 'zip_code', label: 'ZIP Code', placeholder: '8000' },
]

/**
 * // [CODEX] React e-commerce component: AddressForm
 * // Uses: checkout address state, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: captures a delivery address inline during checkout and supports saving it to the customer's address book.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function AddressForm({
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
  submitLabel = 'Save Address',
  value,
}) {
  const inputClassName = 'first-light-field text-sm'

  return (
    <div className="rounded-[28px] border border-[#e1d6bc] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,246,238,0.98)_100%)] p-6 shadow-[0_18px_42px_rgba(17,12,7,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full bg-[#fff1c7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#17130a]">
            New Delivery Address
          </div>
          <div className="mt-3 text-lg font-semibold text-ink">Save a drop-off point for this order.</div>
        </div>
        <div className="rounded-full border border-[#dbcba6] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#715f2a] shadow-[0_6px_16px_rgba(178,123,13,0.08)]">
          Used at checkout
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label className="mt-5 space-y-2" key={field.key}>
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-3">{field.label}</span>
            <input
              className={inputClassName}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              type="text"
              value={value[field.key] ?? ''}
            />
          </label>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-ink-3">
        <input
          checked={Boolean(value.is_default)}
          className="h-4 w-4 rounded border-[#d7c7a1] accent-[#c89d34]"
          onChange={(event) => onChange('is_default', event.target.checked)}
          type="checkbox"
        />
        Save as my default address
      </label>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="first-light-accent-button rounded-[18px] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={onSubmit}
          type="button"
        >
          {isSubmitting ? 'Saving Address' : submitLabel}
        </button>
        {onCancel ? (
          <button
            className="first-light-outline-button rounded-[18px] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  )
}
