import Button from './Button'

/**
 * Pagination
 * @param {{
 *  currentPage: number,
 *  lastPage?: number|null,
 *  onPrev: () => void,
 *  onNext: () => void,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function Pagination({
  currentPage,
  lastPage,
  onPrev,
  onNext,
}) {
  const disablePrev = currentPage <= 1
  const disableNext =
    typeof lastPage === 'number' ? currentPage >= lastPage : false

  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="secondary" onClick={onPrev} disabled={disablePrev}>
        Prev
      </Button>
      <div className="text-sm text-oat/70">
        Page {currentPage}
        {lastPage ? ` of ${lastPage}` : ''}
      </div>
      <Button variant="secondary" onClick={onNext} disabled={disableNext}>
        Next
      </Button>
    </div>
  )
}
