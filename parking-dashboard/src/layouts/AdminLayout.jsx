import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MapPin, Users, User, CreditCard,
  FileText, Shield, Settings, LogOut, Menu, X, Bot, RotateCcw, Brain,
  MessageSquare, TrendingUp, UserCheck
} from 'lucide-react'
import { logout, getUser } from '../utils/auth'

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const { name, initials } = getUser()

  const navItems = [
    { name: 'Dashboard',      href: '/admin/dashboard',                    icon: LayoutDashboard },
    { name: 'Parking Sites',  href: '/admin/dashboard/parking-sites',      icon: MapPin          },
    { name: 'Owner Accounts', href: '/admin/dashboard/owner-accounts',     icon: Users           },
    { name: 'User Accounts',  href: '/admin/dashboard/user-accounts',      icon: User            },
    { name: 'Queries',        href: '/admin/dashboard/queries',             icon: MessageSquare   },
    { name: 'Payments',       href: '/admin/dashboard/payments',            icon: CreditCard      },
    { name: 'Refunds',        href: '/admin/dashboard/refunds',             icon: RotateCcw       },
    { name: 'Reports',        href: '/admin/dashboard/reports',             icon: FileText        },
    { name: 'System Logs',    href: '/admin/dashboard/system-logs',         icon: Shield          },
    { name: 'AI Monitor',     href: '/admin/dashboard/ai-monitor',          icon: Bot             },
    { name: 'Peak Hours',     href: '/admin/dashboard/peak-hours',          icon: Brain           },
    { name: 'Settings',       href: '/admin/dashboard/settings',            icon: Settings        },
  ]

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-card border-r border-border transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen ? (
            <span className="text-primary font-bold text-xl">SmartPark</span>
          ) : (
            <span className="text-primary font-bold text-xl">SP</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-secondary transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-border space-y-2">
          {sidebarOpen && name && (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                {initials}
              </div>
              <span className="text-sm text-foreground truncate">{name}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
