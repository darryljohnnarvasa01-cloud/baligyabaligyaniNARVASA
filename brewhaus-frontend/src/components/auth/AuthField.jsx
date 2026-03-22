/**
 * // [CODEX] React e-commerce component: AuthField
 * // Uses: none, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders a styled auth label with input or textarea controls for the auth pages.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function AuthField({
  label,
  hint,
  as = 'input',
  className = '',
  children,
  variant = 'default',
  ...props
}) {
  const Component = as
  const isInput = Component === 'input'
  const labelClassName =
    variant === 'gold'
      ? 'flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#555555]'
      : 'flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-ink-3'
  const hintClassName =
    variant === 'gold'
      ? 'font-medium text-[10px] normal-case tracking-normal text-[#7a7a7a]'
      : 'font-mono text-[10px] normal-case tracking-normal text-ink-4'
  const inputClassName =
    variant === 'gold'
      ? 'first-light-field mt-2 text-[15px]'
      : 'midnight-input mt-2 w-full'

  return (
    <label className="block">
      <div className={labelClassName}>
        <span>{label}</span>
        {hint ? <span className={hintClassName}>{hint}</span> : null}
      </div>
      {isInput ? (
        <input
          {...props}
          className={[inputClassName, className].filter(Boolean).join(' ')}
        />
      ) : (
        <Component
          {...props}
          className={[inputClassName, className].filter(Boolean).join(' ')}
        >
          {children}
        </Component>
      )}
    </label>
  )
}
