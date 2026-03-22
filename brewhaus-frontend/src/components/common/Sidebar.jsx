import { NavLink } from 'react-router-dom'

/**
 * Sidebar
 * @param {{
 *  title: string,
 *  items: { to: string, label: string, Icon?: any, badge?: string|number }[],
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function Sidebar({ title, items }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface shadow-sm md:flex">
      <div className="px-6 py-6">
        <div className="text-xl font-display font-bold italic text-ember">
          {title}
        </div>
      </div>

      <nav className="flex-1 px-3 pb-6">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-sans transition border-l-[3px]',
                isActive
                  ? 'border-ember bg-ember-l text-ember animate-pulse-glow'
                  : 'border-transparent text-ink-3 hover:bg-raised hover:text-ink',
              ].join(' ')
            }
          >
            {item.Icon ? <item.Icon className="h-4 w-4" /> : null}
            <span>{item.label}</span>
            {item.badge ? (
              <span className="ml-auto inline-flex items-center justify-center rounded-[5px] bg-ember-l px-2 py-0.5 text-[10px] font-medium text-ember">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
