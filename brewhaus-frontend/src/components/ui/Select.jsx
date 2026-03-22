/**
 * Select
 * @param {{
 *  label?: string,
 *  hint?: string,
 *  error?: string,
 *  className?: string,
 *  children: import('react').ReactNode,
 * } & import('react').SelectHTMLAttributes<HTMLSelectElement>} props
 * @returns {import('react').JSX.Element}
 */
export default function Select({
  label,
  hint,
  error,
  className,
  children,
  ...props
}) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-3">
          {label}
        </div>
      ) : null}
      <select
        {...props}
        className={[
          'first-light-field pr-10 text-[15px]',
          error ? 'border-flame focus:border-flame focus:ring-0' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </select>
      {hint && !error ? (
        <div className="mt-1 text-xs text-ink-3">{hint}</div>
      ) : null}
      {error ? (
        <div className="mt-1 text-xs text-flame">{error}</div>
      ) : null}
    </label>
  )
}
