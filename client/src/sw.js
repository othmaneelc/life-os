import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

const CACHE_VERSION = 'v1'
const CACHE_PREFIX = 'life-os-'

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await clients.claim()
    const keys = await caches.keys()
    await Promise.all(keys
      .filter(k => k.startsWith(CACHE_PREFIX) && !k.endsWith(CACHE_VERSION))
      .map(k => caches.delete(k))
    )
  })())
})
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/') && url.pathname !== '/api/health' && url.pathname !== '/api/health/db' && !url.pathname.startsWith('/api/push/') && !url.pathname.startsWith('/api/ai/') && !url.pathname.startsWith('/api/ocr/'),
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}api-${CACHE_VERSION}`,
    plugins: [
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
)

registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font' || request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
)

self.addEventListener('push', event => {
  if (!event.data) return
  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/images/agency/logo.png',
      badge: '/images/agency/logo.png',
      tag: data.tag || 'default',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: data.type === 'prayer',
    }
    event.waitUntil(self.registration.showNotification(data.title || 'Life OS', options))
  } catch (e) { console.error('[SW] Push error:', e) }
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const urlToOpen = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const matching = windowClients.find(c => c.url.startsWith(urlToOpen))
      if (matching) return matching.focus()
      return clients.openWindow(urlToOpen)
    }).catch(() => clients.openWindow(urlToOpen))
  )
})
