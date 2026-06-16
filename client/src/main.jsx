import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// React Router v7 future flags
const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './store/queryClient'
import App from './App'
import { LocaleProvider } from './i18n/LocaleContext'
import { toast } from 'react-hot-toast'
import './index.css'

import { cacheApiGet, getCachedApiGet, enqueueWrite, queueLength, processQueue } from './utils/offlineQueue'

const origFetch = window.fetch
window.fetch = async (url, options = {}) => {
  const isApi = typeof url === 'string' && url.startsWith('/api/')
  const isSkipped = typeof url === 'string' && (url.startsWith('/api/auth/') || url === '/api/health' || url === '/api/health/db' || url === '/api/push/subscribe')
  const isGet = !options.method || options.method === 'GET'
  const isWrite = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)

  if (isApi && !isSkipped) {
    const token = localStorage.getItem('lifeos-token')
    if (token) {
      options = { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } }
    }
  }

  try {
    const res = await origFetch(url, options)
    if (res.status === 401 && isApi && !isSkipped) {
      localStorage.removeItem('lifeos-token')
      if (window.location.pathname !== '/login') window.location.href = '/login'
      return res
    }
    if (isApi && isGet && res.ok && !isSkipped) {
      res.clone().text().then((text) => {
        try { cacheApiGet(url, JSON.parse(text)) } catch {}
      }).catch(() => {})
    }
    return res
  } catch (err) {
    const isNetworkErr = !navigator.onLine || err instanceof TypeError || err?.message?.includes('Failed to fetch')

    if (isNetworkErr && isApi && isGet && !isSkipped) {
      const cached = await getCachedApiGet(url)
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Offline-Cache': 'true' },
        })
      }
    }

    if (isNetworkErr && isApi && isWrite && !isSkipped) {
      await enqueueWrite(url, options)
    }

    throw err
  }
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[LifeOS] Unhandled promise rejection:', event.reason)
  if (event.reason?.message !== 'Failed to fetch' && !event.reason?.message?.includes('NetworkError')) {
    toast.error('An unexpected error occurred. Check console for details.', { id: 'unhandled-error' })
  }
})

window.onerror = (msg, url, line, col, error) => {
  console.error('[LifeOS] Global error:', { msg, url, line, col, error })
}

window.addEventListener('online', () => {
  processQueue((count) => {
    if (count > 0) toast.success(`${count} pending change(s) synced`, { id: 'queue-synced' })
  })
})

// queryClient imported from ./store/queryClient

// Start auto-theme check
import { startAutoTheme } from './store/themeStore'
startAutoTheme()

// Expose for UI indicators
window.__offlineQueue = { queueLength }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={routerFuture}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider><App /></LocaleProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
