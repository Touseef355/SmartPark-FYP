import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Users, Calendar, Wallet,
  FileText, Settings, LogOut, Menu, X, Grid3x3
} from 'lucide-react'
import { logout, getUser } from '../utils/auth'

export default function OwnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const { name, initials } = getUser()

  const sidebarLinks = [
    { name: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { name: 'Site Management', path: '/owner/site', icon: MapPin },
    { name: 'Slot Config', path: '/owner/slots', icon: Grid3x3 },
    { name: 'Cashiers', path: '/owner/cashiers', icon: Users },
    { name: 'Bookings', path: '/owner/bookings', icon: Calendar },
    { name: 'Payments', path: '/owner/payments', icon: Wallet },
    { name: 'Reports', path: '/owner/reports', icon: FileText },
    { name: 'Settings', path: '/owner/settings', icon: Settings },
  ]

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {sidebarOpen? (
            <span className="text-gray-900 font-bold text-xl">SmartPark</span>
          ) : (
            <span className="text-gray-900 font-bold text-xl">SP</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
          >
            {sidebarOpen? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {sidebarLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                   ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {sidebarOpen && name && (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-sm font-semibold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                <p className="text-xs text-gray-500">Parking Owner</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors ${
             !sidebarOpen && 'justify-center'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}