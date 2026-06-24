import { useEffect, useState } from 'react'
import { Search, RefreshCw, CalendarCheck, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import api from '../../api/axios'

const STATUS_STYLES = {
  active:    { label: 'Active',    cls: 'bg-green-50 text-green-700 border-green-200' },
  completed: { label: 'Completed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200' },
  pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overstay:  { label: 'Overstay',  cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { label: status, cls: 'bg-secondary text-foreground border-border' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${s.cls}`}>
      {s.label}
    </span>
  )
}

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  async function fetchBookings() {
    setLoading(true)
    try {
      const res = await api.get('/bookings/')
      setBookings(res.data)
      setFiltered(res.data)
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBookings() }, [])

  useEffect(() => {
    let list = bookings
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(b =>
        b.plate_number?.toLowerCase().includes(q) ||
        b.slot?.toLowerCase().includes(q) ||
        b.user?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [search, statusFilter, bookings])

  const counts = {
    all:       bookings.length,
    active:    bookings.filter(b => b.status === 'active').length,
    overstay:  bookings.filter(b => b.status === 'overstay').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Bookings</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage all vehicle bookings at your site</p>
        </div>
        <button
          onClick={fetchBookings}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',      label: `All (${counts.all})`,             icon: CalendarCheck, color: 'text-foreground' },
          { key: 'active',   label: `Active (${counts.active})`,       icon: CheckCircle,   color: 'text-green-600' },
          { key: 'overstay', label: `Overstay (${counts.overstay})`,   icon: AlertTriangle, color: 'text-orange-600' },
          { key: 'completed',label: `Completed (${counts.completed})`, icon: Clock,         color: 'text-blue-600' },
        ].map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              statusFilter === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-secondary'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${statusFilter === key ? 'text-primary-foreground' : color}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by plate number, slot, or user..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary">
                {['Plate Number', 'User', 'Slot', 'Entry Time', 'Exit Time', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-secondary rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filtered.map((b, i) => (
                  <tr key={b.id ?? i} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground tracking-wider">
                      {b.plate_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground">{b.user ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{b.slot ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(b.entry_time)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(b.exit_time ?? b.booked_exit)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {b.estimated_amount ? `Rs. ${b.estimated_amount}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {bookings.length} bookings
          </div>
        )}
      </div>
    </div>
  )
}