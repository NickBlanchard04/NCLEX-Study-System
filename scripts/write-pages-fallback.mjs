import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const distDir = resolve('dist')
const indexPath = resolve(distDir, 'index.html')
const fallbackPath = resolve(distDir, '404.html')

await mkdir(dirname(fallbackPath), { recursive: true })
await copyFile(indexPath, fallbackPath)
