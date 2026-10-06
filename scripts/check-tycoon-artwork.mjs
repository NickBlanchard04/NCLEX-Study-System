import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const sources = JSON.parse(await readFile('src/game/tycoon-artwork-sources.json', 'utf8'))
const manifest = JSON.parse(await readFile('src/game/tycoon-artwork-manifest.json', 'utf8'))
for (const [name, expected] of Object.entries(sources)) {
  const source = await readFile(`public/game-assets/hospital-prototype/${name}`)
  if (createHash('sha256').update(source).digest('hex') !== expected)
    throw Error(`${name} changed. Run npm run prepare:tycoon-artwork before building.`)
  const runtime = await readFile(`public${manifest[name]}`)
  if (!manifest[name].includes(createHash('sha256').update(runtime).digest('hex').slice(0, 16)))
    throw Error(`Runtime artwork hash mismatch: ${name}`)
}
console.log('Ward artwork source and runtime hashes verified.')
