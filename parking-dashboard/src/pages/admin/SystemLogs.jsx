import { useState, useEffect } from 'react'
import {
  Shield, Search, Download, CheckCircle,
  AlertTriangle, Car, Bot, User, RefreshCw, CreditCard, Clock
} from 'lucide-react'
import api from '../../api/axios'

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const TYPE_CONFIG = {
  BOOKING:   { icon: Car,          bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Booking'   },
  PAYMENT:   { icon: CreditCard,   bg: 'bg-green-100',  text: 'text-green-700',  label: 'Payment'   },
  AI_DETECT: { icon: Bot,          bg: 'bg-violet-100', text: 'text-violet-700', label: 'AI Detect' },
  AUTH:      { icon: User,         bg: 'bg-orange-100', text: 'text-orange-700', label: 'Auth'      },
  ALERT:     { icon: AlertTriangle,bg: 'bg-red-100',    text: 'text-red-700',    label: 'Alert'     },
  SYSTEM:    { icon: Shield,       bg: 'bg-gray-100',   text: 'text-gray-700',   label: 'System'    },
}

export default function SystemLogs() {
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState('all')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/admin/logs/')
      setLogs(res.data || [])
    } catch (err) {
      console.error('SystemLogs fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleExportCSV = () => {
    const headers = ['Type', 'Description', 'Status', 'Site', 'Plate', 'Time']
    const rows = filtered.map(l => [l.type, l.desc, l.status, l.site, l.plate, fmtDate(l.time)])
    const csv  = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `system_logs_${Date.now()}.csv`
    a.click()
  }

  const filtered = logs.filter(l => {
    const matchSearch =
      l.desc.toLowerCase().includes(search.toLowerCase()) ||
      (l.plate || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.site  || '').toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || l.type === filterType
    return matchSearch && matchType
  })

  const typeKeys = ['all', ...Object.keys(TYPE_CONFIG)]

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
          <p className="text-gray-500 mt-1 text-sm">Live activity feed — bookings, payments, AI detections</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = logs.filter(l => l.type === key).length
          const IconComp = cfg.icon
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cfg.bg}`}>
                <IconComp className={`w-4 h-4 ${cfg.text}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{cfg.label}</p>
                <p className="text-lg font-bold text-gray-900">{count}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by plate, site or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          {/* Type filter */}
          <div className="flex flex-wrap gap-1.5">
            {typeKeys.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors capitalize ${
                  filterType === t ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? 'All Types' : TYPE_CONFIG[t]?.label || t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Site</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Plate</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No logs found.</td>
                  </tr>
                ) : filtered.map((l, i) => {
                  const cfg = TYPE_CONFIG[l.type] || TYPE_CONFIG.SYSTEM
                  const IconComp = cfg.icon
                  return (
                    <tr key={`${l.id}-${i}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${cfg.bg}`}>
                            <IconComp className={`w-3.5 h-3.5 ${cfg.text}`} />
                          </div>
                          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{l.desc}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{l.site}</td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{l.plate}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          ['completed','success','active','paid'].includes((l.status||'').toLowerCase())
                            ? 'bg-green-100 text-green-700'
                            : ['failed','error','disputed','blocked'].includes((l.status||'').toLowerCase())
                            ? 'bg-red-100 text-red-700'
                            : ['pending','manual'].includes((l.status||'').toLowerCase())
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {l.status || 'info'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">{fmtDate(l.time)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {logs.length} log entries</p>
          </div>
        )}
      </div>
    </div>
  )
}