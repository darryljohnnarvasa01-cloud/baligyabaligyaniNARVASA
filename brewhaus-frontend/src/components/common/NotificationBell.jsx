import { Bell } from 'lucide-react'

/**
 * NotificationBell
 * @param {{ hasUnread?: boolean }} props
 * @returns {import('react').JSX.Element}
 */
export default function NotificationBell({ hasUnread = false }) {
  return (
    <button
      type="button"
      className="first-light-inverse-button relative h-11 w-11 rounded-full border-white/12 p-0 text-white"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {hasUnread ? (
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#f5c842]" />
      ) : null}
    </button>
  )
}
