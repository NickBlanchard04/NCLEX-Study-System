import sharp from 'sharp'
import { statSync } from 'node:fs'

for (const [input, output, width] of [
  ['src/assets/home/banner-reference.png', 'src/assets/home/banner-reference.webp', 1470],
  ['src/assets/brand/nursing-command-logo.png', 'src/assets/brand/nursing-command-logo-small.webp', 128],
]) {
  await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(output)
  const before = statSync(input).size
  const after = statSync(output).size
  console.log(`${output}: ${before} → ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`)
}
