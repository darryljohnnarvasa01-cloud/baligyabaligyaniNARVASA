import {
  Boxes,
  LayoutDashboard,
  Package,
  ReceiptText,
  Tags,
  TicketPercent,
  Users,
} from 'lucide-react'

export const adminNavItems = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    shortLabel: 'Overview',
    description: 'Sales pulse, stock pressure, and daily operations.',
    Icon: LayoutDashboard,
  },
  {
    to: '/admin/orders',
    label: 'Orders',
    shortLabel: 'Orders',
    description: 'Review incoming orders and track fulfillment progress.',
    Icon: ReceiptText,
  },
  {
    to: '/admin/products',
    label: 'Products',
    shortLabel: 'Catalog',
    description: 'Manage active products, pricing, and product entries.',
    Icon: Boxes,
  },
  {
    to: '/admin/categories',
    label: 'Categories',
    shortLabel: 'Categories',
    description: 'Keep product grouping and storefront organization clean.',
    Icon: Tags,
  },
  {
    to: '/admin/coupons',
    label: 'Coupons',
    shortLabel: 'Promos',
    description: 'Adjust discounts and monitor live promotion settings.',
    Icon: TicketPercent,
  },
  {
    to: '/admin/inventory',
    label: 'Inventory',
    shortLabel: 'Stock',
    description: 'Watch low-stock thresholds and replenishment needs.',
    Icon: Package,
  },
  {
    to: '/admin/users',
    label: 'Users',
    shortLabel: 'Users',
    description: 'Access staff and customer administration tools.',
    Icon: Users,
  },
]

export function getAdminNavItem(pathname) {
  return (
    adminNavItems.find(
      (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
    ) || adminNavItems[0]
  )
}
