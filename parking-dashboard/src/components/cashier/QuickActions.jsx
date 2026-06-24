import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, PenLine, ParkingCircle } from 'lucide-react'

const actions = [
  { label: 'Entry Gate',   icon: ArrowDownLeft, path: '/cashier/entry',  color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'     },
  { label: 'Exit Gate',    icon: ArrowUpRight,  path: '/cashier/exit',   color: 'bg-green-50 text-green-600 hover:bg-green-100'   },
  { label: 'Manual Entry', icon: PenLine,       path: '/cashier/entry',  color: 'bg-amber-50 text-amber-600 hover:bg-amber-100'   },
  { label: 'View Slots',   icon: ParkingCircle, path: '/cashier/slots',  color: 'bg-purple-50 text-purple-600 hover:bg-purple-100'},
]

export default function QuickActions() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon, path, color }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors cursor-pointer ${color}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}