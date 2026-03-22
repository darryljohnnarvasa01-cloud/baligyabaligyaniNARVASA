export function buildProductUpdatePayload(product, overrides = {}) {
  return {
    name: product?.name || '',
    slug: product?.slug || '',
    short_description: product?.short_description || '',
    description: product?.description || '',
    price: Number(product?.price ?? product?.current_price ?? 0),
    sale_price:
      product?.sale_price === null || product?.sale_price === undefined
        ? null
        : Number(product.sale_price),
    sku: product?.sku || '',
    stock_quantity: Number(product?.stock_quantity ?? 0),
    low_stock_threshold: Number(product?.low_stock_threshold ?? 0),
    weight_grams:
      product?.weight_grams === null || product?.weight_grams === undefined
        ? null
        : Number(product.weight_grams),
    category_id: Number(product?.category_id ?? product?.category?.id ?? 0),
    is_featured: Boolean(product?.is_featured),
    is_active: Boolean(product?.is_active),
    tags: Array.isArray(product?.tags)
      ? product.tags
          .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
          .filter(Boolean)
      : [],
    images: [],
    primary_image_index: 0,
    ...overrides,
  }
}

export function buildCouponUpdatePayload(coupon, overrides = {}) {
  return {
    code: String(coupon?.code || '').trim().toUpperCase(),
    type: coupon?.type || 'percent',
    value: Number(coupon?.value ?? 0),
    min_order_amount:
      coupon?.min_order_amount === null || coupon?.min_order_amount === undefined
        ? null
        : Number(coupon.min_order_amount),
    usage_limit:
      coupon?.usage_limit === null || coupon?.usage_limit === undefined
        ? null
        : Number(coupon.usage_limit),
    expires_at: coupon?.expires_at || null,
    is_active: Boolean(coupon?.is_active),
    ...overrides,
  }
}

export function buildCategoryUpdatePayload(category, overrides = {}) {
  return {
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    sort_order: Number(category?.sort_order ?? 0),
    is_active: Boolean(category?.is_active),
    image: null,
    ...overrides,
  }
}
