import { useSyncExternalStore } from 'react'

function getMediaQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null
  }

  return window.matchMedia('(max-width: 639px)')
}

function subscribe(callback) {
  const mediaQuery = getMediaQuery()

  if (!mediaQuery) {
    return () => {}
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', callback)

    return () => {
      mediaQuery.removeEventListener('change', callback)
    }
  }

  mediaQuery.addListener(callback)

  return () => {
    mediaQuery.removeListener(callback)
  }
}

function getSnapshot() {
  return getMediaQuery()?.matches ?? false
}

/**
 * Returns true only for phone-sized viewports.
 *
 * @returns {boolean}
 */
export default function usePhoneViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
