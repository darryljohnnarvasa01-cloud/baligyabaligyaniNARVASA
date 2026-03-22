import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

function ensureSuccess(payload, fallback) {
  if (!payload?.success) {
    throw new Error(payload?.message || fallback)
  }

  return payload.data
}

function syncRiderOrderDetail(queryClient, orderId, data) {
  if (!orderId || !data) {
    return
  }

  queryClient.setQueryData(['rider-orders', 'detail', String(orderId)], data)
}

function invalidateRiderQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['rider-orders', 'list'] })
  queryClient.invalidateQueries({ queryKey: ['rider-orders', 'queue'] })
  queryClient.invalidateQueries({ queryKey: ['rider-orders', 'history'] })
  queryClient.invalidateQueries({ queryKey: ['rider-summary'] })
}

/**
 * // [CODEX] TanStack React Query hook for e-commerce
 * // Endpoint: GET/PATCH /api/v1/rider/orders
 * // Auth: Bearer token from useAuthStore()
 * // Returns: { data, isLoading, isError, refetch }
 * // Mutation: { mutate, isPending, isSuccess }
 */
export function useRiderOrders() {
  return useQuery({
    queryKey: ['rider-orders', 'list'],
    queryFn: async () => {
      const response = await api.get('/rider/orders')
      return ensureSuccess(response?.data, 'Failed to load orders.')
    },
    refetchInterval: 15_000,
  })
}

export function useRiderQueue() {
  return useQuery({
    queryKey: ['rider-orders', 'queue'],
    queryFn: async () => {
      const response = await api.get('/rider/orders/queue')
      return ensureSuccess(response?.data, 'Failed to load delivery queue.')
    },
    refetchInterval: 15_000,
  })
}

export function useRiderHistory() {
  return useQuery({
    queryKey: ['rider-orders', 'history'],
    queryFn: async () => {
      const response = await api.get('/rider/orders/history')
      return ensureSuccess(response?.data, 'Failed to load delivery history.')
    },
    refetchInterval: 15_000,
  })
}

export function useRiderSummary() {
  return useQuery({
    queryKey: ['rider-summary'],
    queryFn: async () => {
      const response = await api.get('/rider/summary')
      return ensureSuccess(response?.data, 'Failed to load rider summary.')
    },
    refetchInterval: 15_000,
  })
}

/**
 * @param {string|number|null} orderId
 */
export function useRiderOrder(orderId) {
  const keyId = orderId ? String(orderId) : ''

  return useQuery({
    enabled: Boolean(keyId),
    queryKey: ['rider-orders', 'detail', keyId],
    queryFn: async () => {
      const response = await api.get(`/rider/orders/${keyId}`)
      return ensureSuccess(response?.data, 'Failed to load order.')
    },
    refetchInterval: 15_000,
  })
}

export function useAcceptOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, note }) => {
      const response = await api.patch(`/rider/orders/${orderId}/accept`, {
        note: note || undefined,
      })

      return ensureSuccess(response?.data, 'Failed to accept order.')
    },
    onSuccess: (data, variables) => {
      syncRiderOrderDetail(queryClient, variables.orderId, data)
      invalidateRiderQueries(queryClient)
    },
  })
}

export function usePickupOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId) => {
      const response = await api.patch(`/rider/orders/${orderId}/pickup`)
      return ensureSuccess(response?.data, 'Failed to pick up order.')
    },
    onSuccess: (data, orderId) => {
      syncRiderOrderDetail(queryClient, orderId, data)
      invalidateRiderQueries(queryClient)
    },
  })
}

export function useUploadRiderProofMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, proofImage }) => {
      const formData = new FormData()
      formData.append('proof_image', proofImage)

      const response = await api.post(`/rider/orders/${orderId}/proof`, formData)
      return ensureSuccess(response?.data, 'Failed to upload proof of delivery.')
    },
    onSuccess: (data, variables) => {
      syncRiderOrderDetail(queryClient, variables.orderId, data)
      invalidateRiderQueries(queryClient)
    },
  })
}

export function useDeliverOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, deliveryNote, proofImage }) => {
      let response

      if (proofImage instanceof File) {
        const formData = new FormData()
        formData.append('_method', 'PATCH')
        if (deliveryNote) {
          formData.append('delivery_note', deliveryNote)
        }
        formData.append('proof_image', proofImage)
        response = await api.post(`/rider/orders/${orderId}/deliver`, formData)
      } else {
        response = await api.patch(`/rider/orders/${orderId}/deliver`, {
          delivery_note: deliveryNote || undefined,
        })
      }

      return ensureSuccess(response?.data, 'Failed to deliver order.')
    },
    onSuccess: (data, variables) => {
      syncRiderOrderDetail(queryClient, variables.orderId, data)
      invalidateRiderQueries(queryClient)
    },
  })
}

export function useReportRiderIssueMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, issueType, details }) => {
      const response = await api.post(`/rider/orders/${orderId}/issue`, {
        issue_type: issueType,
        details: details || undefined,
      })

      return ensureSuccess(response?.data, 'Failed to report delivery issue.')
    },
    onSuccess: (data, variables) => {
      syncRiderOrderDetail(queryClient, variables.orderId, data)
      invalidateRiderQueries(queryClient)
    },
  })
}

export function useUpdateRiderLocationMutation() {
  return useMutation({
    mutationFn: async ({ lat, lng }) => {
      const response = await api.put('/rider/location', {
        lat,
        lng,
      })

      return ensureSuccess(response?.data, 'Failed to update rider location.')
    },
  })
}
