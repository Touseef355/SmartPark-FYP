import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { Wallet, TrendingUp, Download, Search, Clock, DollarSign } from 'lucide-react'
import { getUser } from '../../utils/auth'

const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [payments, setPayments] = useState([])
  const [siteId, setSiteId] = useState(null)
  const [sites, setSites] = useState([])

  useEffect(() => {
    fetchSiteAndPayments()
    const channel = supabase
     .channel('payments_live')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchPayments())
     .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchSiteAndPayments = async () => {
    const { user_id } = getUser()
    if (!user_id) return
    const { data: ownerSites } = await supabase
      .from('parking_sites')
      .select('*')
      .eq('owner_id', user_id)
      .order('name')
    setSites(ownerSites || [])
    if (ownerSites?.length) {
      setSiteId(ownerSites[0].id)
      await fetchPayments(ownerSites[0].id)
    }
  }

  const fetchPayments = async (currentSiteId = siteId) => {
    if (!currentSiteId) return
    const { data } = await supabase
     .from('bookings')
     .select(`booking_id, customer_name, vehicle_no, amount, payment_status, payment_method, booking_date, created_at, cashiers(name)`)
     .eq('site_id', currentSiteId)
     .order('created_at', { ascending: false })

    const mapped = (data || []).map((b, i) => ({
      id: `PAY${String(i+1).padStart(3,'0')}`,
      bookingId: b.booking_id,
      customer: b.customer_name || 'Guest',
      vehicle: b.vehicle_no || '-',
      amount: b.amount || 0,
      method: b.payment_method || 'Cash',
      date: b.booking_date,
      time: new Date(b.created_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
      status: b.payment_status === 'Paid'? 'Completed' : 'Pending',
      cashier: b.cashiers?.name || '-'
    }))
    setPayments(mapped)
  }

  const isDateInRange = (date, filter) => {
    const today = new Date()
    const d = new Date(date)
    if (filter === 'Today') return d.toDateString() === today.toDateString()
    if (filter === 'This Week') { const w = new Date(); w.setDate(today.getDate()-7); return d >= w }
    if (filter === 'This Month') return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    return true
  }

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const s = searchTerm.toLowerCase()
      const matchSearch = p.customer.toLowerCase().includes(s) || p.vehicle.toLowerCase().includes(s) || p.id.toLowerCase().includes(s)
      const matchStatus = statusFilter === 'All' || p.status === statusFilter
      const matchDate = isDateInRange(p.date, dateFilter)
      return matchSearch && matchStatus && matchDate
    })
  }, [payments, searchTerm, statusFilter, dateFilter])

  const stats = useMemo(() => {
    const completed = payments.filter(p => p.status === 'Completed')
    const today = new Date().toISOString().split('T')[0]
    return {
      totalRevenue: completed.reduce((s,p) => s + p.amount, 0),
      todayRevenue: completed.filter(p => p.date === today).reduce((s,p) => s + p.amount, 0),
      pendingAmount: payments.filter(p => p.status === 'Pending').reduce((s,p) => s + p.amount, 0),
      totalTransactions: payments.length
    }
  }, [payments])

  const handleExport = () => {
    const headers = ['Payment ID','Booking ID','Customer','Vehicle','Amount','Method','Date','Time','Status','Cashier']
    const rows = filteredPayments.map(p => [p.id,p.bookingId,p.customer,p.vehicle,p.amount,p.method,p.date,p.time,p.status,p.cashier])
    const csv = [headers,...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusColor = (s) => s === 'Completed'? 'bg-green-100 text-green-700' : s === 'Pending'? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  const getMethodColor = (m) => m === 'Cash'? 'bg-blue-100 text-blue-700' : m === 'Card'? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track and manage all payment transactions</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {sites.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Select Site:</span>
          <select
            value={siteId || ''}
            onChange={async (e) => {
              const selectedId = e.target.value
              setSiteId(selectedId)
              await fetchPayments(selectedId)
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Revenue</p>
              <p className="text-2xl font-bold text-green-600 mt-1">Rs. {stats.todayRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">From completed payments</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Amount</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">Rs. {stats.pendingAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTransactions}</p>
              <p className="text-xs text-gray-500 mt-1">All payments</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg"><Wallet className="w-5 h-5 text-blue-600" /></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Search by customer, vehicle, or payment ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All</option><option>Completed</option><option>Pending</option><option>Failed</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Time</option><option>Today</option><option>This Week</option><option>This Month</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">PAYMENT ID</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">CUSTOMER</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">VEHICLE</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">AMOUNT</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">METHOD</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">DATE & TIME</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">STATUS</th>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">CASHIER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length === 0? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">No payments found</td></tr>
              ) : filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.id}</td>
                  <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{p.customer}</p><p className="text-xs text-gray-500">{p.bookingId}</p></td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-mono">{p.vehicle}</td>
                  <td className="px-6 py-4"><span className="text-sm font-bold text-green-600">Rs. {p.amount}</span></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getMethodColor(p.method)}`}>{p.method}</span></td>
                  <td className="px-6 py-4"><p className="text-sm text-gray-900">{p.date}</p><p className="text-xs text-gray-500">{p.time}</p></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(p.status)}`}>{p.status}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.cashier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Payments