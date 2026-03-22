import { AlertTriangle } from 'lucide-react'
import Button from './Button'

/**
 * ErrorState
 * @param {{
 *  title?: string,
 *  description?: string,
 *  actionLabel?: string,
 *  onAction?: () => void,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function ErrorState({
  title = 'Something went wrong.',
  description = 'Please try again.',
  actionLabel = 'Retry',
  onAction,
}) {
  return (
    <div className="rounded-2xl border border-flame/25 bg-flame-l px-7 py-6 text-sm text-ink-2 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-flame/25 bg-white text-flame">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-display font-bold text-ink">{title}</div>
          {description ? (
            <div className="mt-1 text-sm leading-7 text-ink-2">{description}</div>
          ) : null}
        </div>
      </div>
      {onAction ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
