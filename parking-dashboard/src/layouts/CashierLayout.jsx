import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../utils/auth'
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  CreditCard,
  CalendarCheck,
  ParkingCircle,
  Car,
  ChevronDown,
  User,
  Settings,
  LogOut as LogOutIcon,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', path: '/cashier/dashboard', icon: LayoutDashboard,
    roles: ['admin'] },
  { label: 'Entry Gate', path: '/cashier/entry', icon: LogIn,
    roles: ['entry_cashier', 'admin'] },
  { label: 'Exit Gate', path: '/cashier/exit', icon: LogOut,
    roles: ['exit_cashier', 'admin'] },
  { label: 'Bookings', path: '/cashier/bookings', icon: CalendarCheck, roles: ['all'] },
  { label: 'Payments', path: '/cashier/payments', icon: CreditCard, roles: ['all'] },
  { label: 'Slots', path: '/cashier/slots', icon: ParkingCircle, roles: ['all'] },
]

export default function CashierLayout({ children }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const { name, role, initials } = getUser()

  const filteredNav = navItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(role)
  )

  return (
    <div className="flex min-h-screen bg-background font-sans">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-card flex flex-col">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">Parkroo</p>
              <p className="text-[11px] text-muted-foreground">Smart Parking</p>
              <p className="text-[11px] text-muted-foreground">Management System</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredNav.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user info */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              <p className="text-[11px] text-muted-foreground">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-medium">{role}</span>
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                {initials}
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-foreground leading-tight">{name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{role}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{localStorage.getItem('user_email') || ''}</p>
                  <span className="inline-block mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {role}
                  </span>
                </div>
                <div className="p-1.5">
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    View Profile
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                    Settings
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOutIcon className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content — renders the child passed from App.jsx */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>

      </div>
    </div>
  )
}