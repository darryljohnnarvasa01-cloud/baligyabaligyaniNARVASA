import { useState } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

// [CODEX] React e-commerce component: RestockModal
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: captures a product restock quantity and optional audit note for inventory logs.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function RestockModal({
  open,
  item,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [quantityToAdd, setQuantityToAdd] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    onSubmit({
      quantityToAdd: Number(quantityToAdd || 0),
      note,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Restock ${item?.name || 'product'}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Number(quantityToAdd || 0) <= 0}
          >
            {isSubmitting ? 'Saving...' : 'Confirm restock'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ash">
            Quantity to Add
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={quantityToAdd}
            onChange={(event) => setQuantityToAdd(event.target.value)}
            className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 text-linen focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
          />
        </label>

        <label className="block">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ash">
            Note
          </div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Supplier, batch, or adjustment note."
            className="mt-2 w-full rounded-xl border border-smoke/60 bg-roast px-4 py-3 text-linen placeholder:text-ash focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30"
          />
        </label>
      </div>
    </Modal>
  )
}
