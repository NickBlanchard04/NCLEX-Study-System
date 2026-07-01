import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const assetsDir = join(process.cwd(), 'dist', 'assets')
const kb = (bytes) => Math.round(bytes / 1024)
const budgetKb = {
  index: 420,
  pages: 340,
}

const files = readdirSync(assetsDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => {
    const bytes = statSync(join(assetsDir, file)).size
    return { file, bytes, kb: kb(bytes) }
  })
  .sort((left, right) => right.bytes - left.bytes)

const coreChunks = files.filter(({ file }) => /^(index|pages)-/.test(file))
const lazyHeavyChunks = files.filter(({ file, kb: sizeKb }) => file.startsWith('vendor-') && sizeKb >= 500)

console.log('\nNurse Command build chunk report')
console.log('Core route chunks:')
for (const chunk of coreChunks) {
  const kind = chunk.file.startsWith('index-') ? 'index' : 'pages'
  const budget = budgetKb[kind]
  const state = chunk.kb <= budget ? 'ok' : 'over budget'
  console.log(`- ${chunk.file}: ${chunk.kb} KB (${state}, budget ${budget} KB)`)
}

console.log('\nLargest lazy/vendor chunks:')
for (const chunk of files.slice(0, 8)) {
  console.log(`- ${chunk.file}: ${chunk.kb} KB`)
}

if (lazyHeavyChunks.length) {
  console.log('\nExpected heavy lazy chunks:')
  for (const chunk of lazyHeavyChunks) {
    console.log(`- ${chunk.file}: ${chunk.kb} KB`)
  }
}

const overBudget = coreChunks.filter((chunk) => {
  const kind = chunk.file.startsWith('index-') ? 'index' : 'pages'
  return chunk.kb > budgetKb[kind]
})

if (overBudget.length) {
  console.error('\nCore route chunk budget exceeded.')
  process.exitCode = 1
}
