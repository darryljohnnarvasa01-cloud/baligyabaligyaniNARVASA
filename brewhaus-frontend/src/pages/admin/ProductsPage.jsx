import { Plus, Search } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import StockStatusBadge from '../../components/admin/StockStatusBadge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import { useAdminCategories } from '../../hooks/admin/useAdminCategories'
import {
  useAdminProducts,
  useDeleteProductMutation,
  useUpdateProductMutation,
} from '../../hooks/admin/useAdminProducts'
import { buildProductUpdatePayload } from '../../utils/adminPayloads'
import { normalizePublicAssetUrl } from '../../utils/storefront'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(value || 0))
}

// [CODEX] React e-commerce component: ProductsPage
// Uses: useAdminProducts, useDeleteProductMutation, useAdminCategories, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: lists products with admin filters and routes into the full product form for create and edit flows.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function ProductsPage() {
  const navigate = useNavigate()
  const categoriesQuery = useAdminCategories()
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    status: '',
    page: 1,
    perPage: 12,
  })
  const [deleteProduct, setDeleteProduct] = useState(null)
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [bulkAction, setBulkAction] = useState(null)
  const [bulkForm, setBulkForm] = useState({
    price: '',
    lowStockThreshold: '',
  })

  const deferredSearch = useDeferredValue(filters.search)
  const productsQuery = useAdminProducts({
    ...filters,
    search: deferredSearch,
  })
  const deleteMutation = useDeleteProductMutation()
  const updateMutation = useUpdateProductMutation()

  const products = useMemo(() => productsQuery.data?.items || [], [productsQuery.data])
  const meta = productsQuery.data?.meta
  const categoryOptions = [{ id: '', name: 'All categories' }, ...(categoriesQuery.data || [])]
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  )
  const allProductsSelected =
    products.length > 0 && products.every((product) => selectedProductIds.includes(product.id))
  const productSummary = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.is_active).length,
      hidden: products.filter((product) => !product.is_active).length,
      lowStock: products.filter((product) => product.stock_status !== 'in_stock').length,
    }),
    [products],
  )

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1,
    }))
  }

  const handleDelete = async () => {
    if (!deleteProduct) {
      return
    }

    try {
      await deleteMutation.mutateAsync(deleteProduct.id)
      toast.success('Product deleted.')
      setDeleteProduct(null)
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to delete product.',
      )
    }
  }

  const toggleSelectedProduct = (productId) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((value) => value !== productId)
        : [...current, productId],
    )
  }

  const toggleSelectAllProducts = () => {
    setSelectedProductIds((current) =>
      allProductsSelected ? current.filter((id) => !products.some((product) => product.id === id)) : products.map((product) => product.id),
    )
  }

  const closeBulkDialog = () => {
    if (updateMutation.isPending) {
      return
    }

    setBulkAction(null)
    setBulkForm({
      price: '',
      lowStockThreshold: '',
    })
  }

  const handleBulkUpdate = async () => {
    if (!selectedProducts.length) {
      return
    }

    if (bulkAction === 'price' && Number(bulkForm.price || 0) <= 0) {
      toast.error('Enter a valid price before confirming.')
      return
    }

    if (bulkAction === 'stock' && bulkForm.lowStockThreshold === '') {
      toast.error('Enter a stock flag threshold before confirming.')
      return
    }

    const overrides =
      bulkAction === 'activate'
        ? { is_active: true }
        : bulkAction === 'deactivate'
          ? { is_active: false }
          : bulkAction === 'price'
            ? { price: Number(bulkForm.price || 0) }
            : bulkAction === 'stock'
              ? { low_stock_threshold: Number(bulkForm.lowStockThreshold || 0) }
              : null

    if (!overrides) {
      return
    }

    const results = await Promise.allSettled(
      selectedProducts.map((product) =>
        updateMutation.mutateAsync({
          id: product.id,
          payload: buildProductUpdatePayload(product, overrides),
        }),
      ),
    )

    const successCount = results.filter((result) => result.status === 'fulfilled').length

    if (successCount > 0) {
      toast.success(`Updated ${successCount} product${successCount === 1 ? '' : 's'}.`)
      setSelectedProductIds([])
      closeBulkDialog()
      return
    }

    const rejected = results.find((result) => result.status === 'rejected')
    toast.error(
      rejected?.reason?.response?.data?.message ||
        rejected?.reason?.message ||
        'Failed to update the selected products.',
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7e58]">
            Products
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-[#1a1a1a]">
            Catalog Control
          </h1>
        </div>
        <Button onClick={() => navigate('/admin/products/new')}>
          <Plus className="h-4 w-4" />
          New product
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Catalog
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {productSummary.total}
          </div>
          <div className="mt-2 text-sm text-[#666666]">Products on this page</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Active
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {productSummary.active}
          </div>
          <div className="mt-2 text-sm text-[#666666]">Visible in the storefront</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Hidden
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {productSummary.hidden}
          </div>
          <div className="mt-2 text-sm text-[#666666]">Ready for bulk reactivation</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Stock watch
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {productSummary.lowStock}
          </div>
          <div className="mt-2 text-sm text-[#666666]">Low or out of stock</div>
        </div>
      </section>

      <section className="first-light-shell-card rounded-[28px] p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a826f]" />
            <input
              aria-label="Search products by name, SKU, or slug"
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search name, SKU, or slug"
              className="first-light-field pl-12"
            />
          </label>

          <select
            aria-label="Filter products by category"
            value={filters.categoryId}
            onChange={(event) => updateFilter('categoryId', event.target.value)}
            className="first-light-field"
          >
            {categoryOptions.map((category) => (
              <option key={category.id || 'all'} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter products by visibility"
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            className="first-light-field"
          >
            <option value="">All visibility</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece4d5] pt-5">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-[#1a1a1a]">
            <input
              checked={allProductsSelected}
              className="h-4 w-4 rounded border-[#cfbf95] accent-[#c18d10]"
              onChange={toggleSelectAllProducts}
              type="checkbox"
            />
            Select page
          </label>

          {selectedProductIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-[#ecd18c] bg-[#fff7de] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6400]">
                {selectedProductIds.length} selected
              </div>
              <Button onClick={() => setBulkAction('activate')} variant="secondary">
                Activate
              </Button>
              <Button onClick={() => setBulkAction('deactivate')} variant="secondary">
                Hide
              </Button>
              <Button onClick={() => setBulkAction('price')} variant="secondary">
                Update price
              </Button>
              <Button onClick={() => setBulkAction('stock')}>
                Set stock flag
              </Button>
            </div>
          ) : (
            <div className="text-sm text-[#777777]">
              Search, category, and visibility filters work together without leaving the page.
              {filters.search !== deferredSearch || productsQuery.isFetching ? ' Refreshing…' : ''}
            </div>
          )}
        </div>
      </section>

      {productsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-12 w-12" />
        </div>
      ) : productsQuery.isError ? (
        <ErrorState
          title="Unable to load products."
          description="The admin product list request failed."
          onAction={() => productsQuery.refetch()}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found."
          description="Create a product or broaden the filters."
          actionLabel="Add product"
          onAction={() => navigate('/admin/products/new')}
          titleClassName="italic"
        />
      ) : (
        <section className="first-light-table-shell rounded-[28px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="first-light-table-head">
                <tr>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Select
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Product
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Category
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Price
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Stock
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Flags
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="first-light-table-row">
                    <td className="px-5 py-5 align-top">
                      <input
                        checked={selectedProductIds.includes(product.id)}
                        className="h-4 w-4 rounded border-[#cfbf95] accent-[#c18d10]"
                        onChange={() => toggleSelectedProduct(product.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[#f4f4f4]">
                          {product.primary_image?.image_url ? (
                            <img
                              src={normalizePublicAssetUrl(product.primary_image.image_url)}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#1a1a1a]">
                            {product.name}
                          </div>
                          <div className="mt-1 text-xs font-mono text-[#8d6b12]">
                            {product.sku}
                          </div>
                          <div className="mt-1 text-xs text-[#7a7a7a]">{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top text-[#1a1a1a]">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="font-mono text-[#8d6b12]">
                        {formatCurrency(product.current_price)}
                      </div>
                      <div className="mt-1 text-xs text-[#7a7a7a]">
                        Base {formatCurrency(product.price)}
                      </div>
                      {product.is_on_sale ? (
                        <div className="mt-1 text-xs text-[#7a7a7a]">
                          Sale live
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="font-mono text-[#1a1a1a]">
                        {product.stock_quantity}
                      </div>
                      <div className="mt-1 text-xs text-[#7a7a7a]">
                        Threshold {product.low_stock_threshold}
                      </div>
                      <div className="mt-2">
                        <StockStatusBadge status={product.stock_status} />
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={[
                            'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em]',
                            product.is_featured
                              ? 'border-ember/40 bg-ember/10 text-ember'
                              : 'border-[#e0e0e0] bg-[#f7f5ef] text-[#7a7a7a]',
                          ].join(' ')}
                        >
                          {product.is_featured ? 'Featured' : 'Standard'}
                        </span>
                        <span
                          className={[
                            'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em]',
                            product.is_active
                              ? 'border-live/40 bg-live/10 text-live'
                              : 'border-[#e0e0e0] bg-[#f7f5ef] text-[#7a7a7a]',
                          ].join(' ')}
                        >
                          {product.is_active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          className="first-light-outline-button rounded-xl px-3 py-2 text-sm"
                        >
                          Edit
                        </Link>
                        <Button
                          variant="danger"
                          className="px-3 py-2"
                          onClick={() => setDeleteProduct(product)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          disabled={Number(meta?.current_page || 1) <= 1}
          onClick={() => updateFilter('page', Number(meta?.current_page || 1) - 1)}
        >
          Previous
        </Button>
        <div className="text-sm text-[#7a7a7a]">
          Page {meta?.current_page || 1}
          {meta?.last_page ? ` of ${meta.last_page}` : ''}
        </div>
        <Button
          variant="secondary"
          disabled={Number(meta?.current_page || 1) >= Number(meta?.last_page || 1)}
          onClick={() => updateFilter('page', Number(meta?.current_page || 1) + 1)}
        >
          Next
        </Button>
      </div>

      <ConfirmDialog
        confirmLabel={
          bulkAction === 'activate'
            ? `Activate ${selectedProducts.length} products`
            : bulkAction === 'deactivate'
              ? `Hide ${selectedProducts.length} products`
              : bulkAction === 'price'
                ? `Update ${selectedProducts.length} prices`
                : `Update ${selectedProducts.length} stock flags`
        }
        isSubmitting={updateMutation.isPending}
        message={
          bulkAction === 'activate'
            ? 'This will make every selected product visible in the storefront.'
            : bulkAction === 'deactivate'
              ? 'This will hide every selected product from the storefront.'
              : bulkAction === 'price'
                ? 'Set one shared base price for every selected product.'
                : 'Set one shared low-stock threshold for every selected product.'
        }
        onClose={closeBulkDialog}
        onConfirm={handleBulkUpdate}
        open={Boolean(bulkAction)}
        title="Confirm bulk product update"
      >
        {bulkAction === 'price' ? (
          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              New base price
            </div>
            <input
              className="first-light-field mt-2"
              min="0"
              onChange={(event) =>
                setBulkForm((current) => ({
                  ...current,
                  price: event.target.value,
                }))
              }
              step="0.01"
              type="number"
              value={bulkForm.price}
            />
          </label>
        ) : null}

        {bulkAction === 'stock' ? (
          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a7a7a]">
              Low-stock threshold
            </div>
            <input
              className="first-light-field mt-2"
              min="0"
              onChange={(event) =>
                setBulkForm((current) => ({
                  ...current,
                  lowStockThreshold: event.target.value,
                }))
              }
              step="1"
              type="number"
              value={bulkForm.lowStockThreshold}
            />
          </label>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteProduct)}
        title="Delete product"
        message={`Delete ${deleteProduct?.name || 'this product'}? This removes it from the catalog.`}
        confirmLabel="Delete product"
        isSubmitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteProduct(null)
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}

