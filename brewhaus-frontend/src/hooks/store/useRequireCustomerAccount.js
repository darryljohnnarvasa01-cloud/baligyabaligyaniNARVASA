import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuth from '../useAuth'

export function useRequireCustomerAccount() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, role } = useAuth()

  return () => {
    if (!isAuthenticated) {
      toast.error('Create a customer account to add products to your bag.')
      navigate('/register', {
        state: {
          from: {
            pathname: location.pathname,
            search: location.search,
          },
        },
      })

      return false
    }

    if (role !== 'customer') {
      toast.error('Switch to a customer account to add storefront products.')
      return false
    }

    return true
  }
}
