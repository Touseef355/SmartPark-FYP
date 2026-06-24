import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Car, Lock, Mail, AlertCircle } from 'lucide-react'

const BACKEND = 'http://127.0.0.1:8000'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed. Check your credentials.')
        setLoading(false)
        return
      }

      // Save to localStorage
      localStorage.setItem('access_token',  data.tokens?.access  || '')
      localStorage.setItem('refresh_token', data.tokens?.refresh || '')
      localStorage.setItem('user_role',     data.role    || '')
      localStorage.setItem('user_name',     data.name    || '')
      localStorage.setItem('site_id',       data.site_id || '')
      localStorage.setItem('user_id',       data.user_id || '')
      localStorage.setItem('user_email',    form.email)

      // Redirect by role
      const role = (data.role || '').toLowerCase()
      if (role === 'admin')               navigate('/admin/dashboard')
      else if (role === 'parking_owner')  navigate('/owner/dashboard')
      else if (role === 'entry_cashier')  navigate('/cashier/entry')
      else if (role === 'exit_cashier')   navigate('/cashier/exit')
      else {
        setError('Unknown role: ' + data.role)
        setLoading(false)
      }
    } catch (err) {
      setError('Network error. Make sure the backend is running.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/40 mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SmartPark</h1>
          <p className="text-slate-400 mt-1 text-sm">Intelligent Parking Management System</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="admin@smartpark.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-center text-xs text-slate-500">
              Smart Parking System — FYP Project 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
