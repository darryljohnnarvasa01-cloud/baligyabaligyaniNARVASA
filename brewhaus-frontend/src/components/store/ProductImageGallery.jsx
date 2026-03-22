import { useMemo, useState } from 'react'
import { normalizePublicAssetUrl } from '../../utils/storefront'

/**
 * // [CODEX] React e-commerce component: ProductImageGallery
 * // Uses: Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: shows the primary product image and allows thumbnail-driven swaps with a light crossfade feel.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function ProductImageGallery({ productName, images }) {
  const gallery = useMemo(() => (Array.isArray(images) ? images : []), [images])
  const [activeKey, setActiveKey] = useState(null)

  const activeImage =
    gallery.find((image, index) => (image.id || image.image_url || index) === activeKey) ||
    gallery[0] ||
    null
  const activeImageUrl = normalizePublicAssetUrl(activeImage?.image_url)

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[28px] border border-border bg-white p-4 shadow-sm">
        <div className="aspect-[4/4.6] overflow-hidden rounded-[24px] border border-border bg-surface">
          {activeImageUrl ? (
            <img
              alt={activeImage.alt_text || productName}
              className="h-full w-full animate-fade-up object-cover"
              key={activeImage.id || activeImage.image_url}
              src={activeImageUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-ink-4">DISKR3T</div>
                <div className="mt-3 font-display text-4xl italic text-ink">{productName}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {gallery.map((image, index) => {
            const imageKey = image.id || image.image_url || index
            const active = imageKey === (activeImage?.id || activeImage?.image_url || 0)
            const imageUrl = normalizePublicAssetUrl(image?.image_url)

            return (
              <button
                key={imageKey}
                className={[
                  'relative overflow-hidden rounded-[8px] border bg-white transition hover:border-border-strong hover:shadow-md',
                  active ? 'border-ember shadow-ember' : 'border-border',
                ].join(' ')}
                onClick={() => setActiveKey(imageKey)}
                type="button"
              >
                <div className="aspect-square">
                  {imageUrl ? (
                    <img alt={image.alt_text || productName} className="h-full w-full object-cover" src={imageUrl} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.18em] text-ink-4">
                      DISKR3T
                    </div>
                  )}
                </div>

                {image?.is_primary ? (
                  <div className="absolute right-2 top-2 rounded-[5px] bg-ember px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                    Primary
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
