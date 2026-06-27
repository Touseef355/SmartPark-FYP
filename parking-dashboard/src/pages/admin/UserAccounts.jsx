import { useState, useEffect } from 'react'
import { User, Search, CheckCircle, XCircle, MessageSquare, CreditCard, Car, ArrowLeft, Eye, RefreshCw, Phone, Mail, Calendar } from 'lucide-react'
import api from '../../api/axios'

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  const cls =
    s === 'active'   ? 'bg-green-100 text-green-700'   :
    s === 'blocked'  ? 'bg-red-100 text-red-700'        :
    s === 'pending'  ? 'bg-yellow-100 text-yellow-700'  :
                       'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
    </span>
  )
}

// ── User Detail Panel ─────────────────────────────────────────────────────
function UserDetailPanel({ user, onClose, onBlock, onUnblock }) {
  const [bookings, setBookings]   = useState([])
  const [payments, setPayments]   = useState([])
  const [disputes, setDisputes]   = useState([])
  const [activeTab, setActiveTab] = useState('bookings')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetchUserDetails()
  }, [user.id])

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      setBookings([
        { id: 'b1', slot_id: 'Slot 12', status: 'completed', created_at: new Date().toISOString(), parking_sites: { name: 'Main Parking Site' }, parking_slots: { slot_number: '12' } },
        { id: 'b2', slot_id: 'Slot 05', status: 'active', created_at: new Date().toISOString(), parking_sites: { name: 'Main Parking Site' }, parking_slots: { slot_number: '05' } }
      ])
      setPayments([
        { id: 'p1', amount: 150, payment_method: 'Card', status: 'completed', created_at: new Date().toISOString() },
        { id: 'p2', amount: 120, payment_method: 'Cash', status: 'completed', created_at: new Date().toISOString() }
      ])
      setDisputes([
        { id: 'd1', subject: 'Billing query', message: 'Double payment charged', status: 'pending', created_at: new Date().toISOString() }
      ])
    } catch (err) {
      console.error('User detail fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const resolveDispute = async (id) => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved' } : d))
  }

  const totalSpent = payments.filter(p => ['completed','paid'].includes((p.status||'').toLowerCase())).reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <div className="p-6 space-y-5 bg-gray-50 min-h-screen">
      <button onClick={onClose} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700 flex-shrink-0">
              {(user.name || 'US').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-gray-900">{user.name || '—'}</h2>
                <StatusBadge status={user.status} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {user.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</span>}
                {user.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{user.phone}</span>}
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {fmtDate(user.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {user.status === 'active' && (
              <button onClick={() => onBlock(user.id)} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
                Block User
              </button>
            )}
            {user.status === 'blocked' && (
              <button onClick={() => onUnblock(user.id)} className="px-4 py-2 border border-green-200 text-green-600 rounded-lg text-sm hover:bg-green-50 transition-colors">
                Unblock User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', val: bookings.length,               color: 'text-blue-700'   },
          { label: 'Total Payments', val: payments.length,               color: 'text-purple-700' },
          { label: 'Total Spent',    val: `Rs. ${totalSpent.toLocaleString()}`, color: 'text-green-700'  },
          { label: 'Open Disputes',  val: disputes.filter(d => d.status !== 'resolved').length, color: 'text-red-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{loading ? '...' : s.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'bookings', label: `Bookings (${bookings.length})`, icon: Car },
            { key: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
            { key: 'disputes', label: `Disputes (${disputes.length})`, icon: MessageSquare },
          ].map(tab => {
            const IconComp = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComp className="w-4 h-4" />{tab.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Bookings tab */}
            {activeTab === 'bookings' && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Slot</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Site</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">No bookings found.</td></tr>
                  ) : bookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{b.parking_slots?.slot_number || b.slot_id || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{b.parking_sites?.name || '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{fmtDate(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Payments tab */}
            {activeTab === 'payments' && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Method</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">No payments found.</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">Rs. {(p.amount||0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{p.payment_method || '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Disputes tab */}
            {activeTab === 'disputes' && (
              <div className="divide-y divide-gray-100">
                {disputes.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No disputes found.</div>
                ) : disputes.map(d => (
                  <div key={d.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{d.subject || d.message || 'Dispute'}</p>
                        <p className="text-xs text-gray-500 mt-1">{fmtDate(d.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <StatusBadge status={d.status || 'pending'} />
                        {d.status !== 'resolved' && (
                          <button
                            onClick={() => resolveDispute(d.id)}
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function UserAccounts() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/admin/users/?role=user')
      const mapped = (res.data || []).map(u => ({
        id: u.id,
        name: u.full_name || '—',
        email: u.email,
        phone: u.phone_number,
        status: u.status,
        created_at: u.created_at,
      }))
      setUsers(mapped)
    } catch (err) {
      console.error('Users fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleBlock = async (id) => {
    setActionLoading(id)
    try {
      await api.patch(`/auth/admin/users/${id}/toggle/`, { action: 'block' })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'blocked' } : u))
      if (selectedUser?.id === id) setSelectedUser(prev => ({ ...prev, status: 'blocked' }))
    } catch (err) {
      console.error('Block error:', err)
    } finally { setActionLoading(null) }
  }

  const handleUnblock = async (id) => {
    setActionLoading(id)
    try {
      await api.patch(`/auth/admin/users/${id}/toggle/`, { action: 'unblock' })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u))
      if (selectedUser?.id === id) setSelectedUser(prev => ({ ...prev, status: 'active' }))
    } catch (err) {
      console.error('Unblock error:', err)
    } finally { setActionLoading(null) }
  }

  const filtered = users.filter(u => {
    const matchSearch =
      (u.name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || u.status === filterStatus
    return matchSearch && matchStatus
  })

  const counts = {
    total:   users.length,
    active:  users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
  }

  if (selectedUser) {
    return (
      <UserDetailPanel
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
      />
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Accounts</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage customer accounts and resolve disputes.</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Users', val: counts.total,   iconBg: 'bg-blue-100',  iconColor: 'text-blue-600',  icon: User         },
          { label: 'Active',      val: counts.active,  iconBg: 'bg-green-100', iconColor: 'text-green-600', icon: CheckCircle  },
          { label: 'Blocked',     val: counts.blocked, iconBg: 'bg-red-100',   iconColor: 'text-red-600',   icon: XCircle      },
        ].map(s => {
          const IconComp = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.val}</p>
                </div>
                <div className={`p-3 rounded-lg ${s.iconBg}`}>
                  <IconComp className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'blocked'].map(s => (
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Email / Phone</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Joined</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3 text-center">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No users found.</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                          {(u.name || 'US').slice(0, 2).toUpperCase()}
                        </div>
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {u.name || '—'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{u.email || '—'}</p>
                      <p className="text-xs text-gray-400">{u.phone || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{fmtDate(u.created_at)}</td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={u.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {u.status === 'active' && (
                          <button
                            onClick={() => handleBlock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Block
                          </button>
                        )}
                        {u.status === 'blocked' && (
                          <button
                            onClick={() => handleUnblock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-xs px-3 py-1.5 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            Unblock
                          </button>
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
            <p className="text-xs text-gray-400">Showing {filtered.length} of {users.length} users</p>
          </div>
        )}
      </div>
    </div>
  )
}