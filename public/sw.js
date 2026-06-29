const clearInstallState = async () => {
  const cacheKeys = await caches.keys()
  await Promise.all(cacheKeys.filter((key) => key.startsWith('nurse-command')).map((key) => caches.delete(key)))
  await self.registration.unregister()
}

self.addEventListener('install', (event) => {
  event.waitUntil(clearInstallState().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clearInstallState().then(() => self.clients.claim()))
})
