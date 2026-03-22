import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import useCustomerAccount from '../../hooks/customer/useCustomerAccount'

function createFormState(profile) {
  return {
    name: profile?.user?.name || '',
    phone: profile?.user?.phone || '',
  }
}

function getInitials(name) {
  return String(name || 'BH')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function formatDate(value) {
  if (!value) {
    return 'Not available'
  }

  return new Date(value).toLocaleDateString()
}

function formatProviderLabel(value) {
  if (!value) {
    return 'Email account'
  }

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

/**
 * // [CODEX] React e-commerce component: ProfilePage
 * // Uses: useCustomerAccount, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: lets the customer review and update their profile details while showing account context.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function ProfilePage() {
  const { profile, isError, isLoading, isPending, refetch, updateProfile } = useCustomerAccount()
  const [form, setForm] = useState(() => createFormState(null))

  useEffect(() => {
    setForm(createFormState(profile))
  }, [profile])

  const defaultAddress = useMemo(
    () => profile?.addresses?.find((address) => address.is_default) ?? null,
    [profile?.addresses],
  )

  const hasVerifiedEmail = Boolean(profile?.user?.has_verified_email)
  const providerLabel = useMemo(
    () => formatProviderLabel(profile?.user?.auth_provider),
    [profile?.user?.auth_provider],
  )
  const memberSince = useMemo(() => formatDate(profile?.user?.created_at), [profile?.user?.created_at])
  const lastUpdated = useMemo(() => formatDate(profile?.user?.updated_at), [profile?.user?.updated_at])

  const readinessItems = useMemo(
    () => [
      { label: 'Full name ready for checkout', complete: Boolean(profile?.user?.name) },
      { label: 'Phone number saved for delivery contact', complete: Boolean(profile?.user?.phone) },
      { label: 'Email verified', complete: hasVerifiedEmail },
      { label: 'Default address saved', complete: Boolean(defaultAddress) },
    ],
    [defaultAddress, hasVerifiedEmail, profile?.user?.name, profile?.user?.phone],
  )

  const completionPercent = Math.round(
    (readinessItems.filter((item) => item.complete).length / readinessItems.length) * 100,
  )

  const isDirty =
    form.name.trim() !== String(profile?.user?.name || '').trim() ||
    form.phone.trim() !== String(profile?.user?.phone || '').trim()

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      await updateProfile({
        name: form.name,
        phone: form.phone,
      })
      toast.success('Profile updated.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoading) {
    return (
      <section className="flex items-center justify-center py-16">
        <Spinner className="h-12 w-12" />
      </section>
    )
  }

  if (isError || !profile?.user) {
    return (
      <ErrorState
        description="We could not load your customer profile. Retry once the session settles."
        onAction={refetch}
        title="Unable to load your profile."
      />
    )
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[34px] border border-[#1e1e1e] bg-[#111111] text-white shadow-[0_26px_64px_rgba(0,0,0,0.2)]">
        <div className="absolute -left-10 top-0 h-44 w-44 rounded-full bg-[#f5c842]/18 blur-3xl" />
        <div className="absolute right-0 top-10 h-52 w-52 rounded-full bg-white/6 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,rgba(245,200,66,0.08)_100%)]" />

        <div className="relative grid gap-6 px-6 py-7 sm:px-8 sm:py-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c842]/30 bg-[#f5c842]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f5c842]">
              <Sparkles className="h-3.5 w-3.5" />
              Customer Profile
            </div>
            <h1 className="mt-4 max-w-[12ch] font-display text-4xl font-bold italic leading-[1.02] text-white sm:max-w-none sm:text-5xl">
              Shape the profile your checkout flow depends on.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">
              Keep your identity, verification state, and delivery defaults clean so orders move faster and riders have the right contact details every time.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div
                className={[
                  'rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em]',
                  hasVerifiedEmail
                    ? 'border border-[#5e9577] bg-[#173526] text-[#d0f1dc]'
                    : 'border border-[#9f6a33] bg-[#3b2714] text-[#ffd8b5]',
                ].join(' ')}
              >
                {hasVerifiedEmail ? 'Email Verified' : 'Verification Pending'}
              </div>
              <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/78">
                {providerLabel}
              </div>
              <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/78">
                Updated {lastUpdated}
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/8 p-5 backdrop-blur">
            <div className="flex flex-wrap items-start gap-4">
              {profile.user.avatar_url ? (
                <img
                  alt={profile.user.name}
                  className="h-20 w-20 rounded-[24px] border border-white/14 object-cover"
                  src={profile.user.avatar_url}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#f5c842] text-2xl font-extrabold text-[#111111]">
                  {getInitials(profile.user.name)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-2xl font-extrabold text-white">{profile.user.name}</div>
                  <div
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]',
                      hasVerifiedEmail ? 'bg-[#173526] text-[#d0f1dc]' : 'bg-[#3b2714] text-[#ffd8b5]',
                    ].join(' ')}
                  >
                    {hasVerifiedEmail ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    {hasVerifiedEmail ? 'Verified' : 'Pending'}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-sm text-white/72">
                  <Mail className="h-4 w-4 text-[#f5c842]" />
                  <span className="truncate">{profile.user.email}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm text-white/72">
                  <Phone className="h-4 w-4 text-[#f5c842]" />
                  <span>{profile.user.phone || 'No phone number saved yet'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-black/18 px-4 py-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/58">Ready</div>
                <div className="mt-2 text-2xl font-extrabold text-white">{completionPercent}%</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/18 px-4 py-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/58">Addresses</div>
                <div className="mt-2 text-2xl font-extrabold text-white">{profile.addresses?.length || 0}</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/18 px-4 py-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/58">Member</div>
                <div className="mt-2 text-sm font-semibold leading-6 text-white">{memberSince}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[30px] border border-[#e5decc] bg-[linear-gradient(180deg,#fffdf7_0%,#f7f3e9_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
            <div className="border-b border-[#ebe2cd] px-6 py-5">
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#7d6a35]">
                <MapPin className="h-4 w-4" />
                Delivery Default
              </div>
            </div>

            <div className="px-6 py-6">
              {defaultAddress ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-display text-3xl italic text-ink">{defaultAddress.label}</div>
                    <span className="rounded-full bg-[#fff2c5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b5510]">
                      Default
                    </span>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-ink-2">{defaultAddress.recipient_name}</div>
                  <div className="mt-1 text-sm text-ink-3">{defaultAddress.phone}</div>
                  <div className="mt-4 rounded-[22px] border border-[#e6deca] bg-white/88 px-4 py-4 text-sm leading-7 text-ink-3">
                    {defaultAddress.full_address}
                  </div>
                </>
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d9cfb7] bg-white/84 px-4 py-5 text-sm leading-7 text-ink-3">
                  No default address is set yet. Add one so checkout can auto-fill delivery details faster.
                </div>
              )}

              <div className="mt-5">
                <Link className="midnight-ghost-button px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]" to="/customer/addresses">
                  Manage Address Book
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#e5decc] bg-white px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-3">
              <CheckCircle2 className="h-4 w-4" />
              Readiness
            </div>

            <div className="mt-5 rounded-[24px] border border-[#ece5d6] bg-[#fbfaf6] px-5 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-ink">Profile completion</div>
                  <div className="mt-1 text-sm leading-6 text-ink-3">
                    Complete the basics so customer info flows cleanly into checkout and delivery.
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-ink">{completionPercent}%</div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#ece7da]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#111111_0%,#f5c842_100%)] transition-[width] duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              <div className="mt-5 space-y-3">
                {readinessItems.map((item) => (
                  <div className="flex items-center gap-3" key={item.label}>
                    <div
                      className={[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        item.complete ? 'bg-[#eef8f1] text-[#1f6b44]' : 'bg-[#f5f1e7] text-[#8a7b5a]',
                      ].join(' ')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="text-sm text-ink-2">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <form
          className="overflow-hidden rounded-[32px] border border-[#e5decc] bg-white shadow-[0_20px_48px_rgba(0,0,0,0.08)]"
          onSubmit={handleSubmit}
        >
          <div className="h-1.5 bg-[linear-gradient(90deg,#111111_0%,#f5c842_100%)]" />

          <div className="px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-3">Edit Profile</div>
                <h2 className="mt-4 font-display text-3xl font-bold italic text-ink">
                  Polish the details riders and checkout will use.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-3">
                  This form is intentionally focused. Update the essential delivery identity fields here and keep sign-in details separate.
                </p>
              </div>

              <div
                className={[
                  'rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]',
                  isDirty ? 'bg-[#fff2c5] text-[#6b5510]' : 'bg-[#f5f5f2] text-ink-3',
                ].join(' ')}
              >
                {isDirty ? 'Unsaved Changes' : 'Up To Date'}
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
                  Full Name
                </span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                  <input
                    className="midnight-input w-full pl-12 text-sm"
                    onChange={(event) => handleChange('name', event.target.value)}
                    placeholder="Your full delivery name"
                    type="text"
                    value={form.name}
                  />
                </div>
                <div className="mt-2 text-[13px] leading-6 text-ink-3">
                  This name appears on your order and delivery records.
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
                  Phone
                </span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                  <input
                    className="midnight-input w-full pl-12 text-sm"
                    onChange={(event) => handleChange('phone', event.target.value)}
                    placeholder="09171234567"
                    type="text"
                    value={form.phone}
                  />
                </div>
                <div className="mt-2 text-[13px] leading-6 text-ink-3">
                  Riders use this when delivery coordination is needed.
                </div>
              </label>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">
                  Email Address
                </span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                  <input
                    className="midnight-input w-full cursor-not-allowed pl-12 text-sm opacity-70"
                    disabled
                    type="email"
                    value={profile.user.email}
                  />
                </div>
                <div className="mt-2 text-[13px] leading-6 text-ink-3">
                  Sign-in email stays read-only on this page.
                </div>
              </label>

              <div className="rounded-[26px] border border-[#ece5d6] bg-[#fbfaf6] px-5 py-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">Account State</div>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
                  {hasVerifiedEmail ? (
                    <ShieldCheck className="h-4 w-4 text-[#1f6b44]" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-[#9c5b24]" />
                  )}
                  {hasVerifiedEmail ? 'Email verified' : 'Verification pending'}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-ink-3">
                  <CalendarDays className="h-4 w-4" />
                  Member since {memberSince}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-ink-3">
                  <Sparkles className="h-4 w-4" />
                  Provider: {providerLabel}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 border-t border-[#eee7d8] pt-6">
              <button
                className="midnight-ember-button px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isDirty || isPending}
                type="submit"
              >
                <Save className="h-4 w-4" />
                {isPending ? 'Saving Profile' : 'Save Changes'}
              </button>
              <button
                className="midnight-ghost-button px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em]"
                disabled={!isDirty || isPending}
                onClick={() => setForm(createFormState(profile))}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
