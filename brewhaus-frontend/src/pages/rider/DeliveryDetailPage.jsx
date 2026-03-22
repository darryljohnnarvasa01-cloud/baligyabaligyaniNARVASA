import {
  ArrowLeft,
  Camera,
  Check,
  LoaderCircle,
  LogOut,
  MapPinned,
  MessageSquare,
  Phone,
  TriangleAlert,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Spinner from '../../components/ui/Spinner'
import useAuth from '../../hooks/useAuth'
import {
  useDeliverOrderMutation,
  useReportRiderIssueMutation,
  useRiderOrder,
} from '../../hooks/rider/useRiderOrders'
import api from '../../services/api'
import { buildGoogleMapsDirectionsUrl } from '../../utils/maps'
import { normalizePublicAssetUrl } from '../../utils/storefront'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function formatLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function buildDeliveryAddress(address) {
  if (!address) {
    return 'No delivery address provided.'
  }

  return (
    address.full_address ||
    [address.street, address.barangay, address.city, address.province, address.zip_code]
      .filter(Boolean)
      .join(', ')
  )
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function getScrollBehavior() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'smooth'
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

function getOrderBadgeClass(value) {
  if (value === 'out_for_delivery') {
    return 'border-[rgba(201,168,76,0.28)] bg-[rgba(201,168,76,0.15)] text-[#E2C06A]'
  }

  if (value === 'delivered') {
    return 'border-[rgba(76,175,130,0.25)] bg-[rgba(76,175,130,0.12)] text-[#4caf82]'
  }

  return 'border-white/[0.08] bg-[#1a1a1a] text-[#888580]'
}

function getPaymentBadgeClass(value) {
  if (value === 'paid') {
    return 'border-[rgba(201,168,76,0.22)] bg-[rgba(201,168,76,0.08)] text-[#E2C06A]'
  }

  return 'border-white/[0.08] bg-[#1a1a1a] text-[#888580]'
}

function SectionLabel({ children }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="font-syne text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[#C9A84C]">
        {children}
      </span>
      <span className="h-px flex-1 bg-[rgba(201,168,76,0.2)]" />
    </div>
  )
}

function ActionLink({ href, icon, label, tone, external = false }) {
  const toneClasses = {
    call: {
      shell: 'border-[rgba(76,175,130,0.18)] bg-[#1a1a1a]',
      icon: 'bg-[rgba(76,175,130,0.15)] text-[#4caf82]',
    },
    message: {
      shell: 'border-[rgba(201,168,76,0.18)] bg-[#1a1a1a]',
      icon: 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C]',
    },
    route: {
      shell: 'border-white/[0.08] bg-[#1a1a1a]',
      icon: 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C]',
    },
  }[tone]

  const className = `flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-[10px] border px-3 py-3 text-center transition motion-reduce:transition-none active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#242424] ${toneClasses.shell}`

  const content = (
    <>
      <span className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${toneClasses.icon}`}>
        {icon}
      </span>
      <span className="text-[0.65rem] font-medium text-[#888580]">{label}</span>
    </>
  )

  if (!href) {
    return (
      <button type="button" disabled className={`${className} opacity-50`}>
        {content}
      </button>
    )
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={className}
    >
      {content}
    </a>
  )
}

function RiderDeliverySkeleton() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] items-center justify-center bg-[#1a1a1a] px-5">
      <Spinner className="h-12 w-12" />
    </div>
  )
}

function DetailFallback({ forbidden = false, onRetry }) {
  const title = forbidden ? 'Access denied' : 'Delivery unavailable'
  const body = forbidden
    ? 'This order is not assigned to your rider account.'
    : 'The delivery detail could not be loaded right now.'

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-[#1a1a1a] text-white">
      <nav className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#1a1a1a] px-5 py-[18px]">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/rider/deliveries"
            className="inline-flex items-center gap-1.5 text-[0.78rem] text-[#888580] transition motion-reduce:transition-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Deliveries
          </Link>
          <div className="font-syne text-base font-extrabold text-white">DISKR3T</div>
          <div className="h-9 w-9" />
        </div>
      </nav>

      <div className="px-5 pt-6">
        <section className="rounded-[16px] border border-white/[0.06] bg-[#242424] p-5">
          <div className="font-syne text-[1.6rem] font-extrabold tracking-[-0.03em] text-white">
            {title}
          </div>
          <p className="mt-3 text-sm leading-7 text-[#888580]">{body}</p>

          <div className="mt-5 flex gap-3">
            <Link
              to="/rider/deliveries"
              className="inline-flex min-h-[46px] items-center justify-center rounded-[10px] bg-[#C9A84C] px-4 font-syne text-sm font-bold text-[#1a1a1a] transition motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#242424]"
            >
              Back
            </Link>
            {!forbidden ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[46px] items-center justify-center rounded-[10px] border border-white/[0.08] bg-[#1a1a1a] px-4 font-syne text-sm font-bold text-white transition motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#242424]"
              >
                Try again
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

export default function DeliveryDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const orderId = params.orderId ?? params.id

  const [proofFile, setProofFile] = useState(null)
  const [proofPreviewUrl, setProofPreviewUrl] = useState('')
  const [delivered, setDelivered] = useState(false)
  const [gpsActive, setGpsActive] = useState(false)

  const proofRef = useRef(null)
  const inputRef = useRef(null)
  const trackingInterval = useRef(null)
  const redirectTimeout = useRef(null)
  const gpsWarningShown = useRef(false)

  const orderQuery = useRiderOrder(orderId)
  const deliverMutation = useDeliverOrderMutation()
  const reportIssueMutation = useReportRiderIssueMutation()

  const order = orderQuery.data ?? null
  const storedProofUrl = normalizePublicAssetUrl(order?.delivery_proof_url)
  const proofImageUrl = proofPreviewUrl || storedProofUrl || ''
  const phone = order?.customer?.phone || order?.shipping_address?.phone || ''
  const deliveryAddress = buildDeliveryAddress(order?.shipping_address)
  const googleMapsUrl = buildGoogleMapsDirectionsUrl(order?.shipping_address)
  const isOutForDelivery = order?.order_status === 'out_for_delivery'
  const isDelivered = delivered || order?.order_status === 'delivered'
  const hasProof = Boolean(proofFile || storedProofUrl || proofPreviewUrl)
  const smsHref = phone
    ? `sms:${phone}?body=${encodeURIComponent(
        `Hi ${order?.customer?.name || 'there'}, this is your BrewHaus rider for order ${order?.order_number || ''}.`,
      )}`
    : ''

  const stopGPS = useCallback(() => {
    setGpsActive(false)

    if (trackingInterval.current) {
      window.clearInterval(trackingInterval.current)
      trackingInterval.current = null
    }
  }, [])

  const pushLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsActive(false)

      if (!gpsWarningShown.current) {
        gpsWarningShown.current = true
        toast.error('Location sharing is unavailable on this device.')
      }

      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await api.put('/rider/location', {
            lat: coords.latitude,
            lng: coords.longitude,
          })
          setGpsActive(true)
          gpsWarningShown.current = false
        } catch {
          setGpsActive(false)

          if (!gpsWarningShown.current) {
            gpsWarningShown.current = true
            toast.error('Unable to update your live location right now.')
          }
        }
      },
      () => {
        setGpsActive(false)

        if (!gpsWarningShown.current) {
          gpsWarningShown.current = true
          toast.error('Allow location access so customers can track this delivery.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      },
    )
  }, [])

  const startGPS = useCallback(() => {
    if (trackingInterval.current) {
      return
    }

    pushLocation()
    trackingInterval.current = window.setInterval(pushLocation, 15000)
  }, [pushLocation])

  useEffect(() => {
    if (isOutForDelivery) {
      startGPS()
    } else {
      stopGPS()
    }

    return () => {
      stopGPS()
    }
  }, [isOutForDelivery, startGPS, stopGPS])

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl)
      }
    }
  }, [proofPreviewUrl])

  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        window.clearTimeout(redirectTimeout.current)
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort logout.
    } finally {
      logout()
      toast.success('Signed out.')
      navigate('/login', { replace: true })
    }
  }

  const handleScrollToProof = () => {
    proofRef.current?.scrollIntoView({
      behavior: getScrollBehavior(),
      block: 'start',
    })
  }

  const handleProofUpload = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl)
    }

    setProofFile(file)
    setProofPreviewUrl(URL.createObjectURL(file))
  }

  const clearProof = () => {
    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl)
    }

    setProofFile(null)
    setProofPreviewUrl('')

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleMarkDelivered = async () => {
    if (!order?.id || isDelivered) {
      return
    }

    if (!isOutForDelivery) {
      window.alert('This order must be out for delivery before it can be completed.')
      return
    }

    if (!hasProof) {
      handleScrollToProof()
      window.alert('Please add a delivery proof photo first.')
      return
    }

    try {
      await deliverMutation.mutateAsync({
        orderId: order.id,
        proofImage: proofFile || undefined,
      })
      stopGPS()
      setDelivered(true)
      clearProof()
      redirectTimeout.current = window.setTimeout(() => {
        navigate('/rider/deliveries', { replace: true })
      }, 2000)
    } catch (error) {
      window.alert(getErrorMessage(error, 'Failed to update. Please try again.'))
    }
  }

  const handleReportIssue = async () => {
    if (!order?.id || reportIssueMutation.isPending) {
      return
    }

    const confirmed = window.confirm('Report an issue for this delivery?')

    if (!confirmed) {
      return
    }

    const reason = window.prompt('Describe the issue:')

    if (reason === null) {
      return
    }

    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      window.alert('Issue description is required.')
      return
    }

    try {
      await reportIssueMutation.mutateAsync({
        orderId: order.id,
        issueType: 'other',
        details: trimmedReason,
      })
      window.alert('Issue reported. Admin has been notified.')
    } catch (error) {
      window.alert(getErrorMessage(error, 'Failed to report issue. Please try again.'))
    }
  }

  if (orderQuery.isLoading) {
    return <RiderDeliverySkeleton />
  }

  if (orderQuery.isError || !order) {
    return (
      <DetailFallback
        forbidden={orderQuery.error?.response?.status === 403}
        onRetry={() => orderQuery.refetch()}
      />
    )
  }

  const actionButtonLabel = isDelivered
    ? 'Delivered!'
    : deliverMutation.isPending
      ? 'Updating...'
      : 'Mark as Delivered'

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-[#1a1a1a] text-white">
      <nav className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#1a1a1a] px-5 py-[18px]">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/rider/deliveries"
            className="inline-flex items-center gap-1.5 text-[0.78rem] text-[#888580] transition motion-reduce:transition-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Deliveries
          </Link>

          <div className="font-syne text-base font-extrabold text-white">DISKR3T</div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.08] bg-[#242424] text-[#888580] transition motion-reduce:transition-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <div className="pb-8">
        <section
          className="px-5 pt-6 animate-[fadeUp_0.4s_ease_both] motion-reduce:animate-none"
          style={{ animationDelay: '0ms' }}
        >
          <h1 className="font-syne text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-white">
            {order.order_number}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1.5 font-syne text-[0.65rem] font-bold uppercase tracking-[0.08em] ${getOrderBadgeClass(order.order_status)}`}
            >
              {formatLabel(order.order_status)}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 font-syne text-[0.65rem] font-bold uppercase tracking-[0.08em] ${getPaymentBadgeClass(order.payment_status)}`}
            >
              {formatLabel(order.payment_status)}
            </span>
            <span className="ml-auto font-syne text-[1.35rem] font-bold text-[#C9A84C]">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </section>

        {isOutForDelivery && gpsActive ? (
          <div
            className="mx-5 mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(76,175,130,0.25)] bg-[rgba(76,175,130,0.12)] px-[10px] py-[5px] font-syne text-[0.65rem] font-semibold tracking-[0.04em] text-[#4caf82] animate-[fadeUp_0.4s_ease_both] motion-reduce:animate-none"
            style={{ animationDelay: '50ms' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#4caf82] animate-[pulseDot_1.4s_ease-in-out_infinite] motion-reduce:animate-none" />
            Sharing location
          </div>
        ) : null}

        <div
          className="px-5 pt-5 animate-[fadeUp_0.4s_ease_both] motion-reduce:animate-none"
          style={{ animationDelay: '100ms' }}
        >
          <button
            type="button"
            onClick={handleScrollToProof}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#C9A84C] px-5 py-[14px] font-syne text-[0.875rem] font-bold text-[#1a1a1a] transition motion-reduce:transition-none hover:bg-[#E2C06A] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a]"
          >
            <Camera className="h-4 w-4" />
            Add Delivery Proof
          </button>
        </div>

        <section
          className="mx-5 mt-4 rounded-[16px] border border-white/[0.06] bg-[#242424] p-5 animate-[fadeUp_0.4s_ease_both] motion-reduce:animate-none"
          style={{ animationDelay: '150ms' }}
        >
          <SectionLabel>Customer</SectionLabel>

          <h2 className="font-syne text-[1.1rem] font-bold text-white">
            {order.customer?.name || 'Customer'}
          </h2>

          <p className="mt-2 text-[0.75rem] leading-[1.7] text-[#888580]">
            {phone || 'No phone number provided.'}
            <br />
            {order.customer?.email || 'No email address provided.'}
          </p>

          <div className="my-4 h-px bg-white/[0.07]" />

          <p className="font-syne text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#888580]">
            Delivery Address
          </p>
          <p className="mt-2 text-[0.75rem] leading-[1.6] text-white/85">{deliveryAddress}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <ActionLink
              href={phone ? `tel:${phone}` : ''}
              icon={<Phone className="h-4 w-4" />}
              label="Call"
              tone="call"
            />
            <ActionLink
              href={smsHref}
              icon={<MessageSquare className="h-4 w-4" />}
              label="Message"
              tone="message"
            />
            <ActionLink
              href={googleMapsUrl}
              icon={<MapPinned className="h-4 w-4" />}
              label="Route"
              tone="route"
              external
            />
          </div>
        </section>

        <section
          className="mx-5 mt-4 rounded-[16px] border border-white/[0.06] bg-[#242424] p-5 animate-[fadeUp_0.4s_ease_both] motion-reduce:animate-none"
          style={{ animationDelay: '200ms' }}
        >
          <SectionLabel>Items</SectionLabel>

          <div className="space-y-2">
            {(order.items || []).length > 0 ? (
              (order.items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-[10px] border border-white/[0.06] bg-[#2e2e2e] px-[14px] py-[14px]"
                >
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#C9A84C]" />

                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-syne text-[0.875rem] font-semibold text-white">
                      {item.product?.name || item.product_name || 'Item'}
                    </span>
                    <span className="mt-1 block text-[0.75rem] text-[#888580]">
                      Qty: {item.quantity} x {formatCurrency(item.unit_price)}
                    </span>
                    {item.selected_size ? (
                      <span className="mt-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#c9a84c]">
                        Size: {item.selected_size}
                      </span>
                    ) : null}
                  </div>

                  <span className="whitespace-nowrap font-syne text-base font-bold text-[#C9A84C]">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-[10px] border border-white/[0.06] bg-[#2e2e2e] px-[14px] py-[14px] text-[0.75rem] text-[#888580]">
                No items found for this order.
              </div>
            )}
          </div>
        </section>

        <section
          ref={proofRef}
          className="mx-5 mt-4 rounded-[16px] border border-white/[0.06] bg-[#242424] p-5 animate-[fadeUp_0.4s_ease_both] motion-reduce:animate-none"
          style={{ animationDelay: '250ms' }}
        >
          <SectionLabel>Proof of Delivery</SectionLabel>

          {proofImageUrl ? (
            <>
              <img
                src={proofImageUrl}
                alt="Delivery proof preview"
                className="max-h-[220px] w-full rounded-[10px] object-cover"
              />

              {proofFile ? (
                <button
                  type="button"
                  onClick={clearProof}
                  className="mt-2 flex min-h-[42px] w-full items-center justify-center rounded-[8px] border border-[rgba(224,82,82,0.25)] bg-[rgba(224,82,82,0.1)] px-4 font-syne text-[0.75rem] font-semibold text-[#e05252] transition motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#242424]"
                >
                  Remove photo
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.03)] px-5 py-7 text-center transition motion-reduce:transition-none hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.15)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#242424]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[rgba(201,168,76,0.15)] text-[#C9A84C]">
                <Camera className="h-5 w-5" />
              </span>
              <p className="mt-3 font-syne text-[0.875rem] font-semibold text-white">Take a photo</p>
              <p className="mt-1 text-[0.75rem] text-[#888580]">Tap to capture delivery proof</p>
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleProofUpload}
            className="hidden"
          />
        </section>
      </div>

      <div
        className="sticky bottom-0 z-20 flex gap-[10px] border-t border-white/[0.07] bg-[#1a1a1a] px-5 pt-[14px]"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={handleMarkDelivered}
          disabled={deliverMutation.isPending || isDelivered || !isOutForDelivery}
          className={`flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-[10px] px-5 py-[15px] font-syne text-[0.875rem] font-bold transition motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] ${
            isDelivered
              ? 'bg-[#4caf82] text-white'
              : 'bg-[#C9A84C] text-[#1a1a1a] disabled:opacity-50'
          }`}
        >
          {deliverMutation.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>{actionButtonLabel}</span>
        </button>

        <button
          type="button"
          onClick={handleReportIssue}
          disabled={reportIssueMutation.isPending}
          className="flex h-[50px] w-[50px] items-center justify-center rounded-[10px] border border-[rgba(224,82,82,0.25)] bg-[rgba(224,82,82,0.1)] text-[#e05252] transition motion-reduce:transition-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] disabled:opacity-60"
          aria-label="Report issue"
        >
          {reportIssueMutation.isPending ? (
            <LoaderCircle className="h-[18px] w-[18px] animate-spin motion-reduce:animate-none" />
          ) : (
            <TriangleAlert className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </div>
  )
}
