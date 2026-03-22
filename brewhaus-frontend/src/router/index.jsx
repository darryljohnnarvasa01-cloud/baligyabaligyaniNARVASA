import { createBrowserRouter, Navigate } from 'react-router-dom'
import RoleGuard from '../components/auth/RoleGuard'
import AdminLayout from '../layouts/AdminLayout'
import AdminDashboardPage from '../pages/admin/DashboardPage'
import AdminOrdersPage from '../pages/admin/OrdersPage'
import AdminOrderDetailPage from '../pages/admin/OrderDetailPage'
import AdminInventoryPage from '../pages/admin/InventoryPage'
import AdminProductsPage from '../pages/admin/ProductsPage'
import AdminProductFormPage from '../pages/admin/ProductFormPage'
import AdminCategoriesPage from '../pages/admin/CategoriesPage'
import AdminCouponsPage from '../pages/admin/CouponsPage'
import AdminUsersPage from '../pages/admin/UsersPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import LoginPage from '../pages/auth/LoginPage'
import EmailVerificationPage from '../pages/auth/EmailVerificationPage'
import RegisterPage from '../pages/auth/RegisterPage'
import CheckoutPage from '../pages/checkout/CheckoutPage'
import OrderFailedPage from '../pages/checkout/OrderFailedPage'
import OrderSuccessPage from '../pages/checkout/OrderSuccessPage'
import AccountPage from '../pages/customer/AccountPage'
import AddressBookPage from '../pages/customer/AddressBookPage'
import MyOrdersPage from '../pages/customer/MyOrdersPage'
import OrderDetailPage from '../pages/customer/OrderDetailPage'
import ProfilePage from '../pages/customer/ProfilePage'
import RiderLayout from '../layouts/RiderLayout'
import NotFoundPage from '../pages/NotFoundPage'
import RiderDeliveriesPage from '../pages/rider/DeliveriesPage'
import RiderDeliveryDetailPage from '../pages/rider/DeliveryDetailPage'
import RiderHistoryPage from '../pages/rider/HistoryPage'
import ProductPage from '../pages/store/ProductPage'
import ShopPage from '../pages/store/ShopPage'
import StorefrontPage from '../pages/store/StorefrontPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <StorefrontPage />,
  },
  {
    path: '/shop',
    element: <ShopPage />,
  },
  {
    path: '/products/:slug',
    element: <ProductPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/checkout/success',
    element: <OrderSuccessPage />,
  },
  {
    path: '/checkout/failed',
    element: <OrderFailedPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/verify-email',
    element: <EmailVerificationPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/admin',
    element: (
      <RoleGuard allowedRoles={['admin']}>
        <AdminLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'orders/:id', element: <AdminOrderDetailPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'products/new', element: <AdminProductFormPage /> },
      { path: 'products/:id/edit', element: <AdminProductFormPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'coupons', element: <AdminCouponsPage /> },
      { path: 'inventory', element: <AdminInventoryPage /> },
      { path: 'users', element: <AdminUsersPage /> },
    ],
  },
  {
    path: '/customer',
    element: (
      <RoleGuard allowedRoles={['customer']}>
        <AccountPage />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/customer/orders" replace /> },
      { path: 'menu', element: <Navigate to="/shop" replace /> },
      { path: 'cart', element: <Navigate to="/checkout" replace /> },
      { path: 'orders', element: <MyOrdersPage /> },
      { path: 'orders/:number', element: <OrderDetailPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'addresses', element: <AddressBookPage /> },
    ],
  },
  {
    path: '/rider',
    element: (
      <RoleGuard allowedRoles={['rider']}>
        <RiderLayout />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/rider/deliveries" replace /> },
      { path: 'deliveries', element: <RiderDeliveriesPage /> },
      { path: 'history', element: <RiderHistoryPage /> },
      { path: 'deliveries/:id', element: <RiderDeliveryDetailPage /> },
      { path: 'delivery/:orderId', element: <RiderDeliveryDetailPage /> },
    ],
  },
  {
    path: '/unauthorized',
    element: <Navigate to="/" replace />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
