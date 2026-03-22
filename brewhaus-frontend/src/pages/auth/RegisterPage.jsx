import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight } from 'lucide-react'
import useAuth, { getHomePathForRole } from '../../hooks/useAuth'
import AuthField from '../../components/auth/AuthField'
import AuthShell from '../../components/auth/AuthShell'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'

// [CODEX] React e-commerce component: RegisterPage
// Uses: useAuth, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: registers a customer account and sends the user back to the login page on success.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function RegisterPage() {
  const authLogoSrc = '/diskr3t-auth-logo.png'
  const navigate = useNavigate()
  const {
    isAuthenticated,
    isReady,
    role,
    signUp,
    signInWithGoogle,
    registerMutation,
    googleLoginMutation,
  } = useAuth()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  if (!isReady) {
    return (
      <AuthShell
        eyebrow="Create Account"
        title="Preparing your signup flow."
        subtitle="Loading the DISKR3T customer onboarding route and the details needed for a clean first checkout."
        isLoading
        variant="gold"
        brandLogoSrc={authLogoSrc}
        brandLogoAlt="DISKR3T logo"
        hideShowcase
        highlights={[
          'Create a customer account without affecting admin or rider access paths.',
          'Carry this same palette into the first-step onboarding experience.',
          'Keep registration focused on checkout-ready customer details only.',
        ]}
      />
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getHomePathForRole(role)} replace />
  }

  const onChange = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()

    try {
      await signUp(form)
      toast.success('Account created. Check your email to verify it.')
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`, {
        replace: true,
      })
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleGoogleSignIn = async (credential) => {
    try {
      const response = await signInWithGoogle(credential)
      toast.success('Signed in with Google.')
      navigate(getHomePathForRole(response?.data?.role ?? null), {
        replace: true,
      })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <AuthShell
      eyebrow="Create Account"
      title="Create an account in the new storefront style."
      subtitle="Create a customer account to add products to your bag, save delivery details, and keep future coffee runs tied to a single DISKR3T profile."
      note="Customer self-registration only. Admin and rider accounts stay managed from the backend."
      variant="gold"
      brandLogoSrc={authLogoSrc}
      brandLogoAlt="DISKR3T logo"
      hideShowcase
      highlights={[
        'Customer signup remains the only self-service registration path.',
        'A customer account is now required before storefront products can be added to the bag.',
        'Finish registration, verify your email, then continue through the updated sign-in flow.',
      ]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <GoogleSignInButton
          onCredential={handleGoogleSignIn}
          disabled={registerMutation.isPending || googleLoginMutation.isPending}
          text="signup_with"
        />

        <AuthField
          label="Full Name"
          type="text"
          value={form.name}
          onChange={onChange('name')}
          placeholder="Sofia Alvarez"
          autoComplete="name"
          variant="gold"
          required
        />

        <AuthField
          label="Email"
          type="email"
          value={form.email}
          onChange={onChange('email')}
          placeholder="sofia@brewhaus.test"
          autoComplete="email"
          variant="gold"
          required
        />

        <AuthField
          label="Phone"
          hint="Optional"
          type="tel"
          value={form.phone}
          onChange={onChange('phone')}
          placeholder="09XXXXXXXXX"
          autoComplete="tel"
          variant="gold"
        />

        <AuthField
          label="Password"
          type="password"
          value={form.password}
          onChange={onChange('password')}
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          minLength={8}
          variant="gold"
          required
        />

        <button
          type="submit"
          disabled={registerMutation.isPending || googleLoginMutation.isPending}
          className="first-light-accent-button w-full rounded-[18px] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em]"
        >
          <span>{registerMutation.isPending ? 'Creating Account' : 'Create Account'}</span>
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <p className="text-center text-sm text-[#555555]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4 transition hover:text-[#000000]">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
