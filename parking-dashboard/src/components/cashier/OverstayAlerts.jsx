import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock } from 'lucide-react'
import api from '../../api/axios'

export default function OverstayAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOverstay() {
      try {
        const response = await api.get('/bookings/')
        const now = new Date()

        // Active bookings jinka exit time guzar gaya
        const overstay = response.data.filter((b) => {
          if (b.status !== 'active') return false
          const exitTime = b.exit_time ? new Date(b.exit_time) : null
          return exitTime && now > exitTime
        })

        setAlerts(overstay)
      } catch (error) {
        console.error('Error fetching overstay:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOverstay()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold text-foreground">Overstay Alerts</h3>
        <span className="ml-auto text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
          {alerts.length} active
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No overstay alerts</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-xl"
            >
              <div>
                <p className="text-sm font-semibold text-foreground font-mono">
                  {b.vehicle}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Slot {b.parking_slot} — exit was {new Date(b.exit_time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}