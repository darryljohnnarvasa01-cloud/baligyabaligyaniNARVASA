import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import useAuth, { getHomePathForRole } from '../../hooks/useAuth'
import AuthField from '../../components/auth/AuthField'
import AuthShell from '../../components/auth/AuthShell'

// [CODEX] React e-commerce component: LoginPage
// Uses: useAuth, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: logs the user in, forwards a guest cart session_id when present, and redirects by role.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function LoginPage() {
  const authLogoSrc = '/diskr3t-auth-logo.png'
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isAuthenticated,
    isReady,
    role,
    signIn,
    loginMutation,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const fromLocation = location.state?.from
  const fromHref = fromLocation?.pathname
    ? `${fromLocation.pathname}${fromLocation.search || ''}`
    : ''

  if (!isReady) {
    return (
      <AuthShell
        eyebrow="Sign In"
        title="Welcome back."
        subtitle="Loading your DISKR3T session and preparing the customer route back into the storefront."
        isLoading
        variant="gold"
        brandLogoSrc={authLogoSrc}
        brandLogoAlt="DISKR3T logo"
        hideShowcase
        highlights={[
          'Track orders, delivery progress, and saved addresses from a single customer account.',
          'Use a customer account before adding products to your bag or continuing to checkout.',
          'Use the same account flow tested against the new landing-page palette.',
        ]}
      />
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getHomePathForRole(role)} replace />
  }

  const completeSignIn = async (credentials, successMessage) => {
    try {
      const response = await signIn(credentials)
      toast.success(successMessage)
      navigate(fromHref || getHomePathForRole(response?.data?.role ?? null), {
        replace: true,
      })
    } catch (error) {
      if (error?.data?.verification_required && error?.data?.email) {
        toast.error(error.message)
        navigate(`/verify-email?email=${encodeURIComponent(error.data.email)}`, {
          replace: true,
        })
        return
      }

      toast.error(error.message)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()

    await completeSignIn({ email, password }, 'Welcome back to DISKR3T.')
  }

  return (
    <AuthShell
      eyebrow="Sign In"
      title="Sign in with the new storefront treatment."
      subtitle="Use your DISKR3T customer account to add products to your bag, save addresses, and move back into checkout with the updated dark, white, and muted-gold auth style."
      footer={
        <>
          <div className="midnight-divider text-[11px] font-bold uppercase tracking-[0.22em] text-[#7a7a7a]">
            <span>or continue with</span>
          </div>
          <p className="mt-4 text-center text-sm text-[#555555]">
            You can still browse as guest
          </p>
        </>
      }
      note="Browsing stays open to guests, but bag and checkout now require a customer account."
      variant="gold"
      brandLogoSrc={authLogoSrc}
      brandLogoAlt="DISKR3T logo"
      hideShowcase
      highlights={[
        'Use the customer route for bag, checkout, and order-tracking actions.',
        'Customer sign-in now requires a verified email address.',
        'Keep the same API behavior while testing the new visual treatment.',
        'Browse first, then sign in when you are ready to add products and place an order.',
      ]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@brewhaus.test"
          autoComplete="email"
          variant="gold"
          required
        />

        <AuthField label="Password" as="div" className="relative pr-14" variant="gold">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            minLength={8}
            required
            className="w-full bg-transparent pr-8 text-[15px] text-[#1a1a1a] outline-none placeholder:text-[#8a8a8a]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 inline-flex min-h-[44px] items-center justify-center px-4 text-[#555555] transition hover:text-[#1a1a1a]"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        </AuthField>

        <div className="flex items-center justify-between gap-3 text-sm text-[#555555]">
          <span className="font-semibold text-[#555555]">Brew something great today.</span>
          <Link to="/forgot-password" className="font-semibold transition hover:text-[#1a1a1a]">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="first-light-accent-button w-full rounded-[18px] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em]"
        >
          <span>{loginMutation.isPending ? 'Signing In' : 'Sign In'}</span>
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <p className="text-center text-sm text-[#555555]">
          New here?{' '}
          <Link to="/register" className="font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4 transition hover:text-[#000000]">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
