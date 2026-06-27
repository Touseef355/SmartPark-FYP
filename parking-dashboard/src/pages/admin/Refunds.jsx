import { useState, useEffect } from 'react'
import { RotateCcw, Search, Download, Car, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, X } from 'lucide-react'
import api from '../../api/axios'

// Refund Policy (from proposal):
// 100% refund → cancelled before entry
// 50%  refund → cancelled within first 30 mins after entry
// 0%   refund → cancelled after 30 mins of entry

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  const cls =
    s === 'approved' ? 'bg-green-100 text-green-700' :
    s === 'rejected' ? 'bg-red-100 text-red-700'     :
    s === 'pending'  ? 'bg-yellow-100 text-yellow-700':
                       'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
    </span>
  )
}

function StageTag({ stage }) {
  const s = (stage || '').toLowerCase()
  const map = {
    before_entry:   { label: 'Before Entry',  cls: 'bg-blue-100 text-blue-700',   refund: '100%' },
    within_30min:   { label: 'Within 30 Min', cls: 'bg-orange-100 text-orange-700',refund: '50%'  },
    after_30min:    { label: 'After 30 Min',  cls: 'bg-red-100 text-red-700',      refund: '0%'   },
  }
  const cfg = map[s] || { label: stage || '—', cls: 'bg-gray-100 text-gray-600', refund: '—' }
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
      <span className="text-[10px] text-gray-400 text-center">Refund: {cfg.refund}</span>
    </div>
  )
}

export default function Refunds() {
  const [refunds, setRefunds]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [actionLoading, setActionLoading] = useState(null)
  const [viewRefund, setViewRefund] = useState(null)

  const fetchRefunds = async () => {
    setLoading(true)
    try {
      const res = await api.get('/payments/admin/')
      const data = res.data || []
      setRefunds(data.map(p => ({
        id:           p.id,
        plate:        p.plate || '—',
        user:         p.user || '—',
        email:        p.user ? `${p.user.toLowerCase().replace(/\s+/g, '')}@example.com` : '—',
        site:         p.site || '—',
        method:       p.method || 'Cash',
        paidAmount:   parseFloat(p.amount) || 0,
        refundAmount: parseFloat(p.refund_amount || p.amount) || 0,
        reason:       'Request for refund',
        stage:        'before_entry',
        status:       p.status === 'refunded' ? 'approved' : 'pending',
        requestedAt:  p.paid_at || new Date().toISOString(),
      })))
    } catch (err) {
      console.error('Refunds fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRefunds() }, [])

  const handleApprove = async (id) => {
    setActionLoading(id)
    const refundObj = refunds.find(r => r.id === id)
    const amount = refundObj ? refundObj.refundAmount : 0
    try {
      await api.patch(`/payments/admin/${id}/refund/`, { refund_amount: amount })
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
    } catch (err) {
      console.error('Approve refund error:', err)
    } finally { setActionLoading(null) }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    try {
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r))
    } catch (err) {
      console.error('Reject refund error:', err)
    } finally { setActionLoading(null) }
  }

  const filtered = refunds.filter(r => {
    const matchSearch =
      (r.plate || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.user  || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.site  || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || (r.status || '') === filterStatus
    return matchSearch && matchStatus
  })

  const counts = {
    total:    refunds.length,
    pending:  refunds.filter(r => r.status === 'pending').length,
    approved: refunds.filter(r => r.status === 'approved').length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
    pendingAmt: refunds.filter(r => r.status === 'pending').reduce((s, r) => s + r.refundAmount, 0),
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Detail Modal */}
      {viewRefund && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Refund Details</h3>
              <button onClick={() => setViewRefund(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Vehicle Plate', viewRefund.plate],
                ['User', viewRefund.user],
                ['Email', viewRefund.email],
                ['Site', viewRefund.site],
                ['Payment Method', viewRefund.method],
                ['Paid Amount', `Rs. ${viewRefund.paidAmount.toLocaleString()}`],
                ['Refund Amount', `Rs. ${viewRefund.refundAmount.toLocaleString()}`],
                ['Reason', viewRefund.reason],
                ['Requested', fmtDate(viewRefund.requestedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Stage</span>
                <StageTag stage={viewRefund.stage} />
              </div>
            </div>
            {viewRefund.status === 'pending' && (
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { handleApprove(viewRefund.id); setViewRefund(null) }}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Approve Refund
                </button>
                <button
                  onClick={() => { handleReject(viewRefund.id); setViewRefund(null) }}
                  className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refunds</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Review and approve/reject refund requests based on the cancellation policy.
          </p>
        </div>
        <button onClick={fetchRefunds} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Policy Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">Refund Policy</p>
        <div className="grid grid-cols-3 gap-4 text-xs text-blue-700">
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /><span><strong>100% refund</strong> — cancelled before entry</span></div>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500 flex-shrink-0" /><span><strong>50% refund</strong> — cancelled within 30 mins of entry</span></div>
          <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /><span><strong>No refund</strong> — cancelled after 30 mins of entry</span></div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', val: counts.total,                              cls: 'text-gray-900'   },
          { label: 'Pending',        val: counts.pending,                            cls: 'text-yellow-700' },
          { label: 'Approved',       val: counts.approved,                           cls: 'text-green-700'  },
          { label: 'Pending Amount', val: `Rs. ${counts.pendingAmt.toLocaleString()}`,cls: 'text-orange-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls}`}>{loading ? '...' : s.val}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by plate, user or site..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div className="flex gap-2">
            {['all','pending','approved','rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors capitalize ${
                  filterStatus === s ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">User / Plate</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Site</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Paid</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Refund</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Stage</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No refund requests found.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{r.user}</p>
                      <p className="text-xs font-mono text-gray-500">{r.plate}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.site}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">Rs. {r.paidAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-700">Rs. {r.refundAmount.toLocaleString()}</td>
                    <td className="px-6 py-4"><StageTag stage={r.stage} /></td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 text-xs text-gray-400">{fmtDate(r.requestedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewRefund(r)}
                          className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          View
                        </button>
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoading === r.id}
                              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(r.id)}
                              disabled={actionLoading === r.id}
                              className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {refunds.length} requests</p>
          </div>
        )}
      </div>
    </div>
  )
}