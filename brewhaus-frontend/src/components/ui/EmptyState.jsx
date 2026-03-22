import Button from './Button'
import { Coffee } from 'lucide-react'

/**
 * EmptyState
 * @param {{
 *  title: string,
 *  description?: string,
 *  actionLabel?: string,
 *  onAction?: () => void,
 *  icon?: import('react').ReactNode,
 *  titleClassName?: string,
 *  descriptionClassName?: string,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  titleClassName,
  descriptionClassName,
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-7 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-white text-ink-4">
        {icon || <Coffee className="h-5 w-5" />}
      </div>
      <div
        className={[
          'mt-4 text-lg font-display font-bold italic text-ink',
          titleClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {title}
      </div>
      {description ? (
        <div
          className={[
            'mt-2 text-sm leading-7 text-ink-3',
            descriptionClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {description}
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  )
}
