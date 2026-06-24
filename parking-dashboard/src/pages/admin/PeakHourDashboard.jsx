import { useState, useEffect } from 'react'
import { Brain, TrendingUp, Clock, Download, MapPin, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../supabase'

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12
  return `${h}${i < 12 ? 'am' : 'pm'}`
})
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function peakBg(occ) {
  if (occ >= 85) return 'bg-red-500'
  if (occ >= 70) return 'bg-yellow-400'
  if (occ >= 40) return 'bg-blue-400'
  return 'bg-gray-200'
}

function peakText(occ) {
  if (occ >= 85) return 'text-white'
  if (occ >= 70) return 'text-gray-900'
  return 'text-gray-500'
}

export default function PeakHourDashboard() {
  const [bookings,    setBookings]    = useState([])
  const [sites,       setSites]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filterSite,  setFilterSite]  = useState('All Sites')
  const [dateRange,   setDateRange]   = useState('month')

  const getDateFrom = (range) => {
    const now = new Date()
    if (range === 'week')  return new Date(now - 7  * 86400000).toISOString()
    if (range === 'month') return new Date(now - 30 * 86400000).toISOString()
    return null
  }

  const fetchData = async (range) => {
    setLoading(true)
    try {
      const from = getDateFrom(range)

      const [bRes, sRes] = await Promise.all([
        (() => {
          let q = supabase.from('bookings').select('id, created_at, entry_time, site_id')
          if (from) q = q.gte('created_at', from)
          return q.limit(2000)
        })(),
        supabase.from('parking_sites').select('id, name, total_slots'),
      ])

      setBookings(bRes.data || [])
      setSites(sRes.data || [])
    } catch (err) {
      console.error('PeakHour fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(dateRange) }, [dateRange])

  const allSites = ['All Sites', ...(sites.map(s => s.name))]

  const filteredBookings = filterSite === 'All Sites'
    ? bookings
    : bookings.filter(b => {
        const site = sites.find(s => s.id === b.site_id)
        return site?.name === filterSite
      })

  // Build hourly occupancy (% of bookings per hour, 0–23)
  const hourlyOccupancy = Array(24).fill(0)
  filteredBookings.forEach(b => {
    const dt = new Date(b.entry_time || b.created_at)
    if (!isNaN(dt)) hourlyOccupancy[dt.getHours()]++
  })
  const maxHourly = Math.max(...hourlyOccupancy, 1)
  const hourlyPct = hourlyOccupancy.map(v => Math.round((v / maxHourly) * 100))

  // Weekly pattern — avg bookings per day of week (0=Sun, 1=Mon ... 6=Sat)
  const dayCount  = Array(7).fill(0)
  const daySums   = Array(7).fill(0)
  filteredBookings.forEach(b => {
    const d = new Date(b.entry_time || b.created_at)
    if (!isNaN(d)) {
      daySums[d.getDay()]++
    }
  })
  // Reorder Mon–Sun
  const weeklyPct = [1,2,3,4,5,6,0].map(d => {
    return filteredBookings.length > 0 ? Math.round((daySums[d] / filteredBookings.length) * 100) : 0
  })
  const maxWeekly = Math.max(...weeklyPct, 1)

  // Peak hours (>= 70%)
  const peakHours = hourlyPct
    .map((p, i) => ({ hour: HOURS[i], pct: p }))
    .filter(h => h.pct >= 70)
    .sort((a, b) => b.pct - a.pct)

  // Per-site peak hour
  const sitesPeakData = sites.map(site => {
    const sBookings = bookings.filter(b => b.site_id === site.id)
    const hOcc = Array(24).fill(0)
    sBookings.forEach(b => {
      const d = new Date(b.entry_time || b.created_at)
      if (!isNaN(d)) hOcc[d.getHours()]++
    })
    const maxH = Math.max(...hOcc, 1)
    const peakH = hOcc.indexOf(maxH)
    const pct = Math.round((hOcc[peakH] / Math.max(sBookings.length, 1)) * 100)
    return { name: site.name, peakHour: HOURS[peakH], bookings: sBookings.length, pct }
  }).sort((a, b) => b.pct - a.pct)

  const exportCSV = () => {
    const headers = ['Hour','Bookings','Occupancy %']
    const rows = HOURS.map((h, i) => [h, hourlyOccupancy[i], hourlyPct[i]])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `peak_hours_${Date.now()}.csv`; a.click()
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Peak Hour Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Occupancy patterns derived from real booking data.</p>
        </div>
        <div className="flex gap-3">
          {/* Date range */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
            {[['week','Week'],['month','Month'],['all','All Time']].map(([k,l]) => (
              <button
                key={k}
                onClick={() => setDateRange(k)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  dateRange === k ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => fetchData(dateRange)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Site filter */}
      <div className="flex flex-wrap gap-2">
        {allSites.map(s => (
          <button
            key={s}
            onClick={() => setFilterSite(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filterSite === s ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', val: filteredBookings.length, icon: Clock,        iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
          { label: 'Peak Hours',     val: peakHours.length,        icon: AlertTriangle, iconBg: 'bg-red-100',    iconColor: 'text-red-600'    },
          { label: 'Busiest Hour',   val: peakHours[0]?.hour || '—',icon: TrendingUp,  iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
          { label: 'Off-Peak Hours', val: `${24 - peakHours.length}h`, icon: CheckCircle,iconBg:'bg-green-100', iconColor: 'text-green-600'  },
        ].map(s => {
          const IconComp = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : s.val}</p>
                </div>
                <div className={`p-3 rounded-lg ${s.iconBg}`}>
                  <IconComp className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hourly Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">24-Hour Occupancy Heatmap</h3>
        <p className="text-sm text-gray-500 mb-4">Relative occupancy % by hour — from actual booking data</p>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="flex gap-1 mb-1">
              {hourlyPct.map((occ, i) => (
                <div key={i} className="flex-1 group relative">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                    {HOURS[i]}: {occ}%
                  </div>
                  <div
                    className={`${peakBg(occ)} rounded-sm transition-colors h-12 flex items-center justify-center`}
                    title={`${HOURS[i]}: ${occ}%`}
                  >
                    {occ >= 70 && <span className={`text-[9px] font-bold ${peakText(occ)}`}>{occ}%</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              {HOURS.map((h, i) => (
                <p key={i} className="flex-1 text-[9px] text-gray-400 text-center">{i % 3 === 0 ? h : ''}</p>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Peak ≥85%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />High 70–84%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" />Moderate 40–69%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" />Low &lt;40%</span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly pattern */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Weekly Pattern</h3>
          <p className="text-sm text-gray-500 mb-4">Booking share per day of week</p>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, i) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8">{day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${maxWeekly > 0 ? (weeklyPct[i] / maxWeekly) * 100 : 0}%` }}
                    >
                      {weeklyPct[i] > 10 && (
                        <span className="text-[10px] text-white font-semibold">{weeklyPct[i]}%</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-700 font-semibold w-8 text-right">{weeklyPct[i]}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-site peak summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Site Peak Summary</h3>
          <p className="text-sm text-gray-500 mb-4">Busiest hour per site</p>
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Site</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Peak Hour</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Bookings</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Peak %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sitesPeakData.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">No booking data yet.</td></tr>
                  ) : sitesPeakData.map(s => (
                    <tr key={s.name} className="hover:bg-gray-50">
                      <td className="py-2.5 text-sm font-medium text-gray-900 pr-4">{s.name}</td>
                      <td className="py-2.5">
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">{s.peakHour}</span>
                      </td>
                      <td className="py-2.5 text-sm text-gray-600">{s.bookings}</td>
                      <td className="py-2.5">
                        <span className={`text-sm font-semibold ${s.pct >= 85 ? 'text-red-600' : s.pct >= 70 ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {s.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}