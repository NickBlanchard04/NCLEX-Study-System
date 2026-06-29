export function disableServiceWorkerInstallSupport() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  window.addEventListener('load', () => {
    void Promise.all([
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      ),
      'caches' in window
        ? caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key.startsWith('nurse-command')).map((key) => caches.delete(key))),
          )
        : Promise.resolve(),
    ]).catch((error) => {
      console.warn('Nurse Command install cleanup failed.', error)
    })
  })
}
