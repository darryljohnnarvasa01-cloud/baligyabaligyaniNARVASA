import Modal from './Modal'
import Button from './Button'

/**
 * ConfirmDialog
 * @param {{
 *  open: boolean,
 *  title: string,
 *  message?: string,
 *  description?: string,
 *  confirmLabel?: string,
 *  cancelLabel?: string,
 *  isSubmitting?: boolean,
 *  onConfirm: () => void,
 *  onClose?: () => void,
 *  onCancel?: () => void,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onConfirm,
  onClose,
  onCancel,
}) {
  const resolvedOpen = Boolean(open)
  const handleClose = onClose || onCancel || (() => {})

  return (
    <Modal
      open={resolvedOpen}
      onClose={handleClose}
      title={title}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {message || description ? (
          <div className="text-sm text-ink-3">{message || description || ''}</div>
        ) : null}
        {children}
      </div>
    </Modal>
  )
}
