import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, MailCheck, RotateCcw, ShieldCheck } from 'lucide-react'
import AuthField from '../../components/auth/AuthField'
import AuthShell from '../../components/auth/AuthShell'
import useAuth from '../../hooks/useAuth'

function resolveVerificationState(status) {
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'verified') {
    return {
      title: 'Email verified.',
      subtitle: 'Your address is confirmed. You can sign in and continue through the customer storefront.',
      note: 'Verification is complete for this account.',
      actionLabel: 'Go to Login',
      tone: 'verified',
    }
  }

  if (normalized === 'already_verified') {
    return {
      title: 'Email already verified.',
      subtitle: 'This verification link was already used. Sign in with the same customer account to continue.',
      note: 'No further email action is required for this address.',
      actionLabel: 'Go to Login',
      tone: 'verified',
    }
  }

  if (normalized === 'invalid') {
    return {
      title: 'Verification link expired or invalid.',
      subtitle: 'Request a fresh verification email and use the newest link that arrives in your inbox.',
      note: 'Only the latest signed verification link should be used.',
      actionLabel: 'Resend verification',
      tone: 'retry',
    }
  }

  return {
    title: 'Check your inbox.',
    subtitle: 'A verification link is required before customer sign-in is allowed. Open the email we sent and confirm the address.',
    note: 'If the message does not arrive, resend it below.',
    actionLabel: 'Resend verification',
    tone: 'pending',
  }
}

export default function EmailVerificationPage() {
  const authLogoSrc = '/diskr3t-auth-logo.png'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isResendingVerification, resendVerificationEmail } = useAuth()
  const status = searchParams.get('status') || 'pending'
  const state = useMemo(() => resolveVerificationState(status), [status])
  const [email, setEmail] = useState(searchParams.get('email') || '')

  useEffect(() => {
    setEmail(searchParams.get('email') || '')
  }, [searchParams])

  const handleResend = async (event) => {
    event.preventDefault()

    if (!email.trim()) {
      toast.error('Enter your email address first.')
      return
    }

    try {
      await resendVerificationEmail(email.trim().toLowerCase())
      toast.success('Verification email sent. Check your inbox.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const isVerifiedState = state.tone === 'verified'

  return (
    <AuthShell
      eyebrow="Email Verification"
      title={state.title}
      subtitle={state.subtitle}
      note={state.note}
      variant="gold"
      brandLogoSrc={authLogoSrc}
      brandLogoAlt="DISKR3T logo"
      hideShowcase
      highlights={[
        'Customer sign-in now requires a verified email address.',
        'The verification link is signed and time-limited for security.',
        'Resend is available if the first message expired or never arrived.',
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <div
            className={[
              'flex h-16 w-16 items-center justify-center rounded-full border',
              isVerifiedState
                ? 'border-[#c7df9e] bg-[#f4fbe5] text-[#577a12]'
                : 'border-[#eadfca] bg-[#fcfaf4] text-[#8a6400]',
            ].join(' ')}
          >
            {isVerifiedState ? <ShieldCheck className="h-7 w-7" /> : <MailCheck className="h-7 w-7" />}
          </div>
        </div>

        {isVerifiedState ? (
          <div className="space-y-3">
            <button
              className="first-light-accent-button w-full rounded-[18px] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em]"
              onClick={() => navigate('/login', { replace: true })}
              type="button"
            >
              <span>{state.actionLabel}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <p className="text-center text-sm text-[#555555]">
              Need the storefront instead?{' '}
              <Link className="font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4 transition hover:text-[#000000]" to="/shop">
                Browse products
              </Link>
            </p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleResend}>
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

            <button
              className="first-light-accent-button w-full rounded-[18px] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em]"
              disabled={isResendingVerification}
              type="submit"
            >
              <span>{isResendingVerification ? 'Sending Verification' : state.actionLabel}</span>
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <p className="text-center text-sm text-[#555555]">
              Already verified?{' '}
              <Link className="font-bold text-[#1a1a1a] underline decoration-[#f5c842] decoration-2 underline-offset-4 transition hover:text-[#000000]" to="/login">
                Return to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
