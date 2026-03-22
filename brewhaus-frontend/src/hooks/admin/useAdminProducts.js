import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

function ensureSuccess(payload, fallback) {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback)
  }

  return payload.data
}

function appendFormValue(formData, key, value) {
  if (value === null || value === undefined) {
    return
  }

  formData.append(key, value)
}

function buildProductFormData(payload, isUpdate = false) {
  const formData = new FormData()

  if (isUpdate) {
    formData.append('_method', 'PUT')
  }

  appendFormValue(formData, 'name', payload.name)
  appendFormValue(formData, 'slug', payload.slug)
  appendFormValue(formData, 'short_description', payload.short_description)
  appendFormValue(formData, 'description', payload.description)
  appendFormValue(formData, 'price', String(payload.price ?? ''))
  appendFormValue(formData, 'sale_price', payload.sale_price === '' ? '' : String(payload.sale_price ?? ''))
  appendFormValue(formData, 'sku', payload.sku)
  appendFormValue(formData, 'low_stock_threshold', String(payload.low_stock_threshold ?? 0))
  appendFormValue(formData, 'weight_grams', payload.weight_grams === '' ? '' : String(payload.weight_grams ?? ''))
  ;(payload.size_options || []).forEach((option, index) => {
    appendFormValue(formData, `size_options[${index}]`, option)
  })
  appendFormValue(formData, 'category_id', String(payload.category_id ?? ''))
  appendFormValue(formData, 'is_featured', payload.is_featured ? 'true' : 'false')
  appendFormValue(formData, 'is_active', payload.is_active ? 'true' : 'false')
  appendFormValue(formData, 'primary_image_index', String(payload.primary_image_index ?? 0))

  ;(payload.tags || []).forEach((tag, index) => {
    appendFormValue(formData, `tags[${index}]`, tag)
  })

  ;(payload.images || []).forEach((file, index) => {
    if (file instanceof File) {
      formData.append(`images[${index}]`, file)
    }
  })

  return formData
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET/POST/PUT/DELETE /api/v1/admin/products*
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export function useAdminProducts(params = {}) {
  const search = params.search || ''
  const categoryId = params.categoryId || ''
  const status = params.status || ''
  const page = Number(params.page || 1)
  const perPage = Number(params.perPage || 12)

  return useQuery({
    queryKey: ['admin-products', 'list', search, categoryId, status, page, perPage],
    queryFn: async () => {
      const response = await api.get('/admin/products', {
        params: {
          search: search || undefined,
          category_id: categoryId || undefined,
          status: status || undefined,
          page,
          per_page: perPage,
        },
      })

      return ensureSuccess(response?.data, 'Failed to load products.')
    },
    placeholderData: keepPreviousData,
  })
}

export function useAdminProduct(productId) {
  const keyId = productId ? String(productId) : ''

  return useQuery({
    enabled: Boolean(keyId),
    queryKey: ['admin-products', 'detail', keyId],
    queryFn: async () => {
      const response = await api.get(`/admin/products/${keyId}`)
      return ensureSuccess(response?.data, 'Failed to load product.')
    },
  })
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/admin/products', buildProductFormData(payload))
      return ensureSuccess(response?.data, 'Failed to create product.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const hasFiles = (payload.images || []).some((file) => file instanceof File)

      if (hasFiles) {
        const response = await api.post(`/admin/products/${id}`, buildProductFormData(payload, true))
        return ensureSuccess(response?.data, 'Failed to update product.')
      }

      const response = await api.put(`/admin/products/${id}`, payload)
      return ensureSuccess(response?.data, 'Failed to update product.')
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products', 'detail', String(variables.id)] })
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/admin/products/${id}`)
      return ensureSuccess(response?.data, 'Failed to delete product.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
    },
  })
}
