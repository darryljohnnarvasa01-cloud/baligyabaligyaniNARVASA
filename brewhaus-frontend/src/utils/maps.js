function buildAddressQuery(address) {
  if (!address) {
    return ''
  }

  const fullAddress = typeof address.full_address === 'string' ? address.full_address.trim() : ''

  if (fullAddress) {
    return fullAddress.toLowerCase().includes('philippines')
      ? fullAddress
      : `${fullAddress}, Philippines`
  }

  const parts = [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.zip_code,
    'Philippines',
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)

  return parts.join(', ')
}

export function buildGoogleMapsSearchUrl(address) {
  const query = buildAddressQuery(address)

  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null
}

export function buildGoogleMapsDirectionsUrl(address) {
  const query = buildAddressQuery(address)

  return query
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`
    : null
}
