import { Link } from 'react-router-dom'

/**
 * // [CODEX] React e-commerce component: NotFoundPage
 * // Uses: Link, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: Renders the e-commerce 404 state and links users back to the storefront.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 *
 * 404 page.
 * @returns {import('react').JSX.Element}
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 text-ink">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-white p-8 text-center shadow-lg">
        <div className="text-2xl font-display font-bold italic text-ink">Page not found</div>
        <p className="mt-3 text-sm leading-7 text-ink-3">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-[8px] bg-ember px-4 py-2 text-white shadow-sm transition hover:bg-[#A85418] hover:shadow-md"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
