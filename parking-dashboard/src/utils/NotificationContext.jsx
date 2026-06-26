import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import API from '../services/api'
import { getUser, getToken } from './auth'

const NotificationContext = createContext()

const POLL_INTERVAL = 15000 // Poll every 15 seconds

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState({
    totalPending: 0,
    pendingOwner: 0,
    pendingGeneral: 0,
    newSince: 0,
  })
  const [toasts, setToasts] = useState([])
  const lastCheckedRef = useRef(null)
  const prevCountRef = useRef(null)
  const toastIdRef = useRef(0)

  const { role } = getUser()
  const token = getToken()

  const fetchNotificationCount = useCallback(async () => {
    if (role !== 'admin' || !token) return

    try {
      let url = 'auth/admin/notifications/count/'
      if (lastCheckedRef.current) {
        url += `?since=${lastCheckedRef.current}`
      }

      const res = await API.get(url)
      const data = res.data

      const newNotif = {
        totalPending: data.total_pending,
        pendingOwner: data.pending_owner_registrations,
        pendingGeneral: data.pending_general_queries,
        newSince: data.new_since,
      }

      // Show toast if count increased
      if (prevCountRef.current !== null && data.total_pending > prevCountRef.current) {
        const diff = data.total_pending - prevCountRef.current
        addToast(
          `${diff} new ${diff === 1 ? 'query' : 'queries'} received!`,
          'info'
        )
      }

      prevCountRef.current = data.total_pending
      setNotifications(newNotif)

      // Update lastChecked timestamp
      lastCheckedRef.current = new Date().toISOString()
    } catch (err) {
      console.error('Failed to fetch notification count:', err)
    }
  }, [role, token])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, message, type }])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const markAsSeen = useCallback(() => {
    // Reset the "new since" counter — user has seen the queries page
    setNotifications(prev => ({ ...prev, newSince: 0 }))
  }, [])

  useEffect(() => {
    if (role !== 'admin' || !token) return

    // Initial fetch
    fetchNotificationCount()

    // Polling
    const interval = setInterval(fetchNotificationCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchNotificationCount, role, token])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        addToast,
        removeToast,
        markAsSeen,
        refetch: fetchNotificationCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
