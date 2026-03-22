import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import useAuth from '../hooks/useAuth'
import AdminSidebar from '../components/admin/AdminSidebar'
import { adminNavItems, getAdminNavItem } from '../components/admin/adminNavConfig'
import Button from '../components/ui/Button'
import Topbar from '../components/common/Topbar'

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const activeItem = getAdminNavItem(location.pathname)
  const quickLinks = adminNavItems.filter((item) => item.to !== activeItem.to).slice(0, 3)

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort logout; still clear local session.
    } finally {
      logout()
      toast.success('Signed out.')
      navigate('/login', { replace: true })
    }
  }

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileNavOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileNavOpen])

  return (
    <div className="min-h-screen bg-[#ebebeb] text-[#1a1a1a]">
      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] lg:hidden">
          <button
            aria-label="Close navigation backdrop"
            className="absolute inset-0"
            onClick={() => setIsMobileNavOpen(false)}
            type="button"
          />
          <div className="relative flex h-full max-w-[360px] flex-col">
            <div className="flex items-center justify-between px-4 pb-3 pt-4">
              <div className="rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.12)]">
                Admin navigation
              </div>
              <button
                aria-label="Close navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1a1a1a] shadow-[0_10px_22px_rgba(0,0,0,0.12)]"
                onClick={() => setIsMobileNavOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AdminSidebar mobile onNavigate={() => setIsMobileNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen max-w-[1680px] items-start gap-5 px-4 py-4 sm:px-6 lg:gap-6 lg:px-8">
        <AdminSidebar />

        <div className="min-w-0 flex-1 overflow-x-hidden">
          <header className="sticky top-4 z-20 space-y-2.5">
            <Topbar
              title={activeItem.label}
              subtitle={activeItem.description}
              right={
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/8 text-white transition hover:bg-white/12 lg:hidden"
                    onClick={() => setIsMobileNavOpen(true)}
                    type="button"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div className="hidden text-right leading-tight sm:block">
                    <div className="text-sm font-bold text-white">
                      {user?.name || 'Admin'}
                    </div>
                    <div className="text-xs text-white/62">
                      {user?.email || ''}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em]"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              }
            />

            <section className="first-light-shell-card rounded-[24px] px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white">
                    <activeItem.Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7a7a7a]">
                      Current section
                    </div>
                    <div className="mt-0.5 text-sm font-extrabold text-[#1a1a1a] sm:text-base">
                      {activeItem.label}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickLinks.map((item) => (
                    <Link
                      key={item.to}
                      className="first-light-chip-button inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em]"
                      to={item.to}
                    >
                      <item.Icon className="h-4 w-4" />
                      {item.shortLabel}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </header>

          <main className="pt-5 lg:pt-6">
            <div className="mx-auto w-full max-w-[1320px] min-w-0">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
