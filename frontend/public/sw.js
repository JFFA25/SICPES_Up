// Service worker de SICPES.
// Importante: la app usa sesión por cookies, así que NUNCA se guardan en caché
// las respuestas de /api (datos privados del usuario).
const CACHE = 'sicpes-v1'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname === '/version.json') return

  // Navegación: red primero; sin conexión, el shell guardado
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')))
    return
  }

  // Recursos estáticos (JS/CSS/imágenes con hash): caché primero
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
    )
  )
})

// ---------- Notificaciones push ----------
// El backend manda un JSON: { title, body, url, tag }
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'SICPES', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag, // avisos del mismo tipo se reemplazan en vez de apilarse
      data: { url: data.url || '/dashboard' },
    })
  )
})

// Al tocar la notificación: enfocar la app si ya está abierta, o abrirla en la pantalla indicada
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
