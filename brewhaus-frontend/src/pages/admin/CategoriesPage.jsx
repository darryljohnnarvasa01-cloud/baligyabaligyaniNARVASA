import { GripVertical, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import {
  useAdminCategories,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '../../hooks/admin/useAdminCategories'
import { buildCategoryUpdatePayload } from '../../utils/adminPayloads'
import { getApiErrorMessage } from '../../utils/apiErrors'
import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_UPLOAD_MAX_LABEL,
  getAdminImageValidationMessage,
} from '../../utils/imageUploads'
import { getAdminToneClasses, getAdminToneDotClasses } from '../../utils/adminTones'
import { isSlugAutoManaged, slugify } from '../../utils/slugify'
import { normalizePublicAssetUrl } from '../../utils/storefront'

function initialCategoryState() {
  return {
    name: '',
    slug: '',
    description: '',
    sort_order: 0,
    is_active: true,
    image: null,
  }
}

function toCategoryFormState(category) {
  return {
    name: category.name || '',
    slug: category.slug || '',
    description: category.description || '',
    sort_order: category.sort_order ?? 0,
    is_active: Boolean(category.is_active),
    image: null,
  }
}

function formatStatusLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getCategoryVisibilityTone(category) {
  return category?.is_active ? 'healthy' : 'critical'
}

// [CODEX] React e-commerce component: CategoriesPage
// Uses: useAdminCategories, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: manages category records with inline create and edit modal flows for the admin catalog.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function CategoriesPage() {
  const categoriesQuery = useAdminCategories()
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation()
  const deleteMutation = useDeleteCategoryMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [form, setForm] = useState(initialCategoryState)
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const [orderedCategories, setOrderedCategories] = useState(null)
  const [draggedCategoryId, setDraggedCategoryId] = useState(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null)
  const [reorderConfirmOpen, setReorderConfirmOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const previewImageUrl = useMemo(
    () => (form.image instanceof File ? URL.createObjectURL(form.image) : null),
    [form.image],
  )

  useEffect(
    () => () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl)
      }
    },
    [previewImageUrl],
  )

  const categoryList = useMemo(
    () => orderedCategories || categoriesQuery.data || [],
    [categoriesQuery.data, orderedCategories],
  )

  const visibleCategories = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase()

    return categoryList.filter((category) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [category.name, category.slug, category.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery))

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.is_active) ||
        (statusFilter === 'inactive' && !category.is_active)

      return matchesSearch && matchesStatus
    })
  }, [categoryList, searchValue, statusFilter])

  const categorySummary = useMemo(() => {
    const source = categoriesQuery.data || []

    return {
      total: source.length,
      active: source.filter((category) => category.is_active).length,
      hidden: source.filter((category) => !category.is_active).length,
      products: source.reduce((sum, category) => sum + Number(category.product_count || 0), 0),
    }
  }, [categoriesQuery.data])

  const isFilteredView = searchValue.trim().length > 0 || statusFilter !== 'all'
  const modalInputClassName =
    'mt-2 w-full rounded-xl border border-[#ddd5c4] bg-white px-4 py-3 text-[#1a1a1a] placeholder:text-[#9a9385] focus:border-[#c89b2a] focus:outline-none focus:ring-2 focus:ring-[#c89b2a]/25'
  const modalImagePreviewUrl = previewImageUrl || normalizePublicAssetUrl(editingCategory?.image_url)

  const isReorderDirty = useMemo(() => {
    const source = categoriesQuery.data || []
    if (source.length !== categoryList.length) {
      return false
    }

    return source.some((category, index) => category.id !== categoryList[index]?.id)
  }, [categoriesQuery.data, categoryList])

  const resetFormState = () => {
    setFormOpen(false)
    setEditingCategory(null)
    setForm(initialCategoryState())
    setIsSlugManuallyEdited(false)
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setForm({
      ...initialCategoryState(),
      sort_order: (categoriesQuery.data || []).length,
    })
    setIsSlugManuallyEdited(false)
    setFormOpen(true)
  }

  const openEditModal = (category) => {
    setEditingCategory(category)
    setForm(toCategoryFormState(category))
    setIsSlugManuallyEdited(!isSlugAutoManaged(category.name || '', category.slug || ''))
    setFormOpen(true)
  }

  const handleNameChange = (value) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: isSlugManuallyEdited ? current.slug : slugify(value),
    }))
  }

  const handleSlugChange = (value) => {
    setForm((current) => ({ ...current, slug: value }))
    setIsSlugManuallyEdited(!isSlugAutoManaged(form.name, value))
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null

    if (!file) {
      setForm((current) => ({ ...current, image: null }))
      return
    }

    const validationMessage = getAdminImageValidationMessage([file], 'Category image')

    if (validationMessage) {
      toast.error(validationMessage)
      event.target.value = ''
      return
    }

    setForm((current) => ({ ...current, image: file }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          payload: form,
        })
        toast.success('Category updated.')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Category created.')
      }

      resetFormState()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save category.'))
    }
  }

  const handleDelete = async () => {
    if (!deleteCategory) {
      return
    }

    try {
      await deleteMutation.mutateAsync(deleteCategory.id)
      toast.success('Category deleted.')
      setDeleteCategory(null)
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to delete category.',
      )
    }
  }

  const handleQuickToggle = async (category) => {
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        payload: buildCategoryUpdatePayload(category, {
          is_active: !category.is_active,
        }),
      })
      toast.success(`Category ${category.is_active ? 'hidden' : 'activated'}.`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update category.'))
    }
  }

  const moveCategory = (draggedId, targetId) => {
    if (!draggedId || !targetId || draggedId === targetId) {
      return
    }

    setOrderedCategories((current) => {
      const source = current || categoriesQuery.data || []
      const draggedIndex = source.findIndex((category) => category.id === draggedId)
      const targetIndex = source.findIndex((category) => category.id === targetId)

      if (draggedIndex === -1 || targetIndex === -1) {
        return source
      }

      const next = [...source]
      const [dragged] = next.splice(draggedIndex, 1)
      next.splice(targetIndex, 0, dragged)
      return next
    })
  }

  const handleSaveReorder = async () => {
    const results = await Promise.allSettled(
      categoryList.map((category, index) =>
        updateMutation.mutateAsync({
          id: category.id,
          payload: buildCategoryUpdatePayload(category, {
            sort_order: index,
          }),
        }),
      ),
    )

    const successCount = results.filter((result) => result.status === 'fulfilled').length

    if (successCount > 0) {
      toast.success('Category order updated.')
      setOrderedCategories(null)
      setDragOverCategoryId(null)
      setDraggedCategoryId(null)
      setReorderConfirmOpen(false)
      return
    }

    const rejected = results.find((result) => result.status === 'rejected')
    toast.error(
      rejected?.reason?.response?.data?.message ||
        rejected?.reason?.message ||
        'Failed to save category order.',
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7e58]">
            Categories
          </div>
          <h1 className="mt-2 text-4xl font-extrabold text-[#1a1a1a]">
            Catalog Taxonomy
          </h1>
          <div className="mt-3 text-sm text-[#666666]">
            Reorder storefront structure, monitor category coverage, and update visibility from one board.
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      <section className="first-light-shell-card rounded-[30px] p-6">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
              Category command
            </div>
            <h2 className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
              Catalog structure stays visible above the fold
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Create category
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Show active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Show hidden
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  setStatusFilter('all')
                }}
                className="first-light-outline-button rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                Clear filters
              </button>
            </div>
            <div className="mt-4 text-sm text-[#666666]">
              Drag cards to reorder. Storefront sort order is only saved after confirmation.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                Total categories
              </div>
              <div className="mt-2 text-3xl font-extrabold text-[#1a1a1a]">{categorySummary.total}</div>
            </div>
            <div className="rounded-[20px] border border-[#bfe1c8] bg-[#edf8f0] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#23613a]">
                Active
              </div>
              <div className="mt-2 text-3xl font-extrabold text-[#23613a]">{categorySummary.active}</div>
            </div>
            <div className="rounded-[20px] border border-[#f0b9b9] bg-[#fff1f1] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9b3535]">
                Hidden
              </div>
              <div className="mt-2 text-3xl font-extrabold text-[#9b3535]">{categorySummary.hidden}</div>
            </div>
            <div className="rounded-[20px] border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#777777]">
                Mapped products
              </div>
              <div className="mt-2 text-3xl font-extrabold text-[#1a1a1a]">{categorySummary.products}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="first-light-shell-card rounded-[24px] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <label className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search name, slug, or description"
                className="w-full rounded-2xl border border-[#ddd5c4] bg-white py-3 pl-10 pr-4 text-[#1a1a1a] placeholder:text-[#9a9385] focus:border-[#c89b2a] focus:outline-none focus:ring-2 focus:ring-[#c89b2a]/25"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-[#ddd5c4] bg-white px-4 py-3 text-[#1a1a1a] focus:border-[#c89b2a] focus:outline-none focus:ring-2 focus:ring-[#c89b2a]/25"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Hidden only</option>
            </select>
          </div>

          {isReorderDirty ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-[#ecd18c] bg-[#fff7de] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6400]">
                Unsaved order
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setOrderedCategories(null)
                  setDraggedCategoryId(null)
                  setDragOverCategoryId(null)
                }}
              >
                Reset order
              </Button>
              <Button onClick={() => setReorderConfirmOpen(true)}>Save order</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {isFilteredView ? (
                <div className="rounded-full border border-[#ecd18c] bg-[#fff7de] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6400]">
                  Clear filters to reorder
                </div>
              ) : null}
              <div className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                {visibleCategories.length} visible on this view
              </div>
            </div>
          )}
        </div>
      </section>

      {categoriesQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-12 w-12" />
        </div>
      ) : categoriesQuery.isError ? (
        <ErrorState
          title="Unable to load categories."
          description="The admin category list request failed."
          onAction={() => categoriesQuery.refetch()}
        />
      ) : (categoriesQuery.data || []).length === 0 ? (
        <EmptyState
          title="No categories yet."
          description="Create the first product category for the storefront."
          actionLabel="Add category"
          onAction={openCreateModal}
          titleClassName="italic"
        />
      ) : visibleCategories.length === 0 ? (
        <EmptyState
          title="No categories match."
          description="Try a different search or clear the current status filter."
          actionLabel="Clear filters"
          onAction={() => {
            setSearchValue('')
            setStatusFilter('all')
          }}
          titleClassName="italic"
        />
      ) : (
        <div className="space-y-4">
          {visibleCategories.map((category) => {
            const sourceIndex = categoryList.findIndex((item) => item.id === category.id)
            const visibilityTone = getCategoryVisibilityTone(category)

            return (
            <article
              key={category.id}
              className={[
                'first-light-shell-card overflow-hidden rounded-[28px] transition',
                dragOverCategoryId === category.id ? 'ring-2 ring-[#c89b2a]/35' : '',
              ].join(' ')}
              draggable={!isFilteredView}
              onDragEnd={() => {
                setDraggedCategoryId(null)
                setDragOverCategoryId(null)
              }}
              onDragOver={(event) => {
                if (isFilteredView) {
                  return
                }
                event.preventDefault()
                moveCategory(draggedCategoryId, category.id)
                setDragOverCategoryId(category.id)
              }}
              onDragStart={() => {
                if (!isFilteredView) {
                  setDraggedCategoryId(category.id)
                }
              }}
            >
              <div className="grid gap-4 p-5 lg:grid-cols-[auto_112px_minmax(0,1fr)_auto] lg:items-center">
                <button
                  type="button"
                  className={[
                    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e0e0e0] bg-[#f6f3ec] text-[#8d6b12]',
                    isFilteredView ? 'cursor-not-allowed opacity-50' : '',
                  ].join(' ')}
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                <div className="h-24 overflow-hidden rounded-[20px] border border-[#e0e0e0] bg-[#f4f4f4]">
                  {category.image_url ? (
                    <img
                      src={normalizePublicAssetUrl(category.image_url)}
                      alt={category.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a7e58]">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-extrabold text-[#1a1a1a]">{category.name}</h2>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7a7a7a]">
                        {category.slug}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={[
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
                          getAdminToneClasses(visibilityTone),
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'h-1.5 w-1.5 rounded-full',
                            getAdminToneDotClasses(visibilityTone),
                          ].join(' ')}
                        />
                        {category.is_active ? 'Visible' : 'Hidden'}
                      </span>
                      <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                        Position {sourceIndex + 1}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#666666]">
                    {category.description || 'No description provided.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                      {Number(category.product_count || 0)} products
                    </span>
                    <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                      Sort {Number(category.sort_order ?? sourceIndex)}
                    </span>
                    <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                      {formatStatusLabel(category.is_active ? 'active' : 'inactive')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    variant="secondary"
                    className="px-3 py-2"
                    onClick={() => handleQuickToggle(category)}
                  >
                    {category.is_active ? 'Set inactive' : 'Set active'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3 py-2"
                    onClick={() => openEditModal(category)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3 py-2"
                    onClick={() => setDeleteCategory(category)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </article>
            )
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          if (!createMutation.isPending && !updateMutation.isPending) {
            resetFormState()
          }
        }}
        title={editingCategory ? `Edit ${editingCategory.name}` : 'Create category'}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              Category summary
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
                  getAdminToneClasses(form.is_active ? 'healthy' : 'critical'),
                ].join(' ')}
              >
                <span
                  className={[
                    'h-1.5 w-1.5 rounded-full',
                    getAdminToneDotClasses(form.is_active ? 'healthy' : 'critical'),
                  ].join(' ')}
                />
                {form.is_active ? 'Visible' : 'Hidden'}
              </span>
              <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                Position {editingCategory ? Number(editingCategory.sort_order ?? 0) + 1 : Number(form.sort_order) + 1}
              </span>
              <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5642]">
                {editingCategory ? `${Number(editingCategory.product_count || 0)} products` : 'New category'}
              </span>
            </div>
          </div>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
              Name
            </div>
            <input
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
              className={modalInputClassName}
              required
            />
          </label>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
              Slug
            </div>
            <input
              value={form.slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="Optional. Leave blank to auto-generate."
              className={modalInputClassName}
            />
          </label>

          <label className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
              Description
            </div>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              className={modalInputClassName}
            />
          </label>

          <div className="rounded-2xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
              Sort Order
            </div>
            <div className="mt-2 text-sm text-[#666666]">
              Drag categories on the main page to control storefront order. New categories are placed at the end by default.
            </div>
          </div>

          <div className="block">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#7a7a7a]">
              Image
            </div>
            <label className="mt-2 flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-[#ddd5c4] bg-[#fcfaf4] px-4 py-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[#1a1a1a]">
                  {form.image?.name || (editingCategory?.image_url ? 'Replace current image' : 'Choose image')}
                </div>
                <div className="mt-1 text-xs text-[#666666]">
                  JPG, PNG, or WEBP up to {ADMIN_IMAGE_UPLOAD_MAX_LABEL}.
                </div>
              </div>
              <span className="rounded-full border border-[#ddd5c4] bg-white px-3 py-1 text-xs text-[#1a1a1a]">
                Browse
              </span>
              <input
                type="file"
                accept={ADMIN_IMAGE_ACCEPT}
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {modalImagePreviewUrl ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#ece4d5] bg-[#fcfaf4]">
                <img
                  src={modalImagePreviewUrl}
                  alt="Category preview"
                  className="h-44 w-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-3 flex h-32 items-center justify-center rounded-2xl border border-dashed border-[#ddd5c4] bg-[#fcfaf4] text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a7e58]">
                No image selected
              </div>
            )}
          </div>

          <label className="flex items-center justify-between rounded-xl border border-[#ece4d5] bg-[#fcfaf4] px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[#1a1a1a]">Active</div>
              <div className="mt-1 text-xs text-[#666666]">
                Show this category publicly.
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              className="h-5 w-5 accent-ember"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={resetFormState}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save category'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteCategory)}
        title="Delete category"
        message={`Delete ${deleteCategory?.name || 'this category'}? Products should be reassigned before removal.`}
        confirmLabel="Delete category"
        isSubmitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteCategory(null)
          }
        }}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        confirmLabel="Save category order"
        isSubmitting={updateMutation.isPending}
        message="Apply the dragged order to the storefront category list?"
        onClose={() => {
          if (!updateMutation.isPending) {
            setReorderConfirmOpen(false)
          }
        }}
        onConfirm={handleSaveReorder}
        open={reorderConfirmOpen}
        title="Confirm category reorder"
      />
    </div>
  )
}
