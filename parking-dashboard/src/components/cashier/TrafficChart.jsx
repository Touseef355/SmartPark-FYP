import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import api from '../../api/axios'

export default function TrafficChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTraffic() {
      try {
        const response = await api.get('/ai/logs/')
        const logs = response.data

        // Hourly traffic nikalna
        const hourlyMap = {}

        logs.forEach((log) => {
          const hour = new Date(log.detected_at).getHours()
          const label = `${hour}:00`
          if (!hourlyMap[label]) {
            hourlyMap[label] = { time: label, entry: 0, exit: 0 }
          }
          if (log.log_type === 'entry') hourlyMap[label].entry += 1
          else hourlyMap[label].exit += 1
        })

        const chartData = Object.values(hourlyMap).sort(
          (a, b) => parseInt(a.time) - parseInt(b.time)
        )

        setData(chartData)
      } catch (error) {
        console.error('Error fetching traffic:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTraffic()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Hourly Traffic</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Vehicle entries and exits today</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            Entry
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
            Exit
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          Loading chart...
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No traffic data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="entryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#185FA5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#185FA5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="entry"
              stroke="#185FA5"
              strokeWidth={2}
              fill="url(#entryGrad)"
            />
            <Area
              type="monotone"
              dataKey="exit"
              stroke="#1D9E75"
              strokeWidth={2}
              fill="url(#exitGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}