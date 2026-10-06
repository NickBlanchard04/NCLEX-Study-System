import sharp from 'sharp'
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// Keep authored PNGs untouched. Ship lossless WebP pixels with content hashes,
// so a fresh visitor downloads less and returning players never get stale art.
const scene = await readFile('src/game/tycoon-ward-scene.ts', 'utf8')
const environment = [...scene.match(/const environmentKeys = \[(.*?)\] as const/s)[1].matchAll(/'([^']+)'/g)].map(match => match[1])
const names = [...environment, 'bed-empty',
  'reference-bed-table', 'reference-bed-table-empty', 'reference-station', 'elevator-core', 'stair-core',
  'patient-oak-door-detail-v1', 'studio-headwall-v1', 'rigged-nurse-sheet']
const json = ['registration', 'building-core-registration', 'rigged-nurse-pivots', 'rigged-nurse-atlas']
const manifest = {}
const sources = {}
await mkdir('public/game-assets/hospital-runtime', { recursive: true })
let originalBytes = 0, runtimeBytes = 0
for (const name of names) {
  const source = await readFile(`public/game-assets/hospital-prototype/${name}.png`)
  sources[`${name}.png`] = createHash('sha256').update(source).digest('hex')
  const webp = await sharp(source).webp({ lossless: true, effort: 6 }).toBuffer()
  const hash = createHash('sha256').update(webp).digest('hex').slice(0, 16)
  const filename = `${name}-${hash}.webp`
  await writeFile(`public/game-assets/hospital-runtime/${filename}`, webp)
  manifest[`${name}.png`] = `/game-assets/hospital-runtime/${filename}`
  originalBytes += source.length; runtimeBytes += webp.length
}
for (const name of json) {
  const source = await readFile(`public/game-assets/hospital-prototype/${name}.json`)
  sources[`${name}.json`] = createHash('sha256').update(source).digest('hex')
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16)
  const filename = `${name}-${hash}.json`
  await writeFile(`public/game-assets/hospital-runtime/${filename}`, source)
  manifest[`${name}.json`] = `/game-assets/hospital-runtime/${filename}`
}
await writeFile('src/game/tycoon-artwork-manifest.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile('src/game/tycoon-artwork-sources.json', JSON.stringify(sources, null, 2) + '\n')
const active = new Set(Object.values(manifest).map(url => url.split('/').at(-1)))
for (const file of await readdir('public/game-assets/hospital-runtime')) {
  if (/^[a-z0-9-]+-[a-f0-9]{16}\.(webp|json)$/.test(file) && !active.has(file))
    await unlink(`public/game-assets/hospital-runtime/${file}`)
}
console.log(`Lossless ward artwork: ${(originalBytes/1e6).toFixed(1)} MB → ${(runtimeBytes/1e6).toFixed(1)} MB`)
