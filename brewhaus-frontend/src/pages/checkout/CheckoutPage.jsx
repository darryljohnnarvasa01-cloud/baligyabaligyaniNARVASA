import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, MapPin, MessageSquare, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import StoreShell from '../../components/store/StoreShell'
import AddressForm from '../../components/checkout/AddressForm'
import AddressSelector from '../../components/checkout/AddressSelector'
import OrderSummaryPanel from '../../components/checkout/OrderSummaryPanel'
import PaymentMethodSelector from '../../components/checkout/PaymentMethodSelector'
import ShippingEstimate from '../../components/checkout/ShippingEstimate'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import { CheckoutPageSkeleton } from '../../components/ui/SkeletonLayouts'
import useAuth, { getHomePathForRole } from '../../hooks/useAuth'
import useCheckout from '../../hooks/checkout/useCheckout'
import { useAddresses } from '../../hooks/checkout/useAddresses'
import { useCart } from '../../hooks/store/useCart'
import { FREE_SHIPPING_THRESHOLD, calculateOrderTotals, getPaymentMethodMeta } from '../../utils/checkout'
import { formatCurrency } from '../../utils/storefront'

function createInitialAddressForm(user = null) {
  return {
    label: 'Home',
    recipient_name: user?.name || '',
    phone: user?.phone || '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    is_default: false,
  }
}

function isCodEligibleAddress(address) {
  if (!address) {
    return false
  }

  const city = `${address.city || ''}`.toLowerCase()
  return city.includes('valencia')
}

function getOverviewCardToneClasses(tone) {
  if (tone === 'healthy') {
    return {
      card: 'border-[#d8c48b] bg-[linear-gradient(135deg,#fff7e0_0%,#ffffff_56%,#f7efcf_100%)] shadow-[0_18px_34px_rgba(178,123,13,0.1)]',
      icon: 'border-[#d8c48b] bg-white text-[#8d6511] shadow-[0_10px_24px_rgba(178,123,13,0.12)]',
      detail: 'text-[#715f2a]',
    }
  }

  if (tone === 'warning') {
    return {
      card: 'border-[#e1bc72] bg-[linear-gradient(135deg,#fff2da_0%,#fffdf8_58%,#fff4e1_100%)] shadow-[0_18px_34px_rgba(154,96,16,0.1)]',
      icon: 'border-[#d7a959] bg-white text-heat shadow-[0_10px_24px_rgba(154,96,16,0.12)]',
      detail: 'text-heat',
    }
  }

  return {
    card: 'border-[#e3dcc8] bg-[linear-gradient(180deg,rgba(255,255,255,0.99)_0%,rgba(250,246,239,0.98)_100%)] shadow-[0_14px_28px_rgba(26,25,22,0.05)]',
    icon: 'border-[#e3dcc8] bg-white text-ink-3 shadow-[0_10px_22px_rgba(26,25,22,0.07)]',
    detail: 'text-ink-3',
  }
}

/**
 * // [CODEX] React e-commerce component: CheckoutPage
 * // Uses: useCart, useCheckout, useAddresses, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: drives the authenticated customer checkout flow, address selection, payment choice, and final order placement.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated, role, user } = useAuth()
  const { itemCount, items, subtotal, isLoading: isCartLoading } = useCart()
  const {
    addresses,
    createAddress,
    isError: isAddressError,
    isLoading: isAddressLoading,
    isPending: isAddressPending,
    refetch: refetchAddresses,
  } = useAddresses()
  const { applyCoupon, isApplyingCoupon, isPlacing, placeOrder } = useCheckout()

  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState(() => createInitialAddressForm(user))
  const [paymentMethod, setPaymentMethod] = useState('gcash')
  const [notes, setNotes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)

  const totals = useMemo(
    () => calculateOrderTotals(subtotal, appliedCoupon?.discount_amount || 0),
    [appliedCoupon, subtotal],
  )
  const resolvedSelectedAddressId = useMemo(() => {
    if (!addresses.length) {
      return null
    }

    if (selectedAddressId && addresses.some((address) => Number(address.id) === Number(selectedAddressId))) {
      return selectedAddressId
    }

    return addresses.find((address) => address.is_default)?.id || addresses[0]?.id || null
  }, [addresses, selectedAddressId])
  const selectedAddress = useMemo(
    () => addresses.find((address) => Number(address.id) === Number(resolvedSelectedAddressId)) || null,
    [addresses, resolvedSelectedAddressId],
  )
  const isCodEligible = useMemo(() => isCodEligibleAddress(selectedAddress), [selectedAddress])
  const resolvedPaymentMethod = useMemo(() => {
    if (paymentMethod === 'cod' && !isCodEligible) {
      return 'gcash'
    }

    return paymentMethod
  }, [isCodEligible, paymentMethod])
  const shouldShowAddressForm = showAddressForm || addresses.length === 0
  const paymentMeta = getPaymentMethodMeta(resolvedPaymentMethod)
  const freeShippingGap = useMemo(
    () => Math.max(0, FREE_SHIPPING_THRESHOLD - Number(subtotal || 0)),
    [subtotal],
  )
  const noteCount = notes.trim().length
  const readinessCount = [itemCount > 0, Boolean(selectedAddress), Boolean(resolvedPaymentMethod)].filter(Boolean).length
  const overviewCards = [
    {
      label: 'Bag',
      value: `${itemCount} item${itemCount === 1 ? '' : 's'}`,
      detail: `${formatCurrency(subtotal)} merchandise`,
      icon: ShoppingBag,
      tone: 'healthy',
    },
    {
      label: 'Deliver To',
      value: selectedAddress ? selectedAddress.label : 'Select address',
      detail: selectedAddress
        ? `${selectedAddress.city || 'Delivery area'}${selectedAddress.province ? `, ${selectedAddress.province}` : ''}`
        : 'Choose or save a drop-off point.',
      icon: MapPin,
      tone: selectedAddress ? 'healthy' : 'warning',
    },
    {
      label: 'Payment',
      value: paymentMeta.shortLabel,
      detail:
        resolvedPaymentMethod === 'cod'
          ? isCodEligible
            ? 'Pay the rider on handoff.'
            : 'Select a Valencia address to enable COD.'
          : 'Secure redirect after order confirm.',
      icon: CreditCard,
      tone: resolvedPaymentMethod === 'cod' && !isCodEligible ? 'warning' : 'healthy',
    },
    {
      label: 'Delivery Fee',
      value: totals.shippingFee === 0 ? 'Free' : formatCurrency(totals.shippingFee),
      detail:
        totals.shippingFee === 0
          ? 'Free shipping is already active.'
          : `${formatCurrency(freeShippingGap)} to waive the fee.`,
      icon: Truck,
      tone: totals.shippingFee === 0 ? 'healthy' : 'warning',
    },
  ]
  const readinessSteps = [
    {
      label: 'Bag loaded',
      detail: `${itemCount} item${itemCount === 1 ? '' : 's'} ready`,
      done: itemCount > 0,
    },
    {
      label: 'Address locked',
      detail: selectedAddress ? selectedAddress.label : 'Choose a delivery stop',
      done: Boolean(selectedAddress),
    },
    {
      label: 'Payment set',
      detail: paymentMeta.label,
      done: Boolean(resolvedPaymentMethod),
    },
  ]
  const sectionShellClassName =
    'rounded-[34px] border border-[#e2d6bc] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,246,238,0.96)_100%)] p-6 shadow-[0_22px_52px_rgba(17,12,7,0.08)] sm:p-8'
  const sectionBadgeClassName =
    'inline-flex rounded-full bg-[#fff1c7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#17130a]'
  const floatingBadgeClassName =
    'rounded-[20px] border border-[#dbcba6] bg-white px-4 py-3 text-[#715f2a] shadow-[0_12px_24px_rgba(178,123,13,0.08)]'

  const handleAddressFieldChange = (key, value) => {
    setAddressForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSaveAddress = async () => {
    try {
      const savedAddress = await createAddress({
        ...addressForm,
        is_default: addresses.length === 0 ? true : addressForm.is_default,
      })

      setSelectedAddressId(savedAddress.id)
      setShowAddressForm(false)
      setAddressForm(createInitialAddressForm(user))
      toast.success('Address saved.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCouponChange = (value) => {
    setCouponCode(value)

    if (!value.trim() || (appliedCoupon && appliedCoupon.coupon.code !== value.trim().toUpperCase())) {
      setAppliedCoupon(null)
    }
  }

  const handleApplyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase()

    if (!normalizedCode) {
      toast.error('Enter a coupon code first.')
      return
    }

    if (!isAuthenticated) {
      toast.error('Sign in to apply a coupon.')
      return
    }

    if (role !== 'customer') {
      toast.error('Coupons are only available in customer checkout.')
      return
    }

    try {
      const summary = await applyCoupon(normalizedCode)
      setCouponCode(summary.coupon.code)
      setAppliedCoupon(summary)
      toast.success(`Coupon ${summary.coupon.code} applied.`)
    } catch (error) {
      setAppliedCoupon(null)
      toast.error(error.message)
    }
  }

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: { pathname: '/checkout' },
        },
      })
      return
    }

    if (!resolvedSelectedAddressId) {
      toast.error('Add or select a delivery address first.')
      return
    }

    try {
      const response = await placeOrder({
        shipping_address_id: resolvedSelectedAddressId,
        payment_method: resolvedPaymentMethod,
        notes: notes.trim() || null,
        coupon_code: couponCode.trim().toUpperCase() || null,
      })

      if (response.checkout_url) {
        toast.success('Redirecting to PayMongo.')
        window.location.assign(response.checkout_url)
        return
      }

      toast.success('Order confirmed.')
      navigate(`/checkout/success?order=${encodeURIComponent(response.order_number)}`, {
        replace: true,
      })
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isCartLoading) {
    return (
      <StoreShell variant="gold">
        <CheckoutPageSkeleton />
      </StoreShell>
    )
  }

  if (!itemCount) {
    return (
      <StoreShell variant="gold">
        <EmptyState
          actionLabel="Browse Products"
          description="Your bag is empty. Add a few coffees before moving into checkout."
          onAction={() => navigate('/shop')}
          title="Nothing to checkout yet."
          titleClassName="font-display text-3xl italic text-ink"
        />
      </StoreShell>
    )
  }

  if (!isAuthenticated) {
    return (
      <StoreShell variant="gold">
        <section className="grid gap-8 lg:grid-cols-[0.58fr_0.42fr]">
          <div className={sectionShellClassName}>
            <div className={sectionBadgeClassName}>Checkout</div>
            <h1 className="mt-4 font-display text-5xl font-bold italic text-ink">Sign in to place your order.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-ink-3">
              Your cart is preserved, but the current schema requires a customer account before an order can be created.
              Sign in to save your address, complete payment, and track the order after checkout.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="first-light-accent-button rounded-[18px] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em]"
                state={{ from: { pathname: '/checkout' } }}
                to="/login"
              >
                Sign In
              </Link>
              <Link className="first-light-outline-button rounded-[18px] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em]" to="/register">
                Create Account
              </Link>
            </div>
          </div>

          <OrderSummaryPanel
            appliedCoupon={appliedCoupon}
            couponCode={couponCode}
            discountAmount={totals.discountAmount}
            freeShippingGap={freeShippingGap}
            isApplyingCoupon={isApplyingCoupon}
            isPlacing={false}
            items={items}
            onApplyCoupon={handleApplyCoupon}
            onCouponChange={handleCouponChange}
            onPlaceOrder={handlePlaceOrder}
            paymentMethod={resolvedPaymentMethod}
            selectedAddress={selectedAddress}
            shippingFee={totals.shippingFee}
            subtotal={subtotal}
            totalAmount={totals.totalAmount}
          />
        </section>
      </StoreShell>
    )
  }

  if (role !== 'customer') {
    return (
      <StoreShell variant="gold">
        <div className={sectionShellClassName}>
          <div className={sectionBadgeClassName}>Checkout</div>
          <h1 className="mt-4 font-display text-4xl font-bold italic text-ink">This checkout is customer-only.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-3">
            Your current session belongs to the <span className="text-ink">{role}</span> workspace. Switch to a
            customer account if you need to place a storefront order.
          </p>
          <div className="mt-6">
            <Link className="first-light-outline-button rounded-[18px] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em]" to={getHomePathForRole(role)}>
              Go to Workspace
            </Link>
          </div>
        </div>
      </StoreShell>
    )
  }

  return (
    <StoreShell variant="gold">
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-[40px] border border-[#d9c38d] bg-[linear-gradient(135deg,#fff8ea_0%,#ffffff_44%,#f4e8c0_100%)] px-6 py-7 shadow-[0_28px_64px_rgba(0,0,0,0.12)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -left-12 top-0 h-36 w-36 rounded-full bg-[rgba(255,255,255,0.55)] blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[rgba(245,200,66,0.18)] blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="max-w-3xl">
              <div className={sectionBadgeClassName}>Checkout</div>
              <h1 className="mt-4 font-display text-4xl font-bold italic leading-none text-[#1a1a1a] sm:text-6xl">
                Review once, place fast.
              </h1>
              <div className="mt-4 h-1 w-20 rounded-full bg-[#c89d34]" />
              <p className="mt-5 max-w-2xl text-sm leading-8 text-[#4d4637] sm:text-base">
                Confirm the delivery stop, choose how to pay, and keep the full charge in sight while you finish the
                order.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#dbcba6] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#715f2a]">
                  {selectedAddress ? `Delivering to ${selectedAddress.label}` : 'Choose a delivery stop'}
                </span>
                <span className="rounded-full border border-[#dbcba6] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#715f2a]">
                  {resolvedPaymentMethod === 'cod' ? 'Cash on handoff' : 'Secure PayMongo redirect'}
                </span>
                <span className="rounded-full border border-[#dbcba6] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#715f2a]">
                  {totals.shippingFee === 0 ? 'Free shipping active' : `${formatCurrency(freeShippingGap)} to free shipping`}
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-[rgba(200,157,52,0.55)] bg-[linear-gradient(180deg,#241b12_0%,#1a130c_100%)] px-6 py-5 text-white shadow-[0_22px_48px_rgba(0,0,0,0.22)]">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#f5c842]/20 blur-2xl" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f3d88a]">
                  Checkout Ready
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="font-display text-[46px] font-bold italic leading-none text-white">
                      {readinessCount}/{readinessSteps.length}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/70">
                      The order can move as soon as these core pieces are set.
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3d88a]">
                    {formatCurrency(totals.totalAmount)}
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#f5c842]"
                    style={{ width: `${(readinessCount / readinessSteps.length) * 100}%` }}
                  />
                </div>

                <div className="mt-5 space-y-2">
                  {readinessSteps.map((step) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] px-4 py-3"
                      key={step.label}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            'h-2.5 w-2.5 rounded-full',
                            step.done ? 'bg-[#f5c842] shadow-[0_0_0_4px_rgba(245,200,66,0.14)]' : 'bg-white/25',
                          ].join(' ')}
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">{step.label}</div>
                          <div className="text-xs text-[rgba(255,255,255,0.55)]">{step.detail}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                        {step.done ? 'Ready' : 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => {
              const toneClasses = getOverviewCardToneClasses(card.tone)
              const Icon = card.icon

              return (
                <div className={['rounded-[26px] border p-5', toneClasses.card].join(' ')} key={card.label}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4">
                        {card.label}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-ink">{card.value}</div>
                    </div>
                    <div
                      className={[
                        'flex h-12 w-12 items-center justify-center rounded-full border',
                        toneClasses.icon,
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className={['mt-3 text-sm leading-6', toneClasses.detail].join(' ')}>{card.detail}</div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,0.62fr)_minmax(360px,0.38fr)]">
          <div className="space-y-6">
            <section className={sectionShellClassName} id="checkout-address">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className={sectionBadgeClassName}>Delivery Address</div>
                  <h2 className="mt-4 font-display text-3xl font-bold italic text-ink sm:text-5xl">
                    Where should we send it?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-ink-3">
                    Saved delivery points and new address entry live in one place so you can keep moving through checkout.
                  </p>
                </div>
                <div className={floatingBadgeClassName}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">Current Stop</div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {selectedAddress ? selectedAddress.label : 'Address needed'}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-[#dfd2b1] bg-[linear-gradient(135deg,#fff8e8_0%,#ffffff_52%,#f7efcf_100%)] px-5 py-5 shadow-[0_16px_34px_rgba(17,12,7,0.06)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d8c48b] bg-white text-[#8d6511] shadow-[0_10px_22px_rgba(178,123,13,0.12)]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#7a6830]">Selected Delivery Point</div>
                    <div className="mt-2 text-lg font-semibold text-ink">
                      {selectedAddress ? selectedAddress.recipient_name : 'No address selected yet.'}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-ink-3">
                      {selectedAddress
                        ? `${selectedAddress.full_address} | ${selectedAddress.phone}`
                        : 'Pick a saved address or add a new one below to continue with checkout.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {isAddressLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="h-12 w-12" />
                  </div>
                ) : isAddressError ? (
                  <ErrorState
                    description="We could not load your saved addresses. Retry the request and continue checkout once they appear."
                    onAction={refetchAddresses}
                    title="Unable to load addresses."
                  />
                ) : addresses.length ? (
                  <AddressSelector
                    addresses={addresses}
                    onAddNew={() => setShowAddressForm(true)}
                    onSelect={setSelectedAddressId}
                    selectedId={resolvedSelectedAddressId}
                  />
                ) : null}

                {shouldShowAddressForm ? (
                  <AddressForm
                    isSubmitting={isAddressPending}
                    onCancel={addresses.length ? () => setShowAddressForm(false) : null}
                    onChange={handleAddressFieldChange}
                    onSubmit={handleSaveAddress}
                    submitLabel="Save Address"
                    value={addressForm}
                  />
                ) : null}
              </div>
            </section>

            <section className={sectionShellClassName} id="checkout-payment">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className={sectionBadgeClassName}>Payment Method</div>
                  <h2 className="mt-4 font-display text-3xl font-bold italic text-ink sm:text-5xl">
                    Choose how you want to pay.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-ink-3">
                    Wallet redirect and COD availability are surfaced here before you place the order.
                  </p>
                </div>
                <div className={floatingBadgeClassName}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">Selected</div>
                  <div className="mt-1 text-sm font-semibold text-ink">{paymentMeta.label}</div>
                </div>
              </div>

              <div className="mt-6">
                <PaymentMethodSelector
                  disabledMethods={isCodEligible ? [] : ['cod']}
                  onChange={setPaymentMethod}
                  value={resolvedPaymentMethod}
                />
              </div>

              <div className="mt-5 rounded-[28px] border border-[#dfd2b1] bg-[linear-gradient(135deg,#fff8ea_0%,#ffffff_60%,#f6efda_100%)] px-5 py-5 shadow-[0_16px_34px_rgba(17,12,7,0.06)]">
                <div className="flex items-start gap-4">
                  <div
                    className={[
                      'flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_10px_22px_rgba(17,12,7,0.08)]',
                      !selectedAddress || !isCodEligible
                        ? 'border-heat/35 bg-heat-l text-heat'
                        : 'border-live/35 bg-live-l text-live',
                    ].join(' ')}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#7a6830]">Cash On Delivery</div>
                    <div className="mt-2 text-lg font-semibold text-ink">
                      {!selectedAddress
                        ? 'Address needed to validate COD.'
                        : isCodEligible
                          ? 'COD is available for this order.'
                          : 'COD is unavailable for this address.'}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-ink-3">
                      {!selectedAddress
                        ? 'Select a delivery address first to check if Cash on Delivery is available for your area.'
                        : isCodEligible
                          ? resolvedPaymentMethod === 'cod'
                            ? `Cash on Delivery is active. Prepare ${formatCurrency(totals.totalAmount)} for the rider when your order arrives.`
                            : `Cash on Delivery is available for this address if you prefer to pay ${formatCurrency(totals.totalAmount)} on handoff.`
                          : `Cash on Delivery is currently limited to Valencia addresses only. This order will continue with ${paymentMeta.label}.`}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={sectionShellClassName} id="checkout-details">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className={sectionBadgeClassName}>Delivery Notes</div>
                  <h2 className="mt-4 font-display text-3xl font-bold italic text-ink sm:text-5xl">
                    Final delivery details.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-ink-3">
                    Give the rider the exact handoff instructions and keep the shipping target in view.
                  </p>
                </div>
                <div className={floatingBadgeClassName}>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">Notes</div>
                  <div className="mt-1 text-sm font-semibold text-ink">
                    {noteCount ? `${noteCount} characters` : 'Optional'}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[0.42fr_0.58fr]">
                <ShippingEstimate shippingFee={totals.shippingFee} subtotal={subtotal} />

                <div className="rounded-[28px] border border-[#e2d6bc] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,246,238,0.98)_100%)] p-5 shadow-[0_18px_38px_rgba(17,12,7,0.06)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d8c48b] bg-white text-[#8d6511] shadow-[0_10px_22px_rgba(178,123,13,0.12)]">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-[#7a6830]">Order Notes</div>
                      <div className="mt-2 text-lg font-semibold text-ink">Leave rider or roastery instructions.</div>
                    </div>
                  </div>

                  <textarea
                    aria-label="Order notes"
                    className="first-light-field mt-5 min-h-[190px] resize-none text-sm leading-7"
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Gate code, landmark, preferred handoff point, or anything the rider should know."
                    value={notes}
                  />
                </div>
              </div>
            </section>
          </div>

          <OrderSummaryPanel
            appliedCoupon={appliedCoupon}
            couponCode={couponCode}
            discountAmount={totals.discountAmount}
            freeShippingGap={freeShippingGap}
            isApplyingCoupon={isApplyingCoupon}
            isPlacing={isPlacing}
            items={items}
            onApplyCoupon={handleApplyCoupon}
            onCouponChange={handleCouponChange}
            onPlaceOrder={handlePlaceOrder}
            paymentMethod={resolvedPaymentMethod}
            selectedAddress={selectedAddress}
            shippingFee={totals.shippingFee}
            subtotal={subtotal}
            totalAmount={totals.totalAmount}
          />
        </section>
      </div>
    </StoreShell>
  )
}
