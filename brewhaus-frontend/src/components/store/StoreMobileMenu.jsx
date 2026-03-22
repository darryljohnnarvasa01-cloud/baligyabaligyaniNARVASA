import { useRef } from 'react'
import { Dialog } from '@headlessui/react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

function isHashLink(path) {
  return path.startsWith('/#')
}

function getIsActiveLink(pathname, link) {
  if (link.to === '/shop' && pathname.startsWith('/products/')) {
    return true
  }

  return pathname === link.to
}

/**
 * Mobile storefront navigation drawer.
 *
 * @param {{
 *  actionLinks?: Array<{ label: string, to: string, tone?: 'primary' | 'secondary' }>,
 *  links: Array<{ label: string, to: string }>,
 *  onClose: () => void,
 *  open: boolean,
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function StoreMobileMenu({
  actionLinks = [],
  links,
  onClose,
  open,
}) {
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const closeButtonRef = useRef(null)

  return (
    <Dialog
      className="relative z-50 sm:hidden"
      initialFocus={closeButtonRef}
      onClose={onClose}
      open={open}
    >
      <div className="fixed inset-0 bg-[rgba(0,0,0,0.56)] backdrop-blur-sm" />

      <div className="fixed inset-0 flex">
        <Dialog.Panel className="flex h-full w-full max-w-[380px] flex-col border-r border-[rgba(201,168,76,0.18)] bg-[#1a1a1a] px-5 pb-6 pt-5 text-white shadow-[0_24px_48px_rgba(0,0,0,0.34)] animate-[slideMenuIn_220ms_cubic-bezier(0.16,1,0.3,1)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xs font-bold uppercase tracking-[0.28em] text-[#c9a84c]">
                DISKR3T
              </Dialog.Title>
              <div className="mt-2 text-2xl font-extrabold tracking-[0.04em] text-white">
                Store Menu
              </div>
              <div className="mt-2 max-w-[18rem] text-sm leading-7 text-[#a0a0a0]">
                Browse the storefront, jump to featured pours, or head back into your account.
              </div>
            </div>

            <button
              aria-label="Close storefront navigation"
              className="brewhaus-outline-button h-11 w-11 shrink-0 p-0"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 flex-1 space-y-3 overflow-y-auto pr-1">
            {links.map((link) => {
              const active = getIsActiveLink(location.pathname, link)
              const className = [
                'flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left text-sm font-bold uppercase tracking-[0.18em] transition',
                active
                  ? 'border-[rgba(212,168,67,0.38)] bg-[rgba(201,168,76,0.12)] text-white'
                  : 'border-white/10 bg-[#212121] text-white/78 hover:border-[rgba(212,168,67,0.24)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white',
              ].join(' ')

              if (isHashLink(link.to) && isHomePage) {
                return (
                  <a
                    className={className}
                    href={link.to.slice(1)}
                    key={link.to}
                    onClick={onClose}
                  >
                    {link.label}
                  </a>
                )
              }

              return (
                <Link
                  className={className}
                  key={link.to}
                  onClick={onClose}
                  to={link.to}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {actionLinks.length > 0 ? (
            <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
              {actionLinks.map((link) => (
                <Link
                  className={
                    link.tone === 'primary'
                      ? 'first-light-accent-button flex w-full rounded-full px-5 py-3 text-sm font-bold'
                      : 'brewhaus-outline-button flex w-full rounded-full px-5 py-3 text-sm font-bold'
                  }
                  key={`${link.to}-${link.label}`}
                  onClick={onClose}
                  to={link.to}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
