import { useEffect, useState } from 'react'

/**
 * Delays a changing value so UI-triggered queries do not fire on every keystroke.
 *
 * @template T
 * @param {T} value
 * @param {number} delay
 * @returns {T}
 */
export default function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delay, value])

  return debouncedValue
}
