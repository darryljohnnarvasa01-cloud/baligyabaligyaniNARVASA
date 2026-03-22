import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

function ensureSuccess(payload, fallback) {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback)
  }

  return payload.data
}

function buildCategoryFormData(payload, isUpdate = false) {
  const formData = new FormData()

  if (isUpdate) {
    formData.append('_method', 'PUT')
  }

  formData.append('name', payload.name || '')
  formData.append('slug', payload.slug || '')
  formData.append('description', payload.description || '')
  formData.append('sort_order', String(payload.sort_order ?? 0))
  formData.append('is_active', payload.is_active ? 'true' : 'false')

  if (payload.image instanceof File) {
    formData.append('image', payload.image)
  }

  return formData
}

// [CODEX] TanStack React Query hook for e-commerce
// Endpoint: GET/POST/PUT/DELETE /api/v1/admin/categories*
// Auth: Bearer token from useAuthStore()
// Returns: { data, isLoading, isError, refetch }
// Mutation: { mutate, isPending, isSuccess }
export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await api.get('/admin/categories')
      return ensureSuccess(response?.data, 'Failed to load categories.')
    },
  })
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/admin/categories', buildCategoryFormData(payload))
      return ensureSuccess(response?.data, 'Failed to create category.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    },
  })
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const hasFile = payload.image instanceof File

      if (hasFile) {
        const response = await api.post(
          `/admin/categories/${id}`,
          buildCategoryFormData(payload, true),
        )

        return ensureSuccess(response?.data, 'Failed to update category.')
      }

      const response = await api.put(`/admin/categories/${id}`, payload)
      return ensureSuccess(response?.data, 'Failed to update category.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    },
  })
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/admin/categories/${id}`)
      return ensureSuccess(response?.data, 'Failed to delete category.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
    },
  })
}
