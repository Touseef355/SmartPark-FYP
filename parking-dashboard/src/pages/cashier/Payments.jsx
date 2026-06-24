import { useEffect, useState } from 'react'
import { Search, RefreshCw, Banknote, Smartphone, TrendingUp, Receipt } from 'lucide-react'
import api from '../../api/axios'

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
}

const METHOD_STYLES = {
  cash:   { label: 'Cash',   cls: 'bg-green-50 text-green-700 border-green-200',  icon: Banknote },
  online: { label: 'Online', cls: 'bg-blue-50 text-blue-700 border-blue-200',     icon: Smartphone },
}

function MethodBadge({ method }) {
  const m = METHOD_STYLES[method] ?? { label: method ?? 'Unknown', cls: 'bg-secondary text-foreground border-border', icon: Receipt }
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${m.cls}`}>
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  )
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [methodFilter, setMethodFilter] = useState('all')

  async function fetchPayments() {
    setLoading(true)
    try {
      const res = await api.get('/payments/')
      setPayments(res.data)
      setFiltered(res.data)
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [])

  useEffect(() => {
    let list = payments
    if (methodFilter !== 'all') list = list.filter(p => p.payment_method === methodFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.plate_number?.toLowerCase().includes(q) ||
        p.slot?.toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [search, methodFilter, payments])

  // Summary stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayPayments = payments.filter(p => p.paid_at && new Date(p.paid_at) >= today)
  const todayTotal    = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount ?? 0), 0)
  const todayCash     = todayPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + parseFloat(p.amount ?? 0), 0)
  const todayOnline   = todayPayments.filter(p => p.payment_method === 'online').reduce((sum, p) => sum + parseFloat(p.amount ?? 0), 0)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Payments</h2>
          <p className="text-sm text-muted-foreground mt-1">Payment records for cash and online transactions</p>
        </div>
        <button
          onClick={fetchPayments}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Today's Revenue",    value: `Rs. ${Math.round(todayTotal)}`,  icon: TrendingUp, color: 'text-primary',     bg: 'bg-primary/10' },
          { label: 'Cash Collected',     value: `Rs. ${Math.round(todayCash)}`,   icon: Banknote,   color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Online Payments',    value: `Rs. ${Math.round(todayOnline)}`, icon: Smartphone, color: 'text-blue-600',   bg: 'bg-blue-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {[
            { key: 'all',    label: 'All Methods' },
            { key: 'cash',   label: 'Cash' },
            { key: 'online', label: 'Online' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMethodFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                methodFilter === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-secondary text-muted-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by plate or slot..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary">
                {['Plate Number', 'Slot', 'Amount', 'Method', 'Overstay Charge', 'Paid At', 'Receipt'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-secondary rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No payments found
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.id ?? i} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground tracking-wider">
                      {p.plate_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.slot ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      Rs. {parseFloat(p.amount ?? 0).toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <MethodBadge method={p.payment_method} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.overstay_charge > 0 ? (
                        <span className="text-orange-600 font-medium">Rs. {p.overstay_charge}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(p.paid_at)}</td>
                    <td className="px-4 py-3">
                      {p.receipt_number ? (
                        <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                          #{p.receipt_number}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {payments.length} payments
          </div>
        )}
      </div>
    </div>
  )
}