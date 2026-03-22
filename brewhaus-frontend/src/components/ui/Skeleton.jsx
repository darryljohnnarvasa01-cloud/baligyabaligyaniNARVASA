/**
 * Skeleton
 * @param {{
 *  className?: string,
 *  tone?: 'default'|'brewhaus',
 * } & import('react').HTMLAttributes<HTMLDivElement>} props
 * @returns {import('react').JSX.Element}
 */
export default function Skeleton({ className, tone = 'default', ...props }) {
  return (
    <div
      {...props}
      className={[
        tone === 'brewhaus' ? 'brewhaus-skeleton rounded-lg bg-[#2a2a2a]' : 'midnight-skeleton rounded-lg bg-raised',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
