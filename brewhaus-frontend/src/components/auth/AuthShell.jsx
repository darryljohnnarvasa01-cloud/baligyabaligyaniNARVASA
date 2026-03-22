import { Link } from 'react-router-dom'
import { Coffee, Sparkles } from 'lucide-react'
import Spinner from '../ui/Spinner'

/**
 * // [CODEX] React e-commerce component: AuthShell
 * // Uses: none, Tailwind Midnight Espresso tokens
 * // Midnight Espresso: bg-espresso, text-linen, border-smoke, accent-ember, price in font-mono text-gold
 * // Behavior: renders the auth background, brand card shell, and an optional skeleton loading state.
 * // States: loading (darkwood shimmer skeleton) + empty + error
 */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  note,
  isLoading = false,
  variant = 'default',
  highlights = [],
  brandLogoSrc = '',
  brandLogoAlt = 'DISKR3T',
  hideShowcase = false,
}) {
  if (variant === 'gold') {
    return (
      <div className="min-h-screen bg-[#ebebeb] text-[#1a1a1a]">
        <header className="sticky top-0 z-30 border-b border-black/10 bg-[#111111]/95 backdrop-blur-sm">
          {hideShowcase ? (
            <div className="mx-auto grid max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-8 lg:px-12 lg:py-5">
              <div aria-hidden="true" />
              <Link className="justify-self-center" to="/">
                <div className="flex flex-col items-center">
                  {brandLogoSrc ? (
                    <img
                      src={brandLogoSrc}
                      alt={brandLogoAlt}
                      className="h-16 w-auto object-contain sm:h-20"
                    />
                  ) : null}
                  <div className="mt-1 text-[1.02rem] font-black uppercase leading-none tracking-[0.18em] sm:text-[1.15rem]">
                    <span className="text-[#d7d3cc] [text-shadow:0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.35)]">
                      DISKR
                    </span>
                    <span className="ml-[0.08em] text-[#d4af37] [text-shadow:0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.35)]">
                      3T
                    </span>
                  </div>
                </div>
              </Link>
              <nav className="hidden items-center justify-self-end gap-3 sm:flex">
                <Link className="first-light-inverse-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]" to="/">
                  Home
                </Link>
                <Link className="first-light-outline-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]" to="/shop">
                  Shop
                </Link>
              </nav>
            </div>
          ) : (
            <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-12 lg:py-5">
              <Link className="shrink-0" to="/">
                <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#f5c842]">DISKR3T</div>
                <div className="text-[1.7rem] font-extrabold tracking-[0.04em] text-white sm:text-[1.95rem]">
                  DISKR3T
                </div>
              </Link>

              <nav className="hidden items-center gap-3 sm:flex">
                <Link className="first-light-inverse-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]" to="/">
                  Home
                </Link>
                <Link className="first-light-outline-button rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]" to="/shop">
                  Shop
                </Link>
              </nav>
            </div>
          )}
          <div className="h-1 w-full bg-[#f5c842]" />
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[1240px] items-center px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
          {hideShowcase ? (
            <div className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[36px] shadow-[0_24px_56px_rgba(0,0,0,0.12)]">
              <section className="first-light-shell-card bg-white px-7 py-8 sm:px-10 sm:py-10">
                <div className="text-center">
                  <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                    {eyebrow}
                  </span>
                  <h2 className="mt-5 text-3xl font-extrabold leading-tight text-[#1a1a1a] sm:text-[2.55rem]">
                    {title}
                  </h2>
                  <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
                  <p className="mx-auto mt-5 max-w-[34rem] text-sm leading-7 text-[#555555] sm:text-[15px]">
                    {subtitle}
                  </p>
                </div>

                <div className="mt-8">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Spinner className="h-12 w-12" />
                    </div>
                  ) : (
                    children
                  )}
                </div>

                {footer ? <div className="mt-8 border-t border-[#e0e0e0] pt-6">{footer}</div> : null}
                {note ? <div className="mt-6 text-center text-sm leading-7 text-[#555555]">{note}</div> : null}
              </section>
            </div>
          ) : (
            <div className="grid w-full overflow-hidden rounded-[36px] shadow-[0_24px_56px_rgba(0,0,0,0.12)] lg:grid-cols-[0.92fr_1.08fr]">
              <section className="first-light-dark-shell px-7 py-8 text-white sm:px-10 sm:py-10">
                <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                  DISKR3T Access
                </span>

                <h1 className="mt-6 max-w-[12ch] text-4xl font-extrabold leading-[1.04] sm:text-5xl">
                  Brew faster with one clean account flow.
                </h1>
                <div className="mt-4 h-1 w-24 rounded-full bg-[#f5c842]" />

                <p className="mt-6 max-w-[32rem] text-base leading-8 text-white/74">
                  Orders, addresses, checkout, and customer history stay in one place once you sign in.
                </p>

                <div className="mt-8 space-y-4">
                  {highlights.map((item, index) => (
                    <div
                      className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-4"
                      key={`${item}-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f5c842] text-sm font-bold text-[#1a1a1a]">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-7 text-white/78">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {note ? (
                  <p className="mt-8 rounded-[24px] border border-white/10 bg-white/6 px-5 py-4 text-sm leading-7 text-white/72">
                    {note}
                  </p>
                ) : null}
              </section>

              <section className="first-light-shell-card bg-white px-7 py-8 sm:px-10 sm:py-10">
                <span className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
                  {eyebrow}
                </span>
                <h2 className="mt-5 text-3xl font-extrabold leading-tight text-[#1a1a1a] sm:text-[2.55rem]">
                  {title}
                </h2>
                <div className="mt-3 h-1 w-16 rounded-full bg-[#f5c842]" />
                <p className="mt-5 max-w-[34rem] text-sm leading-7 text-[#555555] sm:text-[15px]">
                  {subtitle}
                </p>

                <div className="mt-8">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Spinner className="h-12 w-12" />
                    </div>
                  ) : (
                    children
                  )}
                </div>

                {footer ? <div className="mt-8 border-t border-[#e0e0e0] pt-6">{footer}</div> : null}
              </section>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-ink-2">
      <div className="first-light-dot-grid pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-xl animate-fade-up">
          <div className="midnight-auth-card overflow-hidden rounded-[48px]">
            <div className="border-b border-border px-10 pb-8 pt-10">
              <div className="mb-6 flex items-center justify-between text-ink-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-ink-3">
                  <Sparkles className="h-3.5 w-3.5 text-ember" strokeWidth={1.75} />
                  DISKR3T
                </div>
                <Coffee className="h-5 w-5 text-gold" strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <div className="font-display text-[2.8rem] font-bold italic leading-none text-ember sm:text-[3.4rem]">
                  DISKR3T
                </div>
                <div className="mt-2 font-display text-lg italic text-ink-3">
                  Brew something great today.
                </div>
                <div className="mt-5 text-[11px] uppercase tracking-[0.16em] text-ink-3">
                  {eyebrow}
                </div>
                <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-ink sm:text-[2.65rem]">
                  {title}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-3 sm:text-[15px]">
                  {subtitle}
                </p>
              </div>
            </div>
            <div className="px-10 py-9">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner className="h-12 w-12" />
                </div>
              ) : (
                children
              )}
            </div>
            {(footer || note) && (
              <div className="border-t border-border bg-surface px-10 py-5">
                {footer ? <div>{footer}</div> : null}
                {note ? (
                  <p className="mt-3 text-center font-display text-[15px] italic text-ink-3">
                    {note}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
