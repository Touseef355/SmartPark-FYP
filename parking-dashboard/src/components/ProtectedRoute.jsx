import { Navigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { role } = getUser()

  // Agar koi role hi nahi (not logged in) — landing page pe bhejo
  if (!role) {
    logout()
    return null
  }

  // Agar role allowed nahi — sahi page pe bhejo
  if (!allowedRoles.includes(role)) {
    if (role === 'entry_cashier') return <Navigate to="/cashier/entry" replace />
    if (role === 'exit_cashier')  return <Navigate to="/cashier/exit"  replace />
    return <Navigate to="/cashier/entry" replace />
  }

  return children
}