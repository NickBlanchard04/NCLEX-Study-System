import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const sources = JSON.parse(await readFile('src/game/tycoon-artwork-sources.json', 'utf8'))
const manifest = JSON.parse(await readFile('src/game/tycoon-artwork-manifest.json', 'utf8'))
for (const [name, expected] of Object.entries(sources)) {
  const rawSource = await readFile(`public/game-assets/hospital-prototype/${name}`)
  const source = name.endsWith('.json') ? Buffer.from(rawSource.toString('utf8').replace(/\r\n/g, '\n')) : rawSource
  if (createHash('sha256').update(source).digest('hex') !== expected)
    throw Error(`${name} changed. Run npm run prepare:tycoon-artwork before building.`)
  const rawRuntime = await readFile(`public${manifest[name]}`)
  const runtime = name.endsWith('.json') ? Buffer.from(rawRuntime.toString('utf8').replace(/\r\n/g, '\n')) : rawRuntime
  if (!manifest[name].includes(createHash('sha256').update(runtime).digest('hex').slice(0, 16)))
    throw Error(`Runtime artwork hash mismatch: ${name}`)
}
console.log('Ward artwork source and runtime hashes verified.')
