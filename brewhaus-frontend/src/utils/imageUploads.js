export const ADMIN_IMAGE_UPLOAD_MAX_BYTES = 12 * 1024 * 1024
export const ADMIN_IMAGE_UPLOAD_MAX_LABEL = '12 MB'
export const ADMIN_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const SUPPORTED_IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp)$/i

function isSupportedImageType(file) {
  if (!file) {
    return false
  }

  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return true
  }

  return SUPPORTED_IMAGE_EXTENSION_PATTERN.test(String(file.name || ''))
}

export function getAdminImageValidationMessage(files, label = 'Image') {
  for (const file of Array.from(files || []).filter(Boolean)) {
    const fileLabel = file.name || label

    if (!isSupportedImageType(file)) {
      return `${fileLabel} must be a JPG, PNG, or WEBP image.`
    }

    if (Number(file.size || 0) > ADMIN_IMAGE_UPLOAD_MAX_BYTES) {
      return `${fileLabel} must be ${ADMIN_IMAGE_UPLOAD_MAX_LABEL} or smaller.`
    }
  }

  return ''
}
