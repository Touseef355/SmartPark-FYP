import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Users, CreditCard, Car,
  AlertTriangle, CheckCircle, Bot, RotateCcw,
  Download, ArrowRight, MessageSquareWarning, UserCheck,
  Activity, Clock, ShieldCheck, X
} from 'lucide-react'
import { supabase } from '../../supabase'

// ── UTILITY HELPERS ──────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return 'just now'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function capitalise(str) {
  if (!str) return 'Cash'
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function peakColorClass(v) {
  if (v > 85) return 'bg-red-500'
  if (v >= 70) return 'bg-yellow-400'
  return 'bg-green-500'
}

// ── STAT CARD ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, loading }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${loading ? 'text-gray-300' : 'text-gray-900'}`}>
            {loading ? '...' : value}
          </p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-lg ml-4 flex-shrink-0 ${iconBg || 'bg-blue-100'}`}>
          <Icon className={`w-5 h-5 ${iconColor || 'text-blue-600'}`} />
        </div>
      </div>
    </div>
  )
}

// ── SECTION CARD ─────────────────────────────────────────────────────────

function Section({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── RANGE TOGGLE ─────────────────────────────────────────────────────────

function RangeToggle({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
      {['7D', '30D', 'All'].map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            value === r
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

// ── LOADING SPINNER ───────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [revenueRange, setRevenueRange] = useState('7D')
  const [pulse, setPulse] = useState(false)

  // ── Live data states ──
  const [kpi, setKpi] = useState({
    totalRevenue: 0,
    activeVehicles: 0,
    totalCapacity: 0,
    registeredUsers: 0,
    activeSites: 0,
    ldpAccuracy: 0,
    ocrAccuracy: 0,
    manualOverrides: 0,
    openDisputes: 0,
  })
  const [kpiLoading, setKpiLoading] = useState(true)

  const [revenueData, setRevenueData] = useState([])
  const [revenueLoading, setRevenueLoading] = useState(true)

  const [slotData, setSlotData] = useState([])
  const [slotLoading, setSlotLoading] = useState(true)

  const [aiAccuracy, setAiAccuracy] = useState([])
  const [aiLoading, setAiLoading] = useState(true)

  const [peakHours, setPeakHours] = useState([])
  const [peakLoading, setPeakLoading] = useState(true)

  const [owners, setOwners] = useState([])
  const [ownersLoading, setOwnersLoading] = useState(true)

  const [userGrowth, setUserGrowth] = useState([])
  const [userGrowthLoading, setUserGrowthLoading] = useState(true)

  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(true)

  const [activities, setActivities] = useState([])

  const goTo = (page) => {
    if (navigate) {
      navigate(page)
    } else {
      console.warn(`Navigation not attached. Tried: /${page}`)
    }
  }

  // CSV Export
  const exportToCSV = (dataList, fileNamePrefix) => {
    if (!dataList || dataList.length === 0) {
      alert('No data available to export!')
      return
    }
    const headers = Object.keys(dataList[0]).join(',')
    const rows = dataList.map(row =>
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ── 1. KPI Cards ──────────────────────────────────────────────────────
  const fetchKpi = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: payData } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_date', today)
      const totalRevenue = payData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      const { count: activeVehicles } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      const { count: totalCapacity } = await supabase
        .from('parking_slots')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)

      const { count: registeredUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)

      const { count: activeSites } = await supabase
        .from('parking_sites')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      const { data: lpd7 } = await supabase
        .from('ai_logs')
        .select('confidence_score')
        .ilike('log_type', '%entry%')
        .gte('detected_at', new Date(Date.now() - 7 * 86400000).toISOString())
      const ldpAccuracy = lpd7?.length
        ? +(lpd7.reduce((s, r) => s + (r.confidence_score || 0), 0) / lpd7.length * 100).toFixed(1)
        : 0

      const { data: ocr7 } = await supabase
        .from('ai_logs')
        .select('confidence_score')
        .eq('status', 'success')
        .gte('detected_at', new Date(Date.now() - 7 * 86400000).toISOString())
      const ocrAccuracy = ocr7?.length
        ? +(ocr7.reduce((s, r) => s + (r.confidence_score || 0), 0) / ocr7.length * 100).toFixed(1)
        : 0

      const { count: manualOverrides } = await supabase
        .from('ai_logs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'manual')
        .gte('detected_at', today)

      const { count: openDisputes } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'disputed')

      setKpi({
        totalRevenue,
        activeVehicles: activeVehicles || 0,
        totalCapacity: totalCapacity || 0,
        registeredUsers: registeredUsers || 0,
        activeSites: activeSites || 0,
        ldpAccuracy: ldpAccuracy || 0,
        ocrAccuracy: ocrAccuracy || 0,
        manualOverrides: manualOverrides || 0,
        openDisputes: openDisputes || 0,
      })
    } catch (err) {
      console.error('KPI fetch error:', err)
    } finally {
      setKpiLoading(false)
    }
  }

  // ── 2. Revenue fetch ───────────────────────────────────────────────────
  const fetchRevenue = async (range) => {
    setRevenueLoading(true)
    try {
      let fromDate
      const now = new Date()
      if (range === '7D') fromDate = new Date(now - 7 * 86400000)
      else if (range === '30D') fromDate = new Date(now - 30 * 86400000)
      else fromDate = new Date(now.getFullYear(), 0, 1)

      const { data } = await supabase
        .from('payments')
        .select('amount, method, payment_date')
        .gte('payment_date', fromDate.toISOString().split('T')[0])
        .eq('status', 'completed')

      if (!data || data.length === 0) { setRevenueData([]); return }

      const grouped = {}
      data.forEach(p => {
        const d = new Date(p.payment_date)
        let label
        if (range === '7D') label = d.toLocaleDateString('en-US', { weekday: 'short' })
        else if (range === '30D') label = `W${Math.ceil(d.getDate() / 7)}`
        else label = d.toLocaleDateString('en-US', { month: 'short' })

        if (!grouped[label]) grouped[label] = { label, Cash: 0, Card: 0, Wallet: 0 }
        const method = p.method || 'Cash'
        if (method === 'cash' || method === 'Cash') grouped[label].Cash += p.amount || 0
        else if (method === 'card' || method === 'Card') grouped[label].Card += p.amount || 0
        else grouped[label].Wallet += p.amount || 0
      })
      setRevenueData(Object.values(grouped))
    } catch (err) {
      console.error('Revenue fetch error:', err)
    } finally {
      setRevenueLoading(false)
    }
  }

  // ── 3. Slot Occupancy per site ─────────────────────────────────────────
  const fetchSlots = async () => {
    try {
      const { data: sites } = await supabase
        .from('parking_sites')
        .select('id, name, total_slots')
        .eq('status', 'active')

      if (!sites) return

      const result = await Promise.all(sites.map(async (site) => {
        const { data: occupied } = await supabase
          .from('parking_slots')
          .select('id')
          .eq('site_id', site.id)
          .eq('status', 'occupied')

        const total = site.total_slots || 0
        const occ = occupied?.length || 0
        const pct = total > 0 ? Math.round((occ / total) * 100) : 0
        return {
          site: site.name.length > 18 ? site.name.slice(0, 18) + '…' : site.name,
          total, occ, pct,
        }
      }))

      setSlotData(result.slice(0, 6))
    } catch (err) {
      console.error('Slots fetch error:', err)
    } finally {
      setSlotLoading(false)
    }
  }

  // ── 4. AI Accuracy 7-day trend ─────────────────────────────────────────
  const fetchAiAccuracy = async () => {
    try {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const result = []

      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const dayLabel = days[d.getDay()]

        const { data: logs } = await supabase
          .from('ai_logs')
          .select('confidence_score, status')
          .gte('detected_at', dateStr + 'T00:00:00')
          .lte('detected_at', dateStr + 'T23:59:59')

        if (!logs || logs.length === 0) {
          result.push({ day: dayLabel, LPD: 0, OCR: 0 })
          continue
        }

        const allScores = logs.map(l => (l.confidence_score || 0) * 100)
        const avgLPD = allScores.length
          ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
          : 0

        const successLogs = logs.filter(l => l.status === 'success')
        const avgOCR = successLogs.length
          ? +(successLogs.reduce((a, l) => a + (l.confidence_score || 0) * 100, 0) / successLogs.length).toFixed(1)
          : 0

        result.push({ day: dayLabel, LPD: avgLPD, OCR: avgOCR })
      }

      setAiAccuracy(result)
    } catch (err) {
      console.error('AI accuracy fetch error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // ── 5. Peak Hours ──────────────────────────────────────────────────────
  const fetchPeakHours = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('bookings')
        .select('entry_time')
        .eq('booking_date', today)

      const hourMap = {}
      for (let h = 7; h <= 20; h++) {
        const label = h <= 12 ? `${h}am` : `${h - 12}pm`
        hourMap[h] = { hour: label, occ: 0 }
      }

      data?.forEach(b => {
        if (!b.entry_time) return
        const hr = parseInt(b.entry_time.split(':')[0])
        if (hourMap[hr]) hourMap[hr].occ += 1
      })

      const vals = Object.values(hourMap)
      const maxVal = Math.max(...vals.map(v => v.occ), 1)
      setPeakHours(vals.map(v => ({ ...v, occ: Math.round((v.occ / maxVal) * 100) })))
    } catch (err) {
      console.error('Peak hours fetch error:', err)
    } finally {
      setPeakLoading(false)
    }
  }

  // ── 6. Pending Owner Approvals ─────────────────────────────────────────
  const fetchOwners = async () => {
    try {
      const { data } = await supabase
        .from('owner_requests')
        .select('id, name, site_name, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)

      setOwners((data || []).map(o => ({
        id: o.id,
        name: o.name,
        initials: o.name ? o.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'OW',
        site: o.site_name || o.parking_name || '—',
        submitted: timeAgo(o.created_at),
      })))
    } catch (err) {
      console.error('Owners fetch error:', err)
    } finally {
      setOwnersLoading(false)
    }
  }

  const approve = async (id) => {
    await supabase.from('owner_requests').update({ status: 'approved' }).eq('id', id)
    setOwners(prev => prev.filter(o => o.id !== id))
  }

  const reject = async (id) => {
    await supabase.from('owner_requests').update({ status: 'rejected' }).eq('id', id)
    setOwners(prev => prev.filter(o => o.id !== id))
  }

  // ── 7. User Growth ─────────────────────────────────────────────────────
  const fetchUserGrowth = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('created_at')
        .eq('is_active', true)

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      const currentYear = new Date().getFullYear()
      const grouped = {}

      data?.forEach(u => {
        const d = new Date(u.created_at)
        if (d.getFullYear() !== currentYear) return
        const m = months[d.getMonth()]
        grouped[m] = (grouped[m] || 0) + 1
      })

      const currentMonth = new Date().getMonth()
      const result = months.slice(0, currentMonth + 1).map(m => ({
        month: m,
        users: grouped[m] || 0,
      }))

      let cum = 0
      setUserGrowth(result.map(r => { cum += r.users; return { ...r, users: cum } }))
    } catch (err) {
      console.error('User growth fetch error:', err)
    } finally {
      setUserGrowthLoading(false)
    }
  }

  // ── 8. Recent Transactions ─────────────────────────────────────────────
  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('vehicle_no, site_id, method, amount, status')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setTransactions((data || []).map(tx => ({
        plate: tx.vehicle_no || '—',
        site: tx.site_id ? 'Main Parking Site' : '—',
        method: capitalise(tx.method || 'Cash'),
        amount: tx.amount || 0,
        status: tx.status === 'completed' ? 'Paid' : 'Unpaid',
      })))
    } catch (err) {
      console.error('Transactions fetch error:', err)
    } finally {
      setTxLoading(false)
    }
  }

  // ── 9. Live Activity Feed ──────────────────────────────────────────────
  const fetchActivities = async () => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, vehicle_no, status, entry_time, created_at, site_id')
        .order('created_at', { ascending: false })
        .limit(6)

      const colorMap = {
        active: 'bg-blue-500', completed: 'bg-green-500',
        disputed: 'bg-red-500', cancelled: 'bg-yellow-500',
      }
      const msgMap = {
        active: 'Vehicle entered',
        completed: 'Vehicle exited',
        disputed: 'Dispute raised',
        cancelled: 'Booking cancelled',
      }

      setActivities((data || []).map(b => ({
        id: b.id,
        dotClass: colorMap[b.status] || 'bg-gray-400',
        plate: b.vehicle_no || '—',
        site: 'Main Gate Station',
        msg: msgMap[b.status] || b.status,
        time: timeAgo(b.created_at),
      })))
    } catch (e) {
      console.error(e)
    }
  }

  // ── Initial fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchKpi()
    fetchSlots()
    fetchAiAccuracy()
    fetchPeakHours()
    fetchOwners()
    fetchUserGrowth()
    fetchTransactions()
    fetchActivities()
  }, [])

  useEffect(() => {
    fetchRevenue(revenueRange)
  }, [revenueRange])

  // ── Realtime ───────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, async (payload) => {
        const b = payload.new
        const dotMap = { active: 'bg-blue-500', completed: 'bg-green-500', disputed: 'bg-red-500' }
        setPulse(true)
        setTimeout(() => setPulse(false), 700)
        setActivities(prev => [{
          id: b.id,
          dotClass: dotMap[b.status] || 'bg-gray-400',
          plate: b.vehicle_no || '—',
          site: 'Main Gate Hub',
          msg: 'Vehicle entered',
          time: 'just now',
        }, ...prev.slice(0, 5)])
        fetchKpi()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchKpi)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ── Computed values ────────────────────────────────────────────────────
  const lastEntry = revenueData.length > 0 ? revenueData[revenueData.length - 1] : { Cash: 0, Card: 0, Wallet: 0 }
  const todayRevenue = lastEntry.Cash + lastEntry.Card + lastEntry.Wallet
  const cashPct = todayRevenue > 0 ? Math.round(lastEntry.Cash / todayRevenue * 100) : 0
  const cardPct = todayRevenue > 0 ? Math.round(lastEntry.Card / todayRevenue * 100) : 0
  const walletPct = todayRevenue > 0 ? 100 - cashPct - cardPct : 0

  const ldpAvg = aiAccuracy.length
    ? +(aiAccuracy.reduce((s, d) => s + d.LPD, 0) / (aiAccuracy.filter(d => d.LPD > 0).length || 1)).toFixed(1)
    : 0
  const ocrAvg = aiAccuracy.length
    ? +(aiAccuracy.reduce((s, d) => s + d.OCR, 0) / (aiAccuracy.filter(d => d.OCR > 0).length || 1)).toFixed(1)
    : 0

  const userGrowthFirst = userGrowth[0]?.users || 0
  const userGrowthLast = userGrowth[userGrowth.length - 1]?.users || 0
  const userGrowthFirstMonth = userGrowth[0]?.month || '—'
  const userGrowthLastMonth = userGrowth[userGrowth.length - 1]?.month || '—'

  const maxUserGrowth = Math.max(...userGrowth.map(u => u.users), 1)

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => goTo('parking-sites')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-4 h-4" /> Manage Sites
          </button>
          <button
            onClick={() => exportToCSV(revenueData, 'revenue_report')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* ── Row 1: Primary KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={CreditCard} iconBg="bg-green-100" iconColor="text-green-600"
          label="Total Revenue (Today)"
          value={`Rs. ${kpi.totalRevenue.toLocaleString()}`}
          sub="From completed payments"
          loading={kpiLoading}
        />
        <StatCard
          icon={Car} iconBg="bg-orange-100" iconColor="text-orange-600"
          label="Active Vehicles"
          value={`${kpi.activeVehicles} / ${kpi.totalCapacity}`}
          sub="Currently parked"
          loading={kpiLoading}
        />
        <StatCard
          icon={Users} iconBg="bg-purple-100" iconColor="text-purple-600"
          label="Registered Users"
          value={kpi.registeredUsers.toLocaleString()}
          sub="Active accounts"
          loading={kpiLoading}
        />
        <StatCard
          icon={MapPin} iconBg="bg-blue-100" iconColor="text-blue-600"
          label="Active Sites"
          value={kpi.activeSites}
          sub="Sites currently online"
          loading={kpiLoading}
        />
      </div>

      {/* ── Row 2: Secondary KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Bot} iconBg="bg-violet-100" iconColor="text-violet-600"
          label="LPD Accuracy"
          value={`${kpi.ldpAccuracy}%`}
          sub="License plate detection"
          loading={kpiLoading}
        />
        <StatCard
          icon={Activity} iconBg="bg-emerald-100" iconColor="text-emerald-600"
          label="OCR Accuracy"
          value={`${kpi.ocrAccuracy}%`}
          sub="Plate text recognition"
          loading={kpiLoading}
        />
        <StatCard
          icon={RotateCcw} iconBg="bg-yellow-100" iconColor="text-yellow-600"
          label="Manual Overrides"
          value={kpi.manualOverrides}
          sub="Fallback entries today"
          loading={kpiLoading}
        />
        <StatCard
          icon={MessageSquareWarning} iconBg="bg-red-100" iconColor="text-red-600"
          label="Open Disputes"
          value={kpi.openDisputes}
          sub="Requires resolution"
          loading={kpiLoading}
        />
      </div>

      {/* ── Row 3: Revenue Overview + Live Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Revenue Overview */}
        <div className="lg:col-span-3">
          <Section
            title="Revenue Overview"
            subtitle="Cash, Card & Wallet breakdown"
            action={<RangeToggle value={revenueRange} onChange={setRevenueRange} />}
          >
            {revenueLoading ? (
              <Spinner />
            ) : revenueData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No payment data for this period</p>
              </div>
            ) : (
              <>
                {/* Simple bar chart using divs */}
                <div className="flex items-end gap-2 h-40 mb-4">
                  {revenueData.map((d, i) => {
                    const total = d.Cash + d.Card + d.Wallet
                    const maxTotal = Math.max(...revenueData.map(x => x.Cash + x.Card + x.Wallet), 1)
                    const heightPct = Math.round((total / maxTotal) * 100)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gray-100 rounded-t flex flex-col justify-end" style={{ height: 120 }}>
                          <div
                            className="w-full rounded-t transition-all duration-500"
                            style={{
                              height: `${heightPct}%`,
                              background: 'linear-gradient(to top, #2563eb, #60a5fa)',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{d.label}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Payment method breakdown pills */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  {[
                    { label: 'Cash',   val: lastEntry.Cash,   pct: cashPct,   color: 'text-gray-800',   bg: 'bg-gray-50',    bar: 'bg-gray-700' },
                    { label: 'Card',   val: lastEntry.Card,   pct: cardPct,   color: 'text-violet-700', bg: 'bg-violet-50',  bar: 'bg-violet-500' },
                    { label: 'Wallet', val: lastEntry.Wallet, pct: walletPct, color: 'text-blue-700',   bg: 'bg-blue-50',    bar: 'bg-blue-500' },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} rounded-lg p-3`}>
                      <p className={`text-lg font-bold ${m.color}`}>{m.pct}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                      <p className="text-xs text-gray-400">Rs. {m.val.toLocaleString()}</p>
                      <div className="mt-2 bg-gray-200 rounded-full h-1">
                        <div className={`${m.bar} h-1 rounded-full transition-all`} style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>
        </div>

        {/* Live Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Live Activity</h3>
              <p className="text-sm text-gray-500 mt-0.5">Real-time events</p>
            </div>
            <span className={`flex items-center gap-2 text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full transition-all ${pulse ? 'scale-110' : ''}`}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No recent activity</p>
              </div>
            ) : activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.dotClass}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-mono">{a.plate}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.msg} · {a.site}</p>
                </div>
                <span className="text-xs text-gray-300 flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => goTo('system-logs')}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View all logs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 4: Slot Occupancy Per Site ── */}
      <Section
        title="Slot Occupancy Per Site"
        subtitle="Current occupancy percentage across all active locations"
        action={
          <button
            onClick={() => goTo('parking-sites')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Manage sites <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {slotLoading ? (
          <Spinner />
        ) : slotData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No active sites found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slotData.map((s, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-40 flex-shrink-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.site}</p>
                  <p className="text-xs text-gray-400">{s.occ} / {s.total} slots</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${
                          s.pct > 85 ? 'bg-red-500' : s.pct > 60 ? 'bg-yellow-400' : 'bg-green-500'
                        }`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold w-10 text-right ${
                      s.pct > 85 ? 'text-red-600' : s.pct > 60 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {s.pct}%
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                  s.pct > 85
                    ? 'bg-red-100 text-red-700'
                    : s.pct > 60
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {s.pct > 85 ? 'Full' : s.pct > 60 ? 'Busy' : 'Available'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'Total Capacity', val: kpi.totalCapacity,                       bg: 'bg-gray-50',    color: 'text-gray-900' },
            { label: 'Occupied Slots', val: kpi.activeVehicles,                      bg: 'bg-orange-50',  color: 'text-orange-700' },
            { label: 'Available Slots', val: kpi.totalCapacity - kpi.activeVehicles, bg: 'bg-green-50',   color: 'text-green-700' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Row 5: Peak Hours + AI Accuracy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Peak Hours — colored hour blocks */}
        <Section
          title="Peak Hours Today"
          subtitle="Booking occupancy distribution by hour"
          action={
            <button
              onClick={() => goTo('peak-hours')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Full forecast <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {peakLoading ? (
            <Spinner />
          ) : (
            <>
              <div className="flex items-end gap-1 h-32">
                {peakHours.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gray-100 rounded-t flex flex-col justify-end" style={{ height: 100 }}>
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${peakColorClass(h.occ)}`}
                        style={{ height: `${Math.max(h.occ, 4)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400" style={{ fontSize: 9 }}>{h.hour}</span>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                {[
                  { label: 'Peak (>85%)',   color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50' },
                  { label: 'High (70–85%)', color: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
                  { label: 'Normal (<70%)', color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50' },
                ].map(m => (
                  <span key={m.label} className={`flex items-center gap-1.5 text-xs ${m.text} ${m.bg} px-2.5 py-1 rounded-full`}>
                    <span className={`w-2 h-2 rounded-full ${m.color}`} />
                    {m.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Section>

        {/* AI Model Accuracy */}
        <Section
          title="AI Model Accuracy"
          subtitle="LPD & OCR performance — last 7 days"
          action={
            <button
              onClick={() => goTo('ai-monitor')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Full report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {aiLoading ? (
            <Spinner />
          ) : (
            <>
              {/* Avg accuracy cards */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{ldpAvg}%</p>
                  <p className="text-xs text-gray-500 mt-1">LPD Avg (7 days)</p>
                  <div className="mt-2 bg-blue-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(ldpAvg, 100)}%` }} />
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{ocrAvg}%</p>
                  <p className="text-xs text-gray-500 mt-1">OCR Avg (7 days)</p>
                  <div className="mt-2 bg-orange-200 rounded-full h-1.5">
                    <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(ocrAvg, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* 7-day daily breakdown */}
              <div className="space-y-2">
                {aiAccuracy.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="w-8 text-gray-400 font-medium">{d.day}</span>
                    <div className="flex-1 flex gap-1 items-center">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${d.LPD}%` }} />
                      </div>
                      <span className="w-8 text-right text-blue-600 font-medium">{d.LPD}%</span>
                    </div>
                    <div className="flex-1 flex gap-1 items-center">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${d.OCR}%` }} />
                      </div>
                      <span className="w-8 text-right text-orange-600 font-medium">{d.OCR}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> LPD
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-orange-400" /> OCR
                </span>
              </div>
            </>
          )}
        </Section>
      </div>

      {/* ── Row 6: Pending Owner Approvals + User Growth ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Pending Owner Approvals */}
        <div className="lg:col-span-3">
          <Section
            title="Pending Owner Approvals"
            subtitle="New parking owner registration requests"
            action={
              <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                {owners.length} pending
              </span>
            }
          >
            {ownersLoading ? (
              <Spinner />
            ) : owners.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No pending approvals</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Owner</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Site</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Submitted</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {owners.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {o.initials}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{o.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{o.site}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{o.submitted}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => approve(o.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => reject(o.id)}
                              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* User Growth */}
        <div className="lg:col-span-2">
          <Section
            title="User Growth"
            subtitle="Registered users — monthly trend"
            action={
              <button
                onClick={() => goTo('user-accounts')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                All users <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {userGrowthLoading ? (
              <Spinner />
            ) : (
              <>
                {/* Bar chart */}
                <div className="flex items-end gap-1.5 h-28 mb-4">
                  {userGrowth.map((u, i) => {
                    const h = Math.round((u.users / maxUserGrowth) * 100)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gray-100 rounded-t flex flex-col justify-end" style={{ height: 80 }}>
                          <div
                            className="w-full rounded-t bg-violet-500 transition-all duration-500"
                            style={{ height: `${Math.max(h, 4)}%` }}
                          />
                        </div>
                        <span className="text-gray-400" style={{ fontSize: 9 }}>{u.month}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-gray-900">{userGrowthFirst}</p>
                    <p className="text-xs text-gray-400 mt-1">{userGrowthFirstMonth} (start)</p>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3">
                    <p className="text-xl font-bold text-violet-700">{userGrowthLast.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">{userGrowthLastMonth} (current)</p>
                  </div>
                </div>
              </>
            )}
          </Section>
        </div>
      </div>

      {/* ── Row 7: Recent Transactions ── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <p className="text-sm text-gray-500 mt-0.5">Latest payments across all parking sites</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportToCSV(transactions, 'transactions_log')}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => goTo('payments')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors px-2"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {txLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Plate No.</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Site</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Method</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No transactions found</td>
                  </tr>
                ) : transactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-900">{tx.plate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.site}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        tx.method === 'Cash'
                          ? 'bg-green-100 text-green-700'
                          : tx.method === 'Card'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {tx.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">Rs. {tx.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tx.status === 'Paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Row 8: System Status Pills ── */}
      <Section
        title="System Status"
        subtitle="Live health check across all services"
        action={
          <button
            onClick={() => goTo('system-logs')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            View logs <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'AI Detection',     val: `${kpi.ldpAccuracy}% acc.`,           status: kpi.ldpAccuracy > 80 ? 'good' : 'warning', icon: Bot },
            { label: 'Overstay Alerts',  val: `${kpi.openDisputes} active`,          status: kpi.openDisputes > 0 ? 'warning' : 'good',  icon: AlertTriangle },
            { label: 'Manual Overrides', val: `${kpi.manualOverrides} today`,        status: 'info',    icon: Clock },
            { label: 'Sites Online',     val: `${kpi.activeSites} online`,           status: 'good',    icon: MapPin },
            { label: 'Open Disputes',    val: `${kpi.openDisputes} pending`,         status: kpi.openDisputes > 0 ? 'danger' : 'good',   icon: MessageSquareWarning },
            { label: 'Registered Users', val: kpi.registeredUsers.toLocaleString(),  status: 'good',    icon: Users },
            { label: 'System Security',  val: 'All good',                            status: 'good',    icon: ShieldCheck },
            { label: 'Pending Owners',   val: `${owners.length} requests`,           status: owners.length > 0 ? 'warning' : 'good', icon: UserCheck },
          ].map((s, i) => {
            const IconComp = s.icon
            const statusConfig = {
              good:    { iconBg: 'bg-green-100',  iconColor: 'text-green-600',  valColor: 'text-green-700' },
              warning: { iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', valColor: 'text-yellow-700' },
              danger:  { iconBg: 'bg-red-100',    iconColor: 'text-red-600',    valColor: 'text-red-700' },
              info:    { iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   valColor: 'text-blue-700' },
            }
            const sc = statusConfig[s.status]
            return (
              <div key={i} className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
                <div className={`w-9 h-9 rounded-lg ${sc.iconBg} flex items-center justify-center`}>
                  <IconComp className={`w-4 h-4 ${sc.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${sc.valColor}`}>{s.val}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

    </div>
  )
}