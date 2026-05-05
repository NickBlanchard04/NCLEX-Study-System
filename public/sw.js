const CACHE_VERSION = 'nclex-study-system-v1'

const getBasePath = () => new URL(self.registration.scope).pathname

const appUrl = (path = '') => {
  const basePath = getBasePath()
  return `${basePath}${path}`.replace(/\/{2,}/g, '/')
}

const APP_SHELL = () => [
  appUrl(),
  appUrl('index.html'),
  appUrl('offline.html'),
  appUrl('manifest.webmanifest'),
  appUrl('favicon.svg'),
  appUrl('app-icon.svg'),
  appUrl('maskable-icon.svg'),
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL()))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

const isSupabaseRequest = (url) => url.hostname.includes('supabase.co')

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || isSupabaseRequest(url)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(appUrl('index.html'), clone))
          return response
        })
        .catch(async () => {
          const cachedApp = await caches.match(appUrl('index.html'))
          return cachedApp ?? caches.match(appUrl('offline.html'))
        }),
    )
    return
  }

  if (['style', 'script', 'worker', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => cached)

        return cached ?? networkFetch
      }),
    )
  }
})
