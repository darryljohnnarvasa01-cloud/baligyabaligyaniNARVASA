import { getPaymentMethodMeta } from '../../utils/checkout'

const methods = ['gcash', 'paymaya', 'cod']

/**
 * // [CODEX] React e-commerce component: PaymentMethodSelector
 * // Uses: checkout payment state, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the GCash, PayMaya, and COD payment method cards and highlights the active choice.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function PaymentMethodSelector({ disabledMethods = [], onChange, value }) {
  return (
    <fieldset className="grid gap-3 lg:grid-cols-3">
      {methods.map((method) => {
        const meta = getPaymentMethodMeta(method)
        const isActive = value === method
        const isDisabled = disabledMethods.includes(method)

        return (
          <label
            className={[
              'relative flex min-h-[214px] w-full flex-col rounded-[26px] border p-5 text-left transition duration-200',
              isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              isActive
                ? 'border-[#c89d34] bg-[linear-gradient(135deg,#fff6db_0%,#ffffff_58%,#f7edca_100%)] shadow-[0_20px_40px_rgba(186,138,24,0.18)]'
                : 'border-[#e4dcc8] bg-[linear-gradient(180deg,rgba(255,255,255,0.99)_0%,rgba(250,246,239,0.98)_100%)] shadow-[0_12px_28px_rgba(26,25,22,0.05)] hover:-translate-y-[1px] hover:border-[#d4b46c] hover:shadow-[0_16px_34px_rgba(26,25,22,0.08)]',
            ].join(' ')}
            key={method}
          >
            {isActive ? <span className="absolute inset-x-0 top-0 h-[3px] bg-[#c89d34]" /> : null}
            <input
              checked={isActive}
              className="sr-only"
              disabled={isDisabled}
              name="payment_method"
              onChange={() => {
                if (!isDisabled) {
                  onChange(method)
                }
              }}
              type="radio"
              value={method}
            />
            <div className="flex items-start justify-between gap-3">
              <div
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold shadow-[0_10px_24px_rgba(17,12,7,0.08)]',
                  meta.iconClassName,
                ].join(' ')}
              >
                {meta.icon}
              </div>
              <div
                className={[
                  'rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                  isDisabled
                    ? 'border-heat/30 bg-heat-l text-heat'
                    : isActive
                      ? 'border-[#c89d34] bg-white text-[#8d6511]'
                      : 'border-[#e2d7bf] bg-white/90 text-ink-3',
                ].join(' ')}
              >
                {isDisabled ? 'Unavailable' : isActive ? 'Selected' : 'Ready'}
              </div>
            </div>

            <div className="mt-5 flex-1">
              <div className="text-[18px] font-semibold text-ink">{meta.label}</div>
              <div className="mt-2 text-sm leading-6 text-ink-3">{meta.description}</div>

              {method === 'cod' ? (
                <div className="mt-4 rounded-[18px] border border-[rgba(201,168,76,0.28)] bg-[#fff3d9] px-4 py-3 text-[12px] leading-5 text-[#6f5f2c] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  {isDisabled
                    ? 'COD is limited to Valencia addresses only.'
                    : 'Pay the rider in cash at handoff for Valencia deliveries.'}
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-[#eadfc7] bg-white/80 px-4 py-3 text-[12px] leading-5 text-ink-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                  Secure payment continues through PayMongo after you place the order.
                </div>
              )}
            </div>
          </label>
        )
      })}
    </fieldset>
  )
}
