import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, LoaderCircle, Search } from 'lucide-react'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useProducts } from '../../hooks/store/useProducts'
import Spinner from '../ui/Spinner'
import {
  formatCurrency,
  getDisplayPrice,
  getPrimaryImageUrl,
} from '../../utils/storefront'

function getSearchValueFromLocation(location) {
  if (location.pathname !== '/shop') {
    return ''
  }

  return new URLSearchParams(location.search).get('search') || ''
}

/**
 * Shared storefront search form with a debounced product preview dropdown.
 *
 * @param {{
 *  appearance?: 'dark' | 'light',
 *  className?: string,
 *  onNavigate?: () => void,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function StoreSearchBar({
  appearance = 'dark',
  className,
  onNavigate,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const firstResultRef = useRef(null)
  const [search, setSearch] = useState(() => getSearchValueFromLocation(location))
  const [isOpen, setIsOpen] = useState(false)

  const trimmedSearch = search.trim()
  const debouncedSearch = useDebouncedValue(trimmedSearch, 300)
  const searchEnabled = debouncedSearch.length >= 2
  const previewQuery = useProducts(
    {
      page: 1,
      perPage: 5,
      search: debouncedSearch,
      sort: 'popular',
    },
    {
      enabled: searchEnabled,
      staleTime: 15000,
    },
  )

  const previewItems = searchEnabled ? previewQuery.data?.items ?? [] : []

  const formClassName =
    appearance === 'light'
      ? 'flex w-full min-w-0 items-center gap-2 rounded-full border border-[#ded7c5] bg-white/96 p-1 shadow-[0_12px_28px_rgba(0,0,0,0.06)]'
      : 'flex w-full min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/6 p-1 shadow-[0_14px_32px_rgba(0,0,0,0.16)]'
  const showDropdown =
    isOpen && (trimmedSearch.length > 0 || (searchEnabled && previewQuery.isFetching))

  const submitSearch = () => {
    const nextSearch = trimmedSearch

    navigate(nextSearch ? `/shop?search=${encodeURIComponent(nextSearch)}` : '/shop')
    setIsOpen(false)
    onNavigate?.()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    submitSearch()
  }

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      event.currentTarget.blur()
      return
    }

    if (event.key === 'ArrowDown' && firstResultRef.current) {
      event.preventDefault()
      firstResultRef.current.focus()
    }
  }

  return (
    <div
      className={['relative w-full', className].filter(Boolean).join(' ')}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false)
        }
      }}
      onFocusCapture={() => {
        setIsOpen(true)
      }}
    >
      <form className={formClassName} onSubmit={handleSubmit}>
        <input
          aria-autocomplete="list"
          aria-controls="store-search-preview"
          aria-expanded={showDropdown}
          aria-label="Search products from the storefront header"
          className="min-w-0 flex-1 rounded-full border-0 bg-white px-5 py-3 text-sm text-[#1a1a1a] outline-none placeholder:text-[#7a7a7a]"
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search beans, gear, or bundles"
          value={search}
        />
        <button
          className="first-light-accent-button shrink-0 rounded-full px-4 py-3 text-sm font-bold sm:px-5"
          type="submit"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      {showDropdown ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-[28px] border border-[rgba(201,168,76,0.22)] bg-white shadow-[0_22px_48px_rgba(0,0,0,0.22)] animate-[fadeUp_180ms_ease-out]"
          id="store-search-preview"
          role="listbox"
        >
          <div className="border-b border-[#efe8d6] px-5 py-4">
            <div className="inline-flex rounded-full bg-[#f5f0df] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b7230]">
              Live Search
            </div>
            <div className="mt-3 text-sm text-[#555555]">
              Preview products before jumping into the full catalog.
            </div>
          </div>

          {trimmedSearch.length < 2 ? (
            <div className="px-5 py-6 text-sm text-[#555555]">
              Type at least two characters to preview matching pours, gear, and bundles.
            </div>
          ) : previewQuery.isFetching && previewItems.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Spinner className="h-12 w-12" />
            </div>
          ) : previewItems.length > 0 ? (
            <>
              <div className="max-h-[360px] overflow-y-auto p-3">
                {previewItems.map((product, index) => {
                  const imageUrl = getPrimaryImageUrl(product)

                  return (
                    <Link
                      aria-label={`Open ${product.name}`}
                      className="group flex items-center gap-4 rounded-[22px] border border-transparent px-3 py-3 transition hover:border-[rgba(201,168,76,0.22)] hover:bg-[#fcfbf7] focus-visible:outline-none focus-visible:shadow-[var(--brewhaus-focus)]"
                      key={product.id || product.slug}
                      onClick={() => {
                        setIsOpen(false)
                        onNavigate?.()
                      }}
                      ref={index === 0 ? firstResultRef : undefined}
                      to={`/products/${product.slug}`}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#f5f5f5]">
                        {imageUrl ? (
                          <img
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            src={imageUrl}
                          />
                        ) : (
                          <div className="px-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8a8a]">
                            BrewHaus
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b7230]">
                          {product.category?.name || 'Coffee'}
                        </div>
                        <div className="mt-1 truncate text-sm font-extrabold text-[#1a1a1a] transition group-hover:text-[#000000]">
                          {product.name}
                        </div>
                        <div className="mt-1 text-xs text-[#666666]">
                          {product.short_description || 'Open the product page for the full roast breakdown.'}
                        </div>
                      </div>

                      <div className="shrink-0 text-sm font-extrabold text-[#1a1a1a]">
                        {formatCurrency(getDisplayPrice(product))}
                      </div>
                    </Link>
                  )
                })}
              </div>

              <div className="border-t border-[#efe8d6] bg-[#fcfbf7] p-3">
                <button
                  className="first-light-accent-button flex w-full rounded-full px-5 py-3 text-sm font-bold"
                  onClick={submitSearch}
                  type="button"
                >
                  View All Results
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#efe8d6] bg-[#fcfbf7] text-[#8b7230]">
                <Search className="h-5 w-5" />
              </div>
              <div className="mt-4 text-base font-extrabold text-[#1a1a1a]">
                No matching products yet
              </div>
              <div className="mt-2 text-sm leading-7 text-[#666666]">
                Try a broader term or jump into the full shop results for &ldquo;{trimmedSearch}&rdquo;.
              </div>
              <button
                className="mt-5 first-light-accent-button rounded-full px-5 py-3 text-sm font-bold"
                onClick={submitSearch}
                type="button"
              >
                Search Full Catalog
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {searchEnabled && previewQuery.isFetching && previewItems.length > 0 ? (
            <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-[#1a1a1a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Refreshing
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
