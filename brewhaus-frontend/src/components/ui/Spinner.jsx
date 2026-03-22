/**
 * Spinner
 *
 * @param {{ label?: string, className?: string }} props
 * @returns {import('react').JSX.Element}
 */
export default function Spinner({ label = 'Loading...', className }) {
  return (
    <div
      aria-label={label}
      role="status"
      className={[
        'h-10 w-10 animate-spin rounded-full border-4 border-[#e8e0d1] border-t-[#f5c842] motion-reduce:animate-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
