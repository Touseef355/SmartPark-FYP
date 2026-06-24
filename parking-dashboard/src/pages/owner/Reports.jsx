import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import { FileText, Download, TrendingUp, Calendar, DollarSign, Users, Car, BarChart3 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getUser } from '../../utils/auth'

const Reports = () => {
  const [dateRange, setDateRange] = useState('This Month')
  const [reportType, setReportType] = useState('Revenue')
  const [bookings, setBookings] = useState([])
  const [slots, setSlots] = useState([])
  const [cashiersList, setCashiersList] = useState([])
  const [sites, setSites] = useState([])
  const [siteId, setSiteId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (currentSiteId = siteId) => {
    let activeSiteId = currentSiteId
    if (!activeSiteId) {
      const { user_id } = getUser()
      if (!user_id) return
      const { data: ownerSites } = await supabase
        .from('parking_sites')
        .select('*')
        .eq('owner_id', user_id)
        .order('name')
      setSites(ownerSites || [])
      if (!ownerSites?.length) return
      activeSiteId = ownerSites[0].id
      setSiteId(activeSiteId)
    }

    const { data: b } = await supabase.from('bookings').select('*').eq('site_id', activeSiteId)
    const { data: s } = await supabase.from('parking_slots').select('*').eq('site_id', activeSiteId)
    const { data: c } = await supabase.from('cashiers').select('*').eq('site_id', activeSiteId)

    setBookings(b || [])
    setSlots(s || [])
    setCashiersList(c || [])
  }

  // Full data with dates - NOW FROM SUPABASE
  const allRevenueData = useMemo(() => {
    const grouped = {}
    bookings.forEach(b => {
      const date = b.booking_date || new Date().toISOString().split('T')[0]
      if (!grouped[date]) grouped[date] = { name: '', date, revenue: 0, bookings: 0 }
      if (b.payment_status === 'Paid') grouped[date].revenue += b.amount || 0
      grouped[date].bookings += 1
    })
    return Object.values(grouped)
     .sort((a,b) => new Date(a.date) - new Date(b.date))
     .slice(-10)
     .map(d => ({
       ...d,
        name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))
  }, [bookings])

  const occupancyData = useMemo(() => {
    const total = slots.length || 85
    const occupied = slots.filter(s => s.status === 'Occupied').length
    const available = total - occupied
    return [
      { name: 'Morning', occupied: Math.floor(occupied * 0.8), available: Math.floor(available * 0.8) },
      { name: 'Afternoon', occupied: Math.floor(occupied * 0.9), available: Math.floor(available * 0.9) },
      { name: 'Evening', occupied, available },
      { name: 'Night', occupied: Math.floor(occupied * 0.4), available: total - Math.floor(occupied * 0.4) },
    ]
  }, [slots])

  const vehicleTypeData = [
    { name: 'Cars', value: 68, color: '#3B82F6' },
    { name: 'Bikes', value: 32, color: '#10B981' },
  ]

  const topCashiers = useMemo(() => {
    return cashiersList.map(c => {
      const cb = bookings.filter(b => b.cashier_id === c.id)
      return {
        name: c.name,
        bookings: cb.length,
        revenue: cb.filter(b => b.payment_status === 'Paid').reduce((s, b) => s + (b.amount || 0), 0)
      }
    }).sort((a,b) => b.revenue - a.revenue)
  }, [cashiersList, bookings])

  // Date filter logic
  const filterByDate = (data) => {
    const today = new Date()
    const dataDate = new Date(data.date)

    if (dateRange === 'Today') {
      return dataDate.toDateString() === today.toDateString()
    }

    if (dateRange === 'This Week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      return dataDate >= weekAgo && dataDate <= today
    }

    if (dateRange === 'This Month') {
      return dataDate.getMonth() === today.getMonth() && dataDate.getFullYear() === today.getFullYear()
    }

    if (dateRange === 'Last 3 Months') {
      const threeMonthsAgo = new Date(today)
      threeMonthsAgo.setMonth(today.getMonth() - 3)
      return dataDate >= threeMonthsAgo && dataDate <= today
    }

    if (dateRange === 'This Year') {
      return dataDate.getFullYear() === today.getFullYear()
    }

    return true
  }

  const filteredRevenueData = useMemo(() => {
    return allRevenueData.filter(filterByDate)
  }, [dateRange, allRevenueData])

  const stats = useMemo(() => {
    const data = filteredRevenueData.length > 0? filteredRevenueData : allRevenueData
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
    const totalBookings = data.reduce((sum, d) => sum + d.bookings, 0)
    const avgRevenue = data.length > 0? Math.round(totalRevenue / data.length) : 0
    const occupancyRate = slots.length? Math.round((slots.filter(s => s.status === 'Occupied').length / slots.length) * 100) : 0

    return { totalRevenue, totalBookings, avgRevenue, occupancyRate }
  }, [filteredRevenueData, allRevenueData, slots])

  const handleExportCSV = () => {
    let csvContent = ''
    let filename = ''

    if (reportType === 'Revenue') {
      const headers = ['Date', 'Day', 'Revenue', 'Bookings']
      const rows = filteredRevenueData.map(d => [d.date, d.name, d.revenue, d.bookings])
      csvContent = [headers.join(','),...rows.map(r => r.join(','))].join('\n')
      filename = `revenue_report_${dateRange.replace(' ', '_').toLowerCase()}.csv`
    } else if (reportType === 'Occupancy') {
      const headers = ['Time Slot', 'Occupied', 'Available']
      const rows = occupancyData.map(d => [d.name, d.occupied, d.available])
      csvContent = [headers.join(','),...rows.map(r => r.join(','))].join('\n')
      filename = `occupancy_report.csv`
    } else if (reportType === 'Cashier Performance') {
      const headers = ['Cashier Name', 'Total Bookings', 'Total Revenue']
      const rows = topCashiers.map(c => [c.name, c.bookings, c.revenue])
      csvContent = [headers.join(','),...rows.map(r => r.join(','))].join('\n')
      filename = `cashier_performance_report.csv`
    } else {
      const headers = ['Vehicle Type', 'Percentage']
      const rows = vehicleTypeData.map(v => [v.name, v.value])
      csvContent = [headers.join(','),...rows.map(r => r.join(','))].join('\n')
      filename = `bookings_report.csv`
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">View detailed insights and export reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {sites.length > 0 && (
            <select
              value={siteId || ''}
              onChange={async (e) => {
                const selectedId = e.target.value
                setSiteId(selectedId)
                await fetchData(selectedId)
              }}
              className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>This Month</option>
            <option>Today</option>
            <option>This Week</option>
            <option>Last 3 Months</option>
            <option>This Year</option>
          </select>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Revenue</option>
            <option>Bookings</option>
            <option>Occupancy</option>
            <option>Cashier Performance</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.5% from last period
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBookings}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +8.2% from last period
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Daily Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {stats.avgRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Per day average</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.occupancyRate}%</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +5.3% from last period
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Car className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts - Conditional Based on Report Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(reportType === 'Revenue' || reportType === 'Bookings') && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend - {dateRange}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue (Rs)" />
                <Line type="monotone" dataKey="bookings" stroke="#3B82F6" strokeWidth={2} name="Bookings" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {(reportType === 'Occupancy' || reportType === 'Revenue') && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy by Time Slot</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Bar dataKey="occupied" fill="#3B82F6" name="Occupied" />
                <Bar dataKey="available" fill="#10B981" name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {(reportType === 'Bookings' || reportType === 'Revenue') && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vehicleTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehicleTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {(reportType === 'Cashier Performance' || reportType === 'Revenue') && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Cashiers</h3>
            <div className="space-y-4">
              {topCashiers.map((cashier, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cashier.name}</p>
                      <p className="text-xs text-gray-500">{cashier.bookings} bookings</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-green-600">Rs. {cashier.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports