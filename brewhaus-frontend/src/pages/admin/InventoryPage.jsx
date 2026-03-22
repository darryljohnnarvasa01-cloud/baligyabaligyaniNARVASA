import { ChevronDown, ChevronUp, RotateCcw, Search } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import StockStatusBadge from '../../components/admin/StockStatusBadge'
import RestockModal from '../../components/admin/RestockModal'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import { useAdminInventory, useRestockInventoryMutation } from '../../hooks/admin/useInventory'
import { normalizePublicAssetUrl } from '../../utils/storefront'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(value || 0))
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// [CODEX] React e-commerce component: InventoryPage
// Uses: useAdminInventory, useRestockInventoryMutation, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: manages product-centric stock, opens restock actions, and shows recent inventory log timelines per product.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function InventoryPage() {
  const inventoryQuery = useAdminInventory()
  const restockMutation = useRestockInventoryMutation()

  const [search, setSearch] = useState('')
  const [restockProduct, setRestockProduct] = useState(null)
  const [expandedProductId, setExpandedProductId] = useState(null)
  const [quickRestock, setQuickRestock] = useState(null)

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const source = inventoryQuery.data || []

    const filtered = !needle
      ? source
      : source.filter((item) =>
      [item.name, item.sku].some((value) =>
        String(value || '').toLowerCase().includes(needle),
      ),
    )

    const severity = {
      out_of_stock: 0,
      low_stock: 1,
      in_stock: 2,
    }

    return [...filtered].sort((left, right) => {
      const severityDiff =
        (severity[left.stock_status] ?? 3) - (severity[right.stock_status] ?? 3)

      if (severityDiff !== 0) {
        return severityDiff
      }

      if (left.stock_quantity !== right.stock_quantity) {
        return Number(left.stock_quantity || 0) - Number(right.stock_quantity || 0)
      }

      return String(left.name || '').localeCompare(String(right.name || ''))
    })
  }, [inventoryQuery.data, search])

  const inventorySummary = useMemo(() => {
    const source = inventoryQuery.data || []

    return {
      healthy: source.filter((item) => item.stock_status === 'in_stock').length,
      low: source.filter((item) => item.stock_status === 'low_stock').length,
      critical: source.filter((item) => item.stock_status === 'out_of_stock').length,
    }
  }, [inventoryQuery.data])

  const handleRestock = async ({ quantityToAdd, note }) => {
    if (!restockProduct) {
      return
    }

    try {
      await restockMutation.mutateAsync({
        id: restockProduct.id,
        quantityToAdd,
        note,
      })
      toast.success('Inventory restocked.')
      setRestockProduct(null)
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to restock inventory.',
      )
    }
  }

  const handleQuickRestock = async () => {
    if (!quickRestock?.item || !quickRestock?.quantity) {
      return
    }

    try {
      await restockMutation.mutateAsync({
        id: quickRestock.item.id,
        quantityToAdd: quickRestock.quantity,
        note: quickRestock.note || `Quick restock +${quickRestock.quantity}`,
      })
      toast.success('Inventory restocked.')
      setQuickRestock(null)
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to restock inventory.',
      )
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a7e58]">
            Inventory
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-[#1a1a1a]">
            Stock health board
          </h1>
        </div>
        <div className="rounded-full border border-[#ecd18c] bg-[#fff7de] px-4 py-2 text-sm font-bold text-[#8a6400]">
          {inventorySummary.low + inventorySummary.critical} items need attention
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Healthy
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {inventorySummary.healthy}
          </div>
          <div className="mt-2 text-sm text-[#666666]">Within threshold</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Low
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {inventorySummary.low}
          </div>
          <div className="mt-2 text-sm text-[#666666]">Near reorder point</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Critical
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">
            {inventorySummary.critical}
          </div>
          <div className="mt-2 text-sm text-[#666666]">Out of stock</div>
        </div>
        <div className="first-light-shell-card rounded-[28px] p-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">
            Tracked
          </div>
          <div className="mt-3 text-3xl font-extrabold text-[#1a1a1a]">{items.length}</div>
          <div className="mt-2 text-sm text-[#666666]">Filtered products</div>
        </div>
      </section>

      <section className="first-light-shell-card rounded-[28px] p-6">
        <label className="relative block max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a826f]" />
          <input
            aria-label="Search inventory by product name or SKU"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product name or SKU"
            className="first-light-field pl-12"
          />
        </label>
      </section>

      {inventoryQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-12 w-12" />
        </div>
      ) : inventoryQuery.isError ? (
        <ErrorState
          title="Unable to load inventory."
          description="The stock table request failed."
          onAction={() => inventoryQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No products found."
          description="Try a different search term."
          titleClassName="italic"
        />
      ) : (
        <section className="first-light-table-shell overflow-hidden rounded-[28px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="first-light-table-head">
                <tr>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Product
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    SKU
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Current Stock
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Threshold
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Status
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Price
                  </th>
                  <th className="px-5 py-4 font-medium uppercase tracking-[0.14em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <Fragment key={item.id}>
                    <tr className="first-light-table-row">
                      <td className="px-5 py-5 align-top">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[#f4f4f4]">
                            {item.primary_image?.image_url ? (
                              <img
                                src={normalizePublicAssetUrl(item.primary_image.image_url)}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#1a1a1a]">{item.name}</div>
                            <div className="mt-1 text-xs text-[#7a7a7a]">
                              {item.is_active ? 'Active' : 'Hidden'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-5 align-top font-mono text-[#7a7a7a]">
                        {item.sku}
                      </td>
                      <td className="px-5 py-5 align-top font-mono text-[#1a1a1a]">
                        {item.stock_quantity}
                      </td>
                      <td className="px-5 py-5 align-top text-[#1a1a1a]">
                        {item.low_stock_threshold}
                      </td>
                      <td className="px-5 py-5 align-top">
                        <StockStatusBadge status={item.stock_status} />
                      </td>
                      <td className="px-5 py-5 align-top font-mono text-[#8d6b12]">
                        {formatCurrency(item.current_price)}
                      </td>
                      <td className="px-5 py-5 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="px-3 py-2 text-[11px]"
                            onClick={() => setQuickRestock({ item, quantity: 5 })}
                            variant="secondary"
                          >
                            +5
                          </Button>
                          <Button
                            className="px-3 py-2 text-[11px]"
                            onClick={() => setQuickRestock({ item, quantity: 10 })}
                            variant="secondary"
                          >
                            +10
                          </Button>
                          <Button className="px-3 py-2" onClick={() => setRestockProduct(item)}>
                            <RotateCcw className="h-4 w-4" />
                            Restock
                          </Button>
                          <Button
                            className="px-3 py-2"
                            onClick={() =>
                              setExpandedProductId((current) => (current === item.id ? null : item.id))
                            }
                            variant="secondary"
                          >
                            {expandedProductId === item.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            Logs
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {expandedProductId === item.id ? (
                      <tr className="border-t border-[#ece5d7] bg-[#fffdfa]">
                        <td className="px-5 py-5" colSpan={7}>
                          {(item.inventory_logs || []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#ddd5c4] px-4 py-4 text-sm text-[#7a7a7a]">
                              No inventory logs yet.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {item.inventory_logs.map((log) => (
                                <div
                                  key={log.id}
                                  className="rounded-[20px] border border-[#ece4d5] bg-white px-4 py-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full border border-[#ddd5c4] bg-[#f6f3ec] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5f5642]">
                                        {log.type}
                                      </span>
                                      <span className="font-mono text-sm font-bold text-[#1a1a1a]">
                                        {log.quantity_change > 0 ? '+' : ''}
                                        {log.quantity_change}
                                      </span>
                                      <span className="text-xs text-[#777777]">
                                        after {log.quantity_after}
                                      </span>
                                    </div>
                                    <div className="text-xs text-[#777777]">
                                      {formatDateTime(log.created_at)}
                                    </div>
                                  </div>
                                  <div className="mt-3 text-sm text-[#1a1a1a]">
                                    {log.note || 'No note recorded.'}
                                  </div>
                                  <div className="mt-2 text-xs text-[#777777]">
                                    by {log.created_by?.name || 'System'}
                                    {log.reference_id ? ` • ref ${log.reference_id}` : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <RestockModal
        key={restockProduct?.id || 'restock'}
        open={Boolean(restockProduct)}
        item={restockProduct}
        isSubmitting={restockMutation.isPending}
        onClose={() => {
          if (!restockMutation.isPending) {
            setRestockProduct(null)
          }
        }}
        onSubmit={handleRestock}
      />

      <ConfirmDialog
        confirmLabel={
          quickRestock ? `Restock +${quickRestock.quantity}` : 'Confirm quick restock'
        }
        isSubmitting={restockMutation.isPending}
        message={
          quickRestock
            ? `Add ${quickRestock.quantity} units to ${quickRestock.item.name} without opening the full restock form.`
            : ''
        }
        onClose={() => {
          if (!restockMutation.isPending) {
            setQuickRestock(null)
          }
        }}
        onConfirm={handleQuickRestock}
        open={Boolean(quickRestock)}
        title="Confirm quick restock"
      />
    </div>
  )
}
