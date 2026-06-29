import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envFiles = ['.env.local', '.env']

const unquote = (value: string) => {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function loadQaEnv() {
  for (const file of envFiles) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue

    const lines = readFileSync(path, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      if (!process.env[key]) process.env[key] = unquote(rawValue)
    }
  }
}

export function requireQaEnv(name: string) {
  loadQaEnv()
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local or export it before running Playwright QA.`,
    )
  }
  return value
}
