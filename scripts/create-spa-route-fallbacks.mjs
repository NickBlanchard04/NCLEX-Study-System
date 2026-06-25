import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const distDir = join(process.cwd(), 'dist')
const indexFile = join(distDir, 'index.html')

const appRoutes = [
  'admin',
  'admin/acquisition',
  'admin/activation',
  'admin/users',
  'admin/feature-usage',
  'admin/retention',
  'admin/content-quality',
  'admin/security',
  'dashboard',
  'exam-prep',
  'practice-questions',
  'test-mode',
  'nurse-command-lab',
  'clinical-simulator',
  'quick-study',
  'weak-areas',
  'performance-analytics',
  'flashcards',
  'study-plan',
  'strategy-training',
  'notes',
  'my-materials',
  'settings',
  'medical-command-center',
  'shift-command',
  'hospitalvania',
  'nurse-tycoon',
]

if (!existsSync(indexFile)) {
  throw new Error(`Missing build entry: ${indexFile}`)
}

for (const route of appRoutes) {
  const routeDir = join(distDir, route)
  mkdirSync(routeDir, { recursive: true })
  copyFileSync(indexFile, join(routeDir, 'index.html'))
}

console.log(`Created GitHub Pages fallbacks for ${appRoutes.length} app routes.`)
