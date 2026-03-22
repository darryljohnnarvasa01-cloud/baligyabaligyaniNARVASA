export function formatCurrency(value) {
  const amount = Number(value || 0)

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function normalizePublicAssetUrl(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  if (typeof window === 'undefined') {
    return value
  }

  if (value.startsWith('/')) {
    return value
  }

  try {
    const parsed = new URL(value)
    const isLoopbackHost = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    const isBackendPort = parsed.port === '8000'

    if (isLoopbackHost || isBackendPort) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
    }

    return value
  } catch {
    return value
  }
}

export function getDisplayPrice(product) {
  if (!product) {
    return 0
  }

  if (product.current_price !== undefined && product.current_price !== null) {
    return Number(product.current_price)
  }

  if (product.is_on_sale && product.sale_price !== null && product.sale_price !== undefined) {
    return Number(product.sale_price)
  }

  return Number(product.price || 0)
}

export function getPrimaryImageUrl(product) {
  if (!product) {
    return null
  }

  const primary =
    product.primary_image ||
    product.images?.find((image) => image?.is_primary) ||
    product.images?.[0] ||
    null

  return normalizePublicAssetUrl(primary?.image_url || primary?.image_path || null)
}

export function getCategoryName(product) {
  return product?.category?.name || 'DISKR3T'
}

export function isLowStock(product) {
  return product?.stock_status === 'low_stock' && Number(product?.stock_quantity || 0) > 0
}

export function getProductSizeOptions(product) {
  if (!Array.isArray(product?.size_options)) {
    return []
  }

  return product.size_options
    .map((option) => String(option || '').trim())
    .filter(Boolean)
}

export function productRequiresSizeChoice(product) {
  return getProductSizeOptions(product).length > 1
}

export function getDefaultProductSize(product) {
  const sizeOptions = getProductSizeOptions(product)

  return sizeOptions.length === 1 ? sizeOptions[0] : null
}
