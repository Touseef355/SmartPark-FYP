import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../../api/axios'

export default function RevenueChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const response = await api.get('/bookings/')
        
        // Bookings se hourly revenue nikalna
        const hourlyMap = {}

        response.data.forEach((booking) => {
          if (booking.estimated_amount && booking.entry_time) {
            const hour = new Date(booking.entry_time).getHours()
            const label = `${hour}:00`
            if (!hourlyMap[label]) {
              hourlyMap[label] = 0
            }
            hourlyMap[label] += parseFloat(booking.estimated_amount)
          }
        })

        // Object to array convert karna
        const chartData = Object.entries(hourlyMap)
          .map(([time, revenue]) => ({ time, revenue }))
          .sort((a, b) => parseInt(a.time) - parseInt(b.time))

        setData(chartData)
      } catch (error) {
        console.error('Error fetching revenue:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRevenue()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Revenue Overview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Hourly earnings today</p>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          Loading chart...
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No revenue data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barSize={28}>
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
              tickFormatter={(v) => `₨${v}`}
            />
            <Tooltip
              formatter={(value) => [`Rs. ${value}`, 'Revenue']}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="revenue" fill="#185FA5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}