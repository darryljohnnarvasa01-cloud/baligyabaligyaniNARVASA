import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDisplayPrice, getPrimaryImageUrl, normalizePublicAssetUrl } from '../utils/storefront'

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2))
}

function normalizeSelectedSize(value) {
  return String(value || '').trim()
}

function calculateTotals(items) {
  const itemCount = items.reduce((total, item) => total + Number(item?.qty || 0), 0)
  const subtotal = roundMoney(
    items.reduce((total, item) => total + Number(item?.line_subtotal || 0), 0),
  )

  return { itemCount, subtotal }
}

function matchItem(item, identifier) {
  if (identifier && typeof identifier === 'object') {
    return (
      String(item?.id) === String(identifier.id) ||
      String(item?.cart_item_id) === String(identifier.cart_item_id) ||
      (
        String(item?.product_id) === String(identifier.product_id) &&
        normalizeSelectedSize(item?.selected_size) === normalizeSelectedSize(identifier.selected_size)
      )
    )
  }

  return (
    String(item?.id) === String(identifier) ||
    String(item?.cart_item_id) === String(identifier)
  )
}

function normalizeProduct(product) {
  const productId = Number(product?.product_id ?? product?.id ?? 0)
  const quantity = Math.max(1, Number(product?.quantity ?? product?.qty ?? 1))
  const unitPrice = roundMoney(
    product?.unit_price ?? product?.price ?? getDisplayPrice(product) ?? 0,
  )

  return {
    id: product?.id ?? product?.cart_item_id ?? `temp-${productId}`,
    cart_item_id: typeof product?.id === 'number' ? product.id : product?.cart_item_id ?? null,
    product_id: productId,
    name: product?.product_name ?? product?.name ?? product?.product?.name ?? 'Product',
    slug: product?.product_slug ?? product?.slug ?? product?.product?.slug ?? null,
    sku: product?.product_sku ?? product?.sku ?? null,
    selected_size: normalizeSelectedSize(product?.selected_size ?? product?.product?.selected_size ?? '') || null,
    qty: quantity,
    quantity,
    price: unitPrice,
    unit_price: unitPrice,
    subtotal: roundMoney(product?.subtotal ?? unitPrice * quantity),
    line_subtotal: roundMoney(product?.subtotal ?? unitPrice * quantity),
    image_url:
      normalizePublicAssetUrl(product?.image_url) ??
      getPrimaryImageUrl(product) ??
      normalizePublicAssetUrl(product?.product?.primary_image?.image_url) ??
      null,
    stock_status: product?.stock_status ?? product?.product?.stock_status ?? 'in_stock',
    stock_quantity: Number(product?.stock_quantity ?? product?.product?.stock_quantity ?? 0),
    is_active: product?.is_active ?? product?.product?.is_active ?? true,
  }
}

function normalizeServerCart(payload) {
  const items = Array.isArray(payload?.items) ? payload.items.map(normalizeProduct) : []
  const totals = calculateTotals(items)

  return {
    items,
    itemCount: Number(payload?.item_count ?? totals.itemCount),
    subtotal: roundMoney(payload?.subtotal ?? totals.subtotal),
  }
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      itemCount: 0,
      isOpen: false,
      bounceKey: 0,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      syncFromServer: (payload) => {
        const normalized = normalizeServerCart(payload)

        set((state) => ({
          ...normalized,
          isOpen: state.isOpen,
          bounceKey: state.bounceKey,
        }))
      },
      snapshot: () => ({
        items: get().items,
        subtotal: get().subtotal,
        itemCount: get().itemCount,
        isOpen: get().isOpen,
        bounceKey: get().bounceKey,
      }),
      restoreSnapshot: (snapshot) => {
        if (!snapshot) {
          return
        }

        set({
          items: snapshot.items ?? [],
          subtotal: snapshot.subtotal ?? 0,
          itemCount: snapshot.itemCount ?? 0,
          isOpen: snapshot.isOpen ?? false,
          bounceKey: snapshot.bounceKey ?? get().bounceKey,
        })
      },
      optimisticAdd: (product, qty = 1, selectedSize = null) => {
        const productId = Number(product?.id ?? product?.product_id ?? 0)
        const stockQuantity = Number(product?.stock_quantity ?? 10)
        const maxQuantity = Math.min(10, Math.max(0, stockQuantity || 10))
        const normalizedSelectedSize = normalizeSelectedSize(selectedSize)

        if (!productId || maxQuantity <= 0 || product?.stock_status === 'out_of_stock') {
          return
        }

        set((state) => {
          const incomingQty = Math.max(1, Number(qty || 1))
          const existingIndex = state.items.findIndex(
            (item) =>
              item.product_id === productId &&
              normalizeSelectedSize(item.selected_size) === normalizedSelectedSize,
          )
          const nextItems = [...state.items]

          if (existingIndex >= 0) {
            const current = nextItems[existingIndex]
            const nextQty = Math.min(maxQuantity, Number(current.qty) + incomingQty)
            const nextPrice = roundMoney(current.unit_price)

            nextItems[existingIndex] = {
              ...current,
              qty: nextQty,
              quantity: nextQty,
              price: nextPrice,
              unit_price: nextPrice,
              subtotal: roundMoney(nextQty * nextPrice),
              line_subtotal: roundMoney(nextQty * nextPrice),
            }
          } else {
            const normalized = normalizeProduct({
              ...product,
              id: `temp-${productId}-${normalizedSelectedSize || 'default'}`,
              product_id: productId,
              selected_size: normalizedSelectedSize,
              quantity: Math.min(maxQuantity, incomingQty),
              unit_price: getDisplayPrice(product),
              subtotal: Math.min(maxQuantity, incomingQty) * getDisplayPrice(product),
              image_url: getPrimaryImageUrl(product),
            })

            nextItems.unshift(normalized)
          }

          const totals = calculateTotals(nextItems)

          return {
            items: nextItems,
            itemCount: totals.itemCount,
            subtotal: totals.subtotal,
            isOpen: state.isOpen,
            bounceKey: state.bounceKey + 1,
          }
        })
      },
      optimisticRemove: (identifier) => {
        set((state) => {
          const nextItems = state.items.filter((item) => !matchItem(item, identifier))
          const totals = calculateTotals(nextItems)

          return {
            items: nextItems,
            itemCount: totals.itemCount,
            subtotal: totals.subtotal,
          }
        })
      },
      optimisticUpdate: (identifier, qty) => {
        set((state) => {
          const safeQty = Math.max(0, Number(qty || 0))
          const nextItems = state.items
            .map((item) => {
              if (!matchItem(item, identifier)) {
                return item
              }

              const nextQty = Math.min(10, safeQty)

              if (nextQty <= 0) {
                return null
              }

              return {
                ...item,
                qty: nextQty,
                quantity: nextQty,
                subtotal: roundMoney(nextQty * Number(item.unit_price || item.price || 0)),
                line_subtotal: roundMoney(nextQty * Number(item.unit_price || item.price || 0)),
              }
            })
            .filter(Boolean)

          const totals = calculateTotals(nextItems)

          return {
            items: nextItems,
            itemCount: totals.itemCount,
            subtotal: totals.subtotal,
          }
        })
      },
      optimisticClear: () => {
        set((state) => ({
          items: [],
          subtotal: 0,
          itemCount: 0,
          isOpen: state.isOpen,
        }))
      },
      addItem: (item, qty = 1, selectedSize = null) => get().optimisticAdd(item, qty, selectedSize),
      removeItem: (identifier) => get().optimisticRemove(identifier),
      updateQty: (identifier, qty) => get().optimisticUpdate(identifier, qty),
      clearCart: () => get().optimisticClear(),
      getItemCount: () => {
        const state = get()

        return state.itemCount || calculateTotals(state.items).itemCount
      },
      getTotal: () => {
        const state = get()

        return state.subtotal || calculateTotals(state.items).subtotal
      },
    }),
    {
      name: 'brewhaus_cart',
      partialize: (state) => ({
        items: state.items,
        subtotal: state.subtotal,
        itemCount: state.itemCount,
      }),
    },
  ),
)
