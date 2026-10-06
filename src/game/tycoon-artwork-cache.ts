import manifest from './tycoon-artwork-manifest.json'

const CACHE = 'tycoon-artwork-content-v1'
const urls = manifest as Record<string, string>

/** Cache only public artwork, never saves, HTML, auth, or gameplay state.
 * Hashed URLs invalidate changed artwork. Storage denial/quota/network failure
 * falls back to Phaser's normal loader. Six workers avoid flooding mobile radios. */
export async function prepareWardArtwork(signal: AbortSignal) {
  const resolved = new Map<string, string>(), blobs: string[] = []
  let cache: Cache | undefined
  try { if ('caches' in window) cache = await caches.open(CACHE) } catch { /* private browsing */ }
  const queue = Object.entries(urls)
  let hits = 0
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length && !signal.aborted) {
      const [name, url] = queue.shift()!
      try {
        let response: Response | undefined
        try { response = await cache?.match(url) } catch { /* storage unavailable */ }
        if (response) hits++
        else {
          response = await fetch(url, { signal })
          if (!response.ok || !/image\/|application\/json/.test(response.headers.get('content-type') ?? '')) throw Error('Artwork unavailable')
          // Finish storage writes during preparation, not during a new player's
          // first walk. Quota failure still allows this response to load.
          if (cache) await cache.put(url, response.clone()).catch(() => {})
        }
        const blob = URL.createObjectURL(await response.blob())
        blobs.push(blob); resolved.set(name, blob)
      } catch { resolved.set(name, url) }
    }
  }))
  // Clean obsolete hashes without deleting other application caches.
  if (cache && !signal.aborted) {
    const current = new Set(Object.values(urls).map(url => new URL(url, location.origin).href))
    void cache.keys().then(keys => Promise.all(keys.filter(key => !current.has(key.url)).map(key => cache!.delete(key)))).catch(() => {})
  }
  return {
    hits,
    url: (source: string) => { const name = source.split('/').pop()!.split('?')[0]; return resolved.get(name) ?? urls[name] ?? source },
    release: () => blobs.forEach(url => URL.revokeObjectURL(url)),
  }
}
