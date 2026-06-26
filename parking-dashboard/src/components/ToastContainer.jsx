import { useNotifications } from '../utils/NotificationContext'
import { X, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react'

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
}

const colorMap = {
  info: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e40af',
    icon: '#3b82f6',
  },
  success: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#166534',
    icon: '#22c55e',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#92400e',
    icon: '#f59e0b',
  },
  error: {
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#991b1b',
    icon: '#ef4444',
  },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useNotifications()

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px',
    }}>
      {toasts.map(toast => {
        const Icon = iconMap[toast.type] || Bell
        const colors = colorMap[toast.type] || colorMap.info

        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 18px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)',
              animation: 'slideInRight 0.35s cubic-bezier(0.21, 1.02, 0.73, 1)',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: colors.icon + '18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={18} style={{ color: colors.icon }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: colors.text,
                lineHeight: 1.4,
              }}>
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.text,
                opacity: 0.5,
                transition: 'opacity 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.target.style.opacity = 1}
              onMouseLeave={e => e.target.style.opacity = 0.5}
            >
              <X size={16} />
            </button>
          </div>
        )
      })}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
