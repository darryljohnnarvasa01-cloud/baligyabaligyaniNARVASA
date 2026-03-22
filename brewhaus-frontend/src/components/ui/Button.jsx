/**
 * Button component.
 *
 * @param {{
 *  variant?: 'primary'|'secondary'|'danger'|'ghost',
 *  className?: string,
 * } & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props
 * @returns {import('react').JSX.Element}
 */
export default function Button({ variant = 'primary', className, ...props }) {
  const base =
    // Shared buttons carry the minimum 44px target so page-level overrides do not shrink them below mobile standards.
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium font-sans transition-all duration-150 ease-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'

  const variants = {
    primary:
      'first-light-accent-button',
    secondary:
      'first-light-outline-button text-ink-2',
    danger:
      'border border-flame/35 bg-white text-flame shadow-xs hover:-translate-y-0.5 hover:border-flame/55 hover:bg-flame-l focus-visible:border-flame focus-visible:shadow-[0_0_0_3px_rgba(184,48,48,0.18)]',
    ghost: 'bg-transparent text-ink-3 hover:bg-surface hover:text-ink-2 focus-visible:border-ember focus-visible:shadow-ember',
  }

  const variantClass = variants[variant] ?? variants.primary
  const finalClassName = [base, variantClass, className].filter(Boolean).join(' ')

  return <button className={finalClassName} type="button" {...props} />
}
