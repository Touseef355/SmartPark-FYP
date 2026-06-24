import { useEffect, useState } from 'react'
import { RefreshCw, ParkingCircle, Car, Crown, Accessibility } from 'lucide-react'
import { getUser } from '../../utils/auth'
import api from '../../api/axios'

const TYPE_CONFIG = {
  normal:   { label: 'Normal',   icon: Car,           color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  vip:      { label: 'VIP',      icon: Crown,         color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  disabled: { label: 'Disabled', icon: Accessibility, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
}

function SlotCard({ slot }) {
  const type = TYPE_CONFIG[slot.slot_type] ?? TYPE_CONFIG.normal
  const Icon = type.icon

  const stateStyle = slot.is_occupied
    ? 'bg-red-50 border-red-300 text-red-700'
    : slot.is_reserved
    ? 'bg-amber-50 border-amber-300 text-amber-700'
    : `${type.bg} ${type.border} ${type.color}`

  return (
    <div className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1.5 transition-all ${stateStyle}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm font-bold font-mono">{slot.slot_number}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider">
        {slot.is_occupied ? 'Occupied' : slot.is_reserved ? 'Reserved' : 'Free'}
      </span>
    </div>
  )
}

export default function Slots() {
  const [slots, setSlots]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const { site_id } = getUser()

  async function fetchSlots() {
    if (!site_id) return
    setLoading(true)
    try {
      const res = await api.get(`/parking/sites/${site_id}/slots/`)
      setSlots(res.data)
    } catch (err) {
      console.error('Error fetching slots:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSlots() }, [])

  const filtered = slots.filter(s => {
    const matchType  = typeFilter === 'all'  || s.slot_type === typeFilter
    const matchState = stateFilter === 'all'
      || (stateFilter === 'free'     && !s.is_occupied && !s.is_reserved)
      || (stateFilter === 'occupied' && s.is_occupied)
      || (stateFilter === 'reserved' && s.is_reserved)
    return matchType && matchState
  })

  const total     = slots.length
  const occupied  = slots.filter(s => s.is_occupied).length
  const reserved  = slots.filter(s => s.is_reserved && !s.is_occupied).length
  const free      = total - occupied - reserved

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Parking Slots</h2>
          <p className="text-sm text-muted-foreground mt-1">Live occupancy view of all slots at your site</p>
        </div>
        <button
          onClick={fetchSlots}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Slots',    value: total,    color: 'text-foreground',  bg: 'bg-secondary' },
          { label: 'Free',           value: free,     color: 'text-green-600',   bg: 'bg-green-50' },
          { label: 'Occupied',       value: occupied, color: 'text-red-600',     bg: 'bg-red-50' },
          { label: 'Reserved',       value: reserved, color: 'text-amber-600',   bg: 'bg-amber-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border border-border rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs text-muted-foreground font-medium">Legend:</span>
        {[
          { color: 'bg-blue-100 border-blue-300',   label: 'Normal — Free' },
          { color: 'bg-amber-100 border-amber-300',  label: 'Reserved' },
          { color: 'bg-red-100 border-red-300',      label: 'Occupied' },
          { color: 'bg-amber-100 border-amber-300',  label: 'VIP' },
          { color: 'bg-purple-100 border-purple-300',label: 'Disabled' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded border-2 ${color}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5 bg-secondary rounded-lg p-1">
          {['all', 'normal', 'vip', 'disabled'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                typeFilter === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 bg-secondary rounded-lg p-1">
          {[
            { key: 'all',      label: 'All States' },
            { key: 'free',     label: 'Free' },
            { key: 'occupied', label: 'Occupied' },
            { key: 'reserved', label: 'Reserved' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStateFilter(key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                stateFilter === key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Slot Grid */}
      <div className="bg-card border border-border rounded-xl p-5">
        {loading ? (
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-12 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <ParkingCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No slots match current filters
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-12 gap-3">
            {filtered.map(slot => (
              <SlotCard key={slot.id ?? slot.slot_number} slot={slot} />
            ))}
          </div>
        )}
        {!loading && (
          <p className="text-xs text-muted-foreground mt-4 text-right">
            Showing {filtered.length} of {total} slots
          </p>
        )}
      </div>
    </div>
  )
}