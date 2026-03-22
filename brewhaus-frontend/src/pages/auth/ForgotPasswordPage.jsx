import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail } from 'lucide-react'
import AuthField from '../../components/auth/AuthField'
import AuthShell from '../../components/auth/AuthShell'

// [CODEX] React e-commerce component: ForgotPasswordPage
// Uses: none, Tailwind Midnight Espresso tokens
// Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
// Behavior: presents the recovery UI only for v1 and explains that the backend reset workflow is not yet enabled.
// States: loading (darkwood shimmer skeleton) + empty + error
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  const onSubmit = (event) => {
    event.preventDefault()
    toast('Password reset will be enabled in a later module.')
  }

  return (
    <AuthShell
      eyebrow="Password Recovery"
      title="Recovery, minus the ceremony."
      subtitle="The interface is ready. The backend reset workflow is intentionally deferred for v1 while checkout and storefront modules take priority."
      note="Need access right now? Use a seeded admin, customer, or rider account while the reset flow is pending."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@brewhaus.test"
          autoComplete="email"
          required
        />

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-ember bg-ember px-5 py-3.5 text-sm font-medium uppercase tracking-[0.22em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#A85418] hover:shadow-md"
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} />
          <span>Notify Me Later</span>
        </button>

        <p className="text-center text-sm text-ink-3">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-ember transition hover:text-gold">
            Return to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
