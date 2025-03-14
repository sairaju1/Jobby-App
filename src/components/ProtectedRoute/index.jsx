import { Navigate, Outlet } from 'react-router-dom'
import Cookies from 'js-cookie'

const ProtectedRoute = () => {
  const token = Cookies.get('jwt_token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />  // This renders child routes inside ProtectedRoute
}

export default ProtectedRoute
