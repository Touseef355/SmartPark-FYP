import { motion } from 'framer-motion'

const colorMap = {
  blue:  { icon: 'bg-blue-50 text-blue-600'   },
  green: { icon: 'bg-green-50 text-green-600' },
  amber: { icon: 'bg-amber-50 text-amber-600' },
  red:   { icon: 'bg-red-50 text-red-600'     },
}

export default function StatCard({ title, value, subtitle, icon: Icon, color, delay }) {
  const c = colorMap[color] || colorMap.blue

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm"
    >
      {/* Left — text */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        <p className="text-2xl font-bold text-foreground mt-1 leading-tight">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Right — icon */}
      <div className={`w-9 h-9 rounded-lg ${c.icon} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6" strokeWidth={1.75} />
      </div>

    </motion.div>
  )
}