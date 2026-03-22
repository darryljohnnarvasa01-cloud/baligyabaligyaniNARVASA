import Skeleton from './Skeleton'
import Spinner from './Spinner'

function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
}

function getCardShellClasses(tone) {
  return tone === 'brewhaus'
    ? 'overflow-hidden rounded-[28px] border border-[#3a3427] bg-[#212121] shadow-[0_16px_34px_rgba(0,0,0,0.2)]'
    : 'overflow-hidden rounded-[28px] border border-[#e0e0e0] bg-white shadow-[0_12px_28px_rgba(0,0,0,0.06)]'
}

export function CategoryPillSkeleton({ tone = 'default', className = '' }) {
  return <Skeleton className={joinClasses('h-11 w-32 rounded-full', className)} tone={tone} />
}

export function ProductCardSkeleton({
  tone = 'default',
  className = '',
  imageClassName = 'h-56',
}) {
  return (
    <div className={joinClasses(getCardShellClasses(tone), className)}>
      <Skeleton className={joinClasses('rounded-none', imageClassName)} tone={tone} />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24 rounded-full" tone={tone} />
        <Skeleton className="h-7 w-2/3 rounded-full" tone={tone} />
        <Skeleton className="h-4 w-full rounded-full" tone={tone} />
        <Skeleton className="h-11 w-full rounded-2xl" tone={tone} />
      </div>
    </div>
  )
}

export function CollectionTileSkeleton({
  tone = 'default',
  className = '',
  imageClassName = 'h-48',
}) {
  return (
    <div className={joinClasses(getCardShellClasses(tone), className)}>
      <Skeleton className={joinClasses('rounded-none', imageClassName)} tone={tone} />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24 rounded-full" tone={tone} />
        <Skeleton className="h-8 w-2/3 rounded-full" tone={tone} />
        <Skeleton className="h-4 w-full rounded-full" tone={tone} />
        <Skeleton className="h-4 w-5/6 rounded-full" tone={tone} />
      </div>
    </div>
  )
}

export function ProductPageSkeleton() {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Spinner className="h-12 w-12" />
    </div>
  )
}

export function CheckoutPageSkeleton() {
  return (
    <div className="flex min-h-[560px] items-center justify-center">
      <Spinner className="h-12 w-12" />
    </div>
  )
}

export function OrderOutcomeSkeleton() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <Spinner className="h-12 w-12" />
    </div>
  )
}

export function OrderHistorySkeleton() {
  return (
    <div className="flex min-h-[260px] items-center justify-center">
      <Spinner className="h-12 w-12" />
    </div>
  )
}
