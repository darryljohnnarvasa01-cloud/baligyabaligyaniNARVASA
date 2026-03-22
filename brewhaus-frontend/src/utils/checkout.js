export const FREE_SHIPPING_THRESHOLD = 999
export const STANDARD_SHIPPING_FEE = 120

export function calculateShippingFee(subtotal) {
  const amount = Number(subtotal || 0)
  return amount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE
}

export function calculateOrderTotals(subtotal, discountAmount = 0) {
  const safeSubtotal = Number(subtotal || 0)
  const safeDiscount = Number(discountAmount || 0)
  const shippingFee = calculateShippingFee(safeSubtotal)
  const totalAmount = Number((safeSubtotal + shippingFee - safeDiscount).toFixed(2))

  return {
    shippingFee,
    discountAmount: safeDiscount,
    totalAmount,
  }
}

export function getPaymentMethodMeta(method) {
  const map = {
    gcash: {
      label: 'GCash',
      shortLabel: 'GCash',
      description: 'Pay via GCash e-wallet',
      icon: 'G',
      iconClassName: 'bg-live-l text-live border-live/35',
      customerNote: 'You will be redirected to PayMongo to complete payment before the order is confirmed.',
    },
    paymaya: {
      label: 'PayMaya / Maya',
      shortLabel: 'Maya',
      description: 'Pay via Maya e-wallet',
      icon: 'P',
      iconClassName: 'bg-frost-l text-frost border-frost/35',
      customerNote: 'You will be redirected to PayMongo to complete payment before the order is confirmed.',
    },
    cod: {
      label: 'Cash on Delivery',
      shortLabel: 'COD',
      description: 'Pay when your order arrives',
      icon: 'PHP',
      iconClassName: 'bg-heat-l text-heat border-heat/35 text-[11px]',
      customerNote: 'No online redirect. Prepare cash for the rider when your order arrives.',
    },
  }

  return map[method] || map.gcash
}
