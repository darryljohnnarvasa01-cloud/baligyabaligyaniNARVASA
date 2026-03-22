import { NavLink } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import { useAdminInventory } from '../../hooks/admin/useInventory'
import { adminNavItems } from './adminNavConfig'

export default function AdminSidebar({
  className = '',
  mobile = false,
  onNavigate,
}) {
  const { user, role } = useAuth()
  const inventoryQuery = useAdminInventory()

  const lowStockCount = (inventoryQuery.data || []).filter(
    (item) => item.stock_status !== 'in_stock',
  ).length

  return (
    <aside
      className={[
        'first-light-dark-shell px-5 py-5 text-white',
        mobile
          ? 'flex h-full flex-col overflow-y-auto'
          : 'hidden w-[286px] shrink-0 self-start lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col lg:overflow-y-auto',
        className,
      ].join(' ')}
    >
      <div className="rounded-[28px] border border-white/10 bg-white/6 px-5 py-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f5c842]">
          DISKR3T
        </div>
        <div className="mt-2 text-[1.65rem] font-extrabold leading-none text-white">
          Admin Panel
        </div>
        <p className="mt-2 text-sm leading-6 text-white/68">
          Orders, inventory, and catalog operations in one workspace.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 px-1">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/48">
          Navigate
        </div>
        {mobile ? (
          <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/62">
            Admin modules
          </div>
        ) : null}
      </div>

      <nav className="mt-3 flex-1 space-y-2">
        {adminNavItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              [
                'group relative flex items-start gap-3 rounded-[20px] border px-3.5 py-3 transition-all duration-150',
                isActive
                  ? 'border-[#f5c842] bg-[#f5c842] text-[#1a1a1a] shadow-[0_12px_26px_rgba(0,0,0,0.14)]'
                  : 'border-white/10 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
            key={item.to}
            onClick={onNavigate}
            to={item.to}
          >
            {({ isActive }) => (
              <>
                <div
                  className={[
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition',
                    isActive ? 'bg-black/10 text-[#1a1a1a]' : 'bg-white/10 text-white',
                  ].join(' ')}
                >
                  <item.Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{item.label}</span>
                    {item.to === '/admin/inventory' && lowStockCount > 0 ? (
                      <span
                        className={[
                          'inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold',
                          isActive ? 'bg-black/10 text-[#1a1a1a]' : 'bg-[#f5c842] text-[#1a1a1a]',
                        ].join(' ')}
                      >
                        {lowStockCount}
                      </span>
                    ) : null}
                  </div>
                  {mobile ? (
                    <div
                      className={[
                        'mt-1 text-xs leading-5',
                        isActive ? 'text-[#1a1a1a]/72' : 'text-white/52',
                      ].join(' ')}
                    >
                      {item.description}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="first-light-shell-card rounded-[26px] px-4 py-4 text-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5c842] text-lg font-extrabold">
            {(user?.name || 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{user?.name || 'Admin'}</div>
            <div className="truncate text-xs text-[#666666]">{user?.email || ''}</div>
          </div>
        </div>
        <div className="mt-4 inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
          {role || 'admin'}
        </div>
      </div>
    </aside>
  )
}
