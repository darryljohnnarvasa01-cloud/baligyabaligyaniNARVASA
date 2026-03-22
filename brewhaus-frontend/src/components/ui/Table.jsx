/**
 * Table
 * @param {{
 *  children: import('react').ReactNode,
 *  className?: string,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function Table({ children, className }) {
  return (
    <div
      className={[
        'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <table className="w-full text-left text-sm font-sans">{children}</table>
    </div>
  )
}
