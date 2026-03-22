export function normalizeApiErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return []
  }

  return Object.values(errors)
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value
      }

      return value ? [value] : []
    })
    .map((message) => String(message).trim())
    .filter(Boolean)
}

export function getApiErrorMessage(error, fallback) {
  const fieldErrors = normalizeApiErrors(error?.response?.data?.errors)

  if (fieldErrors.length > 0) {
    return fieldErrors[0]
  }

  return error?.response?.data?.message || error?.message || fallback
}
