import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Save tokens from URL params (landing page redirect) into localStorage
const params = new URLSearchParams(window.location.search)
const accessToken = params.get('access_token')

if (accessToken) {
  localStorage.setItem('access_token',  accessToken)
  localStorage.setItem('refresh_token', params.get('refresh_token') || '')
  localStorage.setItem('user_role',     params.get('user_role') || '')
  localStorage.setItem('user_name',     params.get('user_name') || '')
  localStorage.setItem('site_id',       params.get('site_id') || '')
  localStorage.setItem('user_email',    params.get('user_email') || '')
  localStorage.setItem('user_id',       params.get('user_id') || '')
  // Clean tokens from URL address bar
  window.history.replaceState({}, '', window.location.pathname)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
