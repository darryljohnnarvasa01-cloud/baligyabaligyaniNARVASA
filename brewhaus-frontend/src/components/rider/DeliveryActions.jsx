import Button from '../ui/Button'

// [CODEX] React e-commerce component: DeliveryActions
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: shows the rider action for packed or out-for-delivery orders using the ecommerce status names.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function DeliveryActions({
  orderStatus,
  onPickup,
  onDeliver,
  isSubmitting,
  deliverLabel = 'Add Delivery Proof',
}) {
  if (['packed', 'shipped'].includes(orderStatus)) {
    return (
      <Button onClick={onPickup} disabled={isSubmitting}>
        {isSubmitting ? 'Updating...' : 'Picked Up'}
      </Button>
    )
  }

  if (orderStatus === 'out_for_delivery') {
    return (
      <Button
        variant="secondary"
        className="border-live/60 text-live hover:border-live/60 hover:bg-live/10 hover:text-parchment"
        onClick={onDeliver}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Updating...' : deliverLabel}
      </Button>
    )
  }

  return null
}
