import { ArrowLeft, ImagePlus, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import StockStatusBadge from '../../components/admin/StockStatusBadge'
import Button from '../../components/ui/Button'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import { useAdminCategories } from '../../hooks/admin/useAdminCategories'
import { useAdjustStockMutation } from '../../hooks/admin/useInventory'
import {
  useAdminProduct,
  useCreateProductMutation,
  useUpdateProductMutation,
} from '../../hooks/admin/useAdminProducts'
import { getApiErrorMessage } from '../../utils/apiErrors'
import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_UPLOAD_MAX_LABEL,
  getAdminImageValidationMessage,
} from '../../utils/imageUploads'
import { isSlugAutoManaged, slugify } from '../../utils/slugify'
import { normalizePublicAssetUrl } from '../../utils/storefront'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(value || 0))
}

function getStockStatus(stockQuantity, lowStockThreshold) {
  const quantity = Number(stockQuantity || 0)
  const threshold = Number(lowStockThreshold || 0)

  if (quantity <= 0) {
    return 'out_of_stock'
  }

  if (quantity <= threshold) {
    return 'low_stock'
  }

  return 'in_stock'
}

const STOCK_ADJUSTMENT_OPTIONS = [
  { value: 'count_correction', label: 'Count Correction' },
  { value: 'damage', label: 'Damage / Write-off' },
  { value: 'manual_set', label: 'Manual Set' },
  { value: 'return_to_stock', label: 'Return to Stock' },
]

function getStockDeltaMessage(delta) {
  if (delta > 0) {
    return `This will increase stock by ${delta}.`
  }

  if (delta < 0) {
    return `This will reduce stock by ${Math.abs(delta)}.`
  }

  return 'No stock change will be made.'
}

function makeInitialState() {
  return {
    name: '',
    slug: '',
    short_description: '',
    description: '',
    price: '',
    sale_price: '',
    sku: '',
    low_stock_threshold: 10,
    weight_grams: '',
    size_options: [],
    category_id: '',
    is_featured: false,
    is_active: true,
    tags: [],
    images: [],
    primary_image_index: 0,
    existingImages: [],
  }
}

function toFormState(product) {
  return {
    name: product.name || '',
    slug: product.slug || '',
    short_description: product.short_description || '',
    description: product.description || '',
    price: product.price ?? '',
    sale_price: product.sale_price ?? '',
    sku: product.sku || '',
    low_stock_threshold: product.low_stock_threshold ?? 10,
    weight_grams: product.weight_grams ?? '',
    size_options: product.size_options || [],
    category_id: product.category_id || '',
    is_featured: Boolean(product.is_featured),
    is_active: Boolean(product.is_active),
    tags: (product.tags || []).map((tag) => tag.name),
    images: [],
    primary_image_index: 0,
    existingImages: product.images || [],
  }
}

function ProductFormEditor({ id, isEdit, initialProduct, categories }) {
  const navigate = useNavigate()
  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const adjustStockMutation = useAdjustStockMutation()

  const [form, setForm] = useState(() =>
    initialProduct ? toFormState(initialProduct) : makeInitialState(),
  )
  const [currentStock, setCurrentStock] = useState(() => Number(initialProduct?.stock_quantity ?? 0))
  const [stockAdjustment, setStockAdjustment] = useState(() => ({
    new_quantity: String(initialProduct?.stock_quantity ?? 0),
    adjustment_type: 'count_correction',
    note: '',
  }))
  const [tagInput, setTagInput] = useState('')
  const [sizeInput, setSizeInput] = useState('')
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(() =>
    initialProduct
      ? !isSlugAutoManaged(initialProduct.name || '', initialProduct.slug || '')
      : false,
  )

  const selectedImagePreviews = useMemo(
    () =>
      form.images.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [form.images],
  )

  useEffect(
    () => () => {
      selectedImagePreviews.forEach((entry) => URL.revokeObjectURL(entry.url))
    },
    [selectedImagePreviews],
  )

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleNameChange = (value) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: isSlugManuallyEdited ? current.slug : slugify(value),
    }))
  }

  const handleSlugChange = (value) => {
    setForm((current) => ({
      ...current,
      slug: value,
    }))
    setIsSlugManuallyEdited(!isSlugAutoManaged(form.name, value))
  }

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || [])

    if (selected.length === 0) {
      return
    }

    const validationMessage = getAdminImageValidationMessage(selected, 'Product image')

    if (validationMessage) {
      toast.error(validationMessage)
      event.target.value = ''
      return
    }

    setForm((current) => ({
      ...current,
      images: selected,
      primary_image_index: 0,
    }))
  }

  const removeImage = (index) => {
    setForm((current) => {
      const images = current.images.filter((_, fileIndex) => fileIndex !== index)
      return {
        ...current,
        images,
        primary_image_index: Math.min(current.primary_image_index, Math.max(images.length - 1, 0)),
      }
    })
  }

  const addTag = () => {
    const value = tagInput.trim()
    if (!value || form.tags.includes(value)) {
      setTagInput('')
      return
    }

    setForm((current) => ({
      ...current,
      tags: [...current.tags, value],
    }))
    setTagInput('')
  }

  const addSize = () => {
    const value = sizeInput.trim()
    if (!value || form.size_options.includes(value)) {
      setSizeInput('')
      return
    }

    setForm((current) => ({
      ...current,
      size_options: [...current.size_options, value],
    }))
    setSizeInput('')
  }

  const removeTag = (tag) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag),
    }))
  }

  const removeSize = (sizeOption) => {
    setForm((current) => ({
      ...current,
      size_options: current.size_options.filter((item) => item !== sizeOption),
    }))
  }

  const applyPreset = (changes) => {
    setForm((current) => ({
      ...current,
      ...changes,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      ...form,
      category_id: Number(form.category_id),
      price: Number(form.price),
      sale_price: form.sale_price === '' ? '' : Number(form.sale_price),
      low_stock_threshold: Number(form.low_stock_threshold),
      weight_grams: form.weight_grams === '' ? '' : Number(form.weight_grams),
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, payload })
        toast.success('Product updated.')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Product created.')
      }

      navigate('/admin/products')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save product.'))
    }
  }

  const handleStockAdjustmentChange = (key, value) => {
    setStockAdjustment((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleAdjustStock = async () => {
    if (!isEdit) {
      return
    }

    try {
      const updated = await adjustStockMutation.mutateAsync({
        productId: id,
        payload: {
          new_quantity: Number(stockAdjustment.new_quantity || 0),
          adjustment_type: stockAdjustment.adjustment_type,
          note: stockAdjustment.note.trim(),
        },
      })

      const nextStock = Number(updated?.stock_quantity ?? stockAdjustment.new_quantity ?? 0)
      setCurrentStock(nextStock)
      setStockAdjustment({
        new_quantity: String(nextStock),
        adjustment_type: 'count_correction',
        note: '',
      })
      toast.success('Stock adjusted.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to adjust stock.'))
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const numericPrice = Number(form.price || 0)
  const numericSalePrice = Number(form.sale_price || 0)
  const numericCurrentStock = Number(currentStock || 0)
  const numericThreshold = Number(form.low_stock_threshold || 0)
  const numericAdjustmentQuantity = Number(stockAdjustment.new_quantity || 0)
  const stockDelta = numericAdjustmentQuantity - numericCurrentStock
  const hasSalePrice = form.sale_price !== '' && numericSalePrice > 0 && numericSalePrice < numericPrice
  const storefrontPrice = hasSalePrice ? numericSalePrice : numericPrice
  const discountPercent =
    hasSalePrice && numericPrice > 0
      ? Math.round(((numericPrice - numericSalePrice) / numericPrice) * 100)
      : 0
  const stockStatus = getStockStatus(numericCurrentStock, numericThreshold)
  const visibleImages =
    selectedImagePreviews.length > 0
      ? selectedImagePreviews.map((entry, index) => ({
          key: entry.url,
          image_url: entry.url,
          index,
          isNew: true,
        }))
      : form.existingImages.map((image, index) => ({
          key: image.id,
          image_url: normalizePublicAssetUrl(image.image_url),
          index,
          isNew: false,
        }))
  const activeCategory = categories.find((category) => String(category.id) === String(form.category_id))
  const inputClassName =
    'mt-2 w-full rounded-2xl border border-[#ddd5c4] bg-white px-4 py-3 text-[#1a1a1a] placeholder:text-[#9a9385] focus:border-[#c89b2a] focus:outline-none focus:ring-2 focus:ring-[#c89b2a]/25'
  const monoInputClassName = `${inputClassName} font-mono`
  const sectionTitleClassName = 'text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]'
  const helperCardClassName = 'rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4'

  return (
    <form className="space-y-6 animate-fade-up" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-2 text-sm text-[#7a7a7a] transition hover:text-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7e58]">
            {isEdit ? 'Edit Product' : 'New Product'}
          </div>
          <h1 className="mt-2 text-4xl font-extrabold text-[#1a1a1a]">
            {isEdit ? form.name || 'Product form' : 'Create catalog product'}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StockStatusBadge status={stockStatus} />
            <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
              {form.is_active ? 'Active' : 'Hidden'}
            </span>
            <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
              {form.is_featured ? 'Featured' : 'Standard'}
            </span>
          </div>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save product'}
        </Button>
      </div>

      <section className="first-light-shell-card rounded-[30px] p-6">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className={sectionTitleClassName}>Product command</div>
            <h2 className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
              Price, stock health, and visibility stay visible while you edit
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset({ is_featured: true, is_active: true })}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Feature live
              </button>
              <button
                type="button"
                onClick={() => applyPreset({ sale_price: '', is_featured: false })}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Clear sale
              </button>
              <button
                type="button"
                onClick={() => handleSlugChange(slugify(form.name))}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Refresh slug
              </button>
            </div>
            <div className="mt-4 text-sm text-[#666666]">
              {activeCategory
                ? `Currently filed under ${activeCategory.name}.`
                : 'Assign a category so this product is easier to find in the catalog.'}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={helperCardClassName}>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                Storefront price
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-[#8d6b12]">
                {formatCurrency(storefrontPrice)}
              </div>
              <div className="mt-2 text-xs text-[#666666]">
                {hasSalePrice ? `${discountPercent}% below regular price` : 'Regular pricing active'}
              </div>
            </div>
            <div className={helperCardClassName}>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                Stock health
              </div>
              <div className="mt-2">
                <StockStatusBadge status={stockStatus} />
              </div>
              <div className="mt-2 text-xs text-[#666666]">
                {numericCurrentStock} on hand, alert at {numericThreshold}
              </div>
            </div>
            <div className={helperCardClassName}>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                Images
              </div>
              <div className="mt-2 text-xl font-bold text-[#1a1a1a]">{visibleImages.length}</div>
              <div className="mt-2 text-xs text-[#666666]">
                {selectedImagePreviews.length > 0 ? 'New uploads staged' : 'Current gallery attached'}
              </div>
            </div>
            <div className={helperCardClassName}>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                Tags
              </div>
              <div className="mt-2 text-xl font-bold text-[#1a1a1a]">{form.tags.length}</div>
              <div className="mt-2 text-xs text-[#666666]">
                Use tags for quick search and merchandising
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="first-light-shell-card space-y-6 rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={sectionTitleClassName}>Core details</div>
              <div className="mt-2 text-sm text-[#666666]">
                Keep catalog identity, pricing, and inventory policy in one edit pass.
              </div>
            </div>
            <div className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
              SKU {form.sku || 'Pending'}
            </div>
          </div>

          <div className="grid gap-5">
            <label className="block">
              <div className={sectionTitleClassName}>
                Product Name
              </div>
              <input
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                className={inputClassName}
                required
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <div className={sectionTitleClassName}>
                  SKU
                </div>
                <input
                  value={form.sku}
                  onChange={(event) => handleChange('sku', event.target.value)}
                  className={monoInputClassName}
                  required
                />
              </label>

              <label className="block">
                <div className={sectionTitleClassName}>
                  Category
                </div>
                <select
                  value={form.category_id}
                  onChange={(event) => handleChange('category_id', event.target.value)}
                  className={inputClassName}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <div className={sectionTitleClassName}>
                Slug
              </div>
              <input
                value={form.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="Optional. Leave blank to auto-generate."
                className={inputClassName}
              />
            </label>

            <label className="block">
              <div className={sectionTitleClassName}>
                Short Description
              </div>
              <textarea
                value={form.short_description}
                onChange={(event) => handleChange('short_description', event.target.value)}
                rows={2}
                maxLength={255}
                className={inputClassName}
                required
              />
            </label>

            <label className="block">
              <div className={sectionTitleClassName}>
                Full Description
              </div>
              <textarea
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={10}
                className={inputClassName}
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={helperCardClassName}>
                <div className={sectionTitleClassName}>Pricing</div>
                <div className="mt-2 text-sm text-[#666666]">
                  Regular price, sale override, and savings preview stay together.
                </div>
              </div>
              <div className={helperCardClassName}>
                <div className={sectionTitleClassName}>Inventory</div>
                <div className="mt-2 text-sm text-[#666666]">
                  Thresholds live here. Audited stock changes happen in a separate adjustment panel.
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <div className={sectionTitleClassName}>
                  Price
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => handleChange('price', event.target.value)}
                  className={`${monoInputClassName} text-[#8d6b12]`}
                  required
                />
              </label>

              <label className="block">
                <div className={sectionTitleClassName}>
                  Sale Price
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sale_price}
                  onChange={(event) => handleChange('sale_price', event.target.value)}
                  className={`${monoInputClassName} text-[#8d6b12]`}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset({ sale_price: numericPrice > 0 ? String((numericPrice * 0.9).toFixed(2)) : '' })}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Apply 10% sale
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <div className={sectionTitleClassName}>
                  Low Stock Threshold
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.low_stock_threshold}
                  onChange={(event) => handleChange('low_stock_threshold', event.target.value)}
                  className={inputClassName}
                  required
                />
              </label>

              <label className="block">
                <div className={sectionTitleClassName}>
                  Weight (grams)
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.weight_grams}
                  onChange={(event) => handleChange('weight_grams', event.target.value)}
                  className={inputClassName}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
              <div className={helperCardClassName}>
                <div className={sectionTitleClassName}>Current Stock Level</div>
                <div className="mt-3 font-mono text-3xl font-bold text-[#1a1a1a]">
                  {numericCurrentStock}
                </div>
                <div className="mt-3">
                  <StockStatusBadge status={stockStatus} />
                </div>
                <div className="mt-3 text-sm text-[#666666]">
                  {isEdit
                    ? 'This value is fetched from the product record and cannot be edited directly.'
                    : 'New products start at zero stock until you save and run an inventory adjustment.'}
                </div>
              </div>

              <div className={helperCardClassName}>
                <div className={sectionTitleClassName}>Adjust Stock</div>
                <div className="mt-2 text-sm text-[#666666]">
                  Every stock change in this panel is written to the inventory log with an adjustment type and note.
                </div>

                {isEdit ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <div className={sectionTitleClassName}>New Quantity</div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={stockAdjustment.new_quantity}
                          onChange={(event) => handleStockAdjustmentChange('new_quantity', event.target.value)}
                          className={inputClassName}
                        />
                      </label>

                      <label className="block">
                        <div className={sectionTitleClassName}>Adjustment Type</div>
                        <select
                          value={stockAdjustment.adjustment_type}
                          onChange={(event) => handleStockAdjustmentChange('adjustment_type', event.target.value)}
                          className={inputClassName}
                        >
                          {STOCK_ADJUSTMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block">
                      <div className={sectionTitleClassName}>Note</div>
                      <textarea
                        value={stockAdjustment.note}
                        onChange={(event) => handleStockAdjustmentChange('note', event.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Explain why this adjustment is being made."
                        className={inputClassName}
                      />
                    </label>

                    <div className="rounded-2xl border border-[#ece4d5] bg-white px-4 py-3 text-sm text-[#5f5642]">
                      {getStockDeltaMessage(stockDelta)}
                    </div>

                    <Button
                      type="button"
                      onClick={handleAdjustStock}
                      disabled={adjustStockMutation.isPending || stockDelta === 0}
                    >
                      {adjustStockMutation.isPending ? 'Adjusting...' : 'Adjust stock'}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#ddd5c4] px-4 py-4 text-sm text-[#7a7a7a]">
                    Save the product first, then use this panel to create a logged inventory adjustment.
                  </div>
                )}
              </div>
            </div>

            <div className={helperCardClassName}>
              <div className={sectionTitleClassName}>Size Options</div>
              <div className="mt-2 text-sm text-[#666666]">
                Optional storefront sizes. Current stock remains shared across all sizes for this product.
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={sizeInput}
                  onChange={(event) => setSizeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addSize()
                    }
                  }}
                  placeholder="Add size like S, M, L, XL, or One size"
                  className={inputClassName}
                />
                <Button type="button" onClick={addSize}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {form.size_options.map((sizeOption) => (
                  <button
                    key={sizeOption}
                    type="button"
                    onClick={() => removeSize(sizeOption)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#ddd5c4] bg-white px-3 py-1.5 text-sm text-[#1a1a1a]"
                  >
                    {sizeOption}
                    <X className="h-3.5 w-3.5 text-[#7a7a7a]" />
                  </button>
                ))}
                {form.size_options.length === 0 ? (
                  <div className="text-sm text-[#7a7a7a]">No sizes added. Products without sizes stay single-format.</div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="first-light-shell-card rounded-[28px] p-6">
            <div className={sectionTitleClassName}>Save rail</div>
            <div className="mt-3 text-sm text-[#666666]">
              Keep storefront state, audited stock, and media visible while you save.
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className={helperCardClassName}>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                  Storefront
                </div>
                <div className="mt-2 text-lg font-bold text-[#1a1a1a]">
                  {form.is_active ? 'Visible' : 'Hidden'}
                </div>
              </div>
              <div className={helperCardClassName}>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#7a7a7a]">
                  Sell Price
                </div>
                <div className="mt-2 font-mono text-lg text-[#8d6b12]">
                  {formatCurrency(storefrontPrice)}
                </div>
              </div>
            </div>
            <Button className="mt-5 w-full" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEdit ? 'Update product' : 'Create product'}
            </Button>
          </section>

          <section className="first-light-shell-card rounded-[28px] p-6">
            <div className={sectionTitleClassName}>Images</div>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#ddd5c4] bg-[#fcfaf4] px-6 py-10 text-center transition hover:border-[#c89b2a]">
              <ImagePlus className="h-7 w-7 text-[#8d6b12]" />
              <div className="mt-4 text-lg font-bold text-[#1a1a1a]">
                Drop images here or click to upload
              </div>
              <div className="mt-2 text-sm text-[#666666]">
                Upload JPG, PNG, or WEBP images up to {ADMIN_IMAGE_UPLOAD_MAX_LABEL} each.
              </div>
              <input
                type="file"
                accept={ADMIN_IMAGE_ACCEPT}
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {visibleImages.length > 0 ? (
              <div className="mt-5 grid grid-cols-3 gap-3">
                {visibleImages.map((image) => (
                  <div
                    key={image.key}
                    className="relative overflow-hidden rounded-2xl border border-[#ece4d5] bg-white"
                  >
                    <img
                      src={image.image_url}
                      alt="Product preview"
                      className="h-24 w-full object-cover"
                    />
                    {image.isNew ? (
                      <button
                        type="button"
                        onClick={() => removeImage(image.index)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#1a1a1a] shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                    {image.isNew ? (
                      <button
                        type="button"
                        onClick={() => handleChange('primary_image_index', image.index)}
                        className={[
                          'absolute bottom-2 left-2 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]',
                          form.primary_image_index === image.index
                            ? 'bg-[#c89b2a] text-white'
                            : 'bg-white/90 text-[#1a1a1a]',
                        ].join(' ')}
                      >
                        {form.primary_image_index === image.index ? 'Primary' : 'Set primary'}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="first-light-shell-card rounded-[28px] p-6">
            <div className={sectionTitleClassName}>
              Flags
            </div>
            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
                <div>
                  <div className="text-sm font-medium text-[#1a1a1a]">Featured</div>
                  <div className="mt-1 text-xs text-[#666666]">
                    Show in storefront hero and featured sections.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => handleChange('is_featured', event.target.checked)}
                  className="h-5 w-5 accent-ember"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
                <div>
                  <div className="text-sm font-medium text-[#1a1a1a]">Active</div>
                  <div className="mt-1 text-xs text-[#666666]">
                    Controls catalog visibility and add-to-cart availability.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => handleChange('is_active', event.target.checked)}
                  className="h-5 w-5 accent-ember"
                />
              </label>
            </div>
          </section>

          <section className="first-light-shell-card rounded-[28px] p-6">
            <div className={sectionTitleClassName}>
              Tags
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                 if (event.key === 'Enter') {
                   event.preventDefault()
                   addTag()
                 }
                }}
                placeholder="Type a tag and press Enter"
                className={inputClassName}
              />
              <Button type="button" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1.5 text-sm text-[#1a1a1a]"
                >
                  {tag}
                  <X className="h-3.5 w-3.5 text-[#7a7a7a]" />
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </form>
  )
}

// [CODEX] React e-commerce component: ProductFormPage
// Uses: useAdminProduct, useAdminCategories, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: loads the product record if needed, then mounts the editor with stable initial state.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const categoriesQuery = useAdminCategories()
  const productQuery = useAdminProduct(id)

  if (isEdit && productQuery.isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    )
  }

  if (isEdit && (productQuery.isError || !productQuery.data)) {
    return (
      <ErrorState
        title="Unable to load product."
        description="The product detail needed for editing could not be loaded."
        onAction={() => productQuery.refetch()}
      />
    )
  }

  return (
    <ProductFormEditor
      key={isEdit ? String(id) : 'new-product'}
      id={id}
      isEdit={isEdit}
      initialProduct={productQuery.data || null}
      categories={categoriesQuery.data || []}
    />
  )
}
