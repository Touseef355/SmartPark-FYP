import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Car, Truck, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import api from '../../api/axios'

const typeIcons = {
  car: Car,
  truck: Truck,
}

export default function VehicleLogTable() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await api.get('/ai/logs/')
        setLogs(response.data)
      } catch (error) {
        console.error('Error fetching logs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Vehicle Log</h3>
        <span className="text-xs text-muted-foreground">Today</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No vehicle logs yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gate</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Confidence</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Log Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 8).map((log) => {
                const TypeIcon = typeIcons[log.vehicle_type] || Car
                return (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-secondary">
                          <TypeIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-mono font-semibold text-foreground">
                          {log.detected_plate_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground capitalize">
                      {log.vehicle_type || 'car'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {log.entry_exit_point}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {new Date(log.detected_at).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {(log.confidence_score * 100).toFixed(0)}%
                    </td>
                    <td className="px-5 py-3.5">
                      {log.log_type === 'entry' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                          <ArrowDownLeft className="w-3 h-3" />
                          Entry
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">
                          <ArrowUpRight className="w-3 h-3" />
                          Exit
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {log.status}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}