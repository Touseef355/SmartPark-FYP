import { useEffect, useState } from 'react'
import { supabase, supabaseAdmin } from '../../supabase'
import { Mail, Phone, User, MessageSquare, CheckCircle, Clock, XCircle, Search, Building, Tag } from 'lucide-react'

export default function Queries() {
  const [queries, setQueries] = useState([])
  const [ownerRequests, setOwnerRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('owner')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchAllQueries()
    const channel = supabase
     .channel('queries-realtime')
     .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_queries' },
        () => fetchAllQueries()
      )
     .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchAllQueries() {
    setLoading(true)
    const { data, error } = await supabase
     .from('contact_queries')
     .select('*')
     .order('created_at', { ascending: false })
    if (error) { console.error(error); setLoading(false); return }
    setOwnerRequests(data.filter(q => q.query_type === 'owner_registration'))
    setQueries(data.filter(q => q.query_type!== 'owner_registration'))
    setLoading(false)
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase.from('contact_queries').update({ status: newStatus }).eq('id', id)
    if (!error) fetchAllQueries()
  }

  async function approveOwner(query) {
    if (!confirm(`Approve ${query.name} as Parking Owner?`)) return
    const password = Math.random().toString(36).slice(-8) + 'Aa1!'
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: query.email, password: password, email_confirm: true,
      user_metadata: { role: 'owner', name: query.name, phone: query.phone }
    })
    if (authError) { alert('Error: ' + authError.message); return }
    await supabase.from('contact_queries').update({ status: 'approved' }).eq('id', query.id)
    alert(`✅ Owner Approved!\n\nEmail: ${query.email}\nPassword: ${password}\n\nOwner login: http://127.0.0.1:5500/index.html`)
    fetchAllQueries()
  }

  async function deleteQuery(id) {
    if (!confirm('Delete this query?')) return
    await supabase.from('contact_queries').delete().eq('id', id)
    fetchAllQueries()
  }

  const currentData = activeTab === 'owner'? ownerRequests : queries
  const filteredData = currentData.filter(q => {
    const matchesSearch = q.name.toLowerCase().includes(searchTerm.toLowerCase()) || q.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalQueries: queries.length,
    pendingQueries: queries.filter(q => q.status === 'pending').length,
    ownerRequests: ownerRequests.length,
    pendingApprovals: ownerRequests.filter(q => q.status === 'pending').length
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      read: 'bg-blue-100 text-blue-800 border-blue-200',
      replied: 'bg-green-100 text-green-800 border-green-200',
      approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    }
    return styles[status] || styles.pending
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50"><div className="text-gray-600">Loading...</div></div>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Queries & Registrations</h1>
        <p className="text-gray-600">Manage contact queries and owner registration requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Total Queries</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalQueries}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Pending Queries</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.pendingQueries}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Owner Requests</div>
          <div className="text-3xl font-bold text-blue-600">{stats.ownerRequests}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Pending Approvals</div>
          <div className="text-3xl font-bold text-orange-600">{stats.pendingApprovals}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button onClick={() => setActiveTab('owner')} className={`pb-3 px-4 flex items-center gap-2 ${activeTab === 'owner'? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
          <Building size={18} />Owner Registrations ({ownerRequests.length})
        </button>
        <button onClick={() => setActiveTab('general')} className={`pb-3 px-4 flex items-center gap-2 ${activeTab === 'general'? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>
          <MessageSquare size={18} />General Queries ({queries.length})
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredData.length === 0? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">No data found</div>
        ) : (
          filteredData.map((q) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{q.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Mail size={14} /> {q.email}</span>
                      {q.phone && <span className="flex items-center gap-1"><Phone size={14} /> {q.phone}</span>}
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs border ${getStatusBadge(q.status)}`}>{q.status}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4"><p className="text-gray-700 text-sm">{q.message}</p></div>
              <div className="flex gap-2">
                {activeTab === 'owner' && q.status === 'pending' && (
                  <>
                    <button onClick={() => approveOwner(q)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm">
                      <CheckCircle size={16} />Approve
                    </button>
                    <button onClick={() => updateStatus(q.id, 'rejected')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
                      <XCircle size={16} />Reject
                    </button>
                  </>
                )}
                <button onClick={() => deleteQuery(q.id)} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm ml-auto">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}