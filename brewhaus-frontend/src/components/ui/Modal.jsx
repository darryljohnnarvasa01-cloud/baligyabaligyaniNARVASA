import { useRef } from 'react'
import { Dialog } from '@headlessui/react'
import { X } from 'lucide-react'

/**
 * Modal component (Headless UI Dialog).
 *
 * @param {{
 *  open: boolean,
 *  title: string,
 *  onClose: () => void,
 *  children: import('react').ReactNode,
 *  footer?: import('react').ReactNode,
 *  maxWidthClassName?: string,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClassName,
}) {
  const closeButtonRef = useRef(null)

  return (
    <Dialog
      className="relative z-50"
      initialFocus={closeButtonRef}
      onClose={onClose}
      open={open}
    >
      <div className="fixed inset-0 bg-[rgba(26,25,22,0.45)] backdrop-blur-[4px]" />

      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
        <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
          <Dialog.Panel
            className={[
              'flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-white text-ink shadow-modal animate-[scaleModal_0.2s_cubic-bezier(0.16,1,0.3,1)] sm:max-h-[calc(100vh-3rem)]',
              maxWidthClassName || 'max-w-lg',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-8 pb-5 pt-8">
              <Dialog.Title className="text-2xl font-display font-bold text-ink">
                {title}
              </Dialog.Title>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-ink-3 transition hover:text-ink"
                aria-label="Close modal"
                ref={closeButtonRef}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-8 py-7">{children}</div>

            {footer ? (
              <div className="shrink-0 border-t border-border px-8 py-5">
                {footer}
              </div>
            ) : null}
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}
