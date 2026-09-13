import { appendFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const PROJECT_REF = 'xcjvnhrfrjzvszmwgtep'
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`
const MANAGEMENT_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}`
const TRANSITIONAL = new Set(['COMING_UP', 'RESTORING'])

export async function checkBackend({
  env = process.env,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
  log = console.log,
  restoreTimeoutMs = 10 * 60 * 1000,
} = {}) {
  const token = env.SUPABASE_MANAGEMENT_TOKEN?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!token || !anonKey) throw new Error('Required GitHub secrets are missing.')
  if (env.VITE_SUPABASE_URL?.replace(/\/$/, '') !== PROJECT_URL) {
    throw new Error('Project URL does not match the authorized Nurse Command backend.')
  }

  async function request(url, { method = 'GET', headers = {}, body, label } = {}) {
    // Never follow redirects with credentials or expose upstream bodies/errors in logs.
    let response
    try {
      response = await fetchImpl(url, {
        method, headers, body, redirect: 'error', signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new Error(`${label}: network request failed or timed out.`)
    }
    if (!response.ok) throw new Error(`${label}: HTTP ${response.status}.`)
    return response
  }

  async function readStatus() {
    const response = await request(MANAGEMENT_URL, {
      headers: { Authorization: `Bearer ${token}` }, label: 'Project status',
    })
    let project
    try { project = await response.json() } catch { throw new Error('Invalid project status response.') }
    if (project.id !== PROJECT_REF || typeof project.status !== 'string') {
      throw new Error('Project status response did not match the authorized project.')
    }
    return project.status
  }

  let status = await readStatus()
  let restored = false
  const deadline = now() + restoreTimeoutMs
  if (status === 'INACTIVE') {
    log('Confirmed paused backend; requesting restoration of Nurse Command only.')
    // A failed/ambiguous POST is not retried. The next run reads status first.
    await request(`${MANAGEMENT_URL}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}', label: 'Restore request',
    })
    restored = true
  }
  if (restored || TRANSITIONAL.has(status)) {
    do {
      if (now() >= deadline) throw new Error('Restoration has not completed within ten minutes; inspect Supabase.')
      await sleep(15_000)
      status = await readStatus()
    } while (TRANSITIONAL.has(status) || (restored && status === 'INACTIVE'))
  }
  if (status !== 'ACTIVE_HEALTHY') {
    throw new Error('Backend is not ACTIVE_HEALTHY; no unapproved restart or configuration change was attempted.')
  }

  const publicHeaders = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  // A real read-only query exercises PostgREST and Postgres under the existing anon RLS role.
  // The impossible predicate returns no student records and never changes data.
  const probeUrl = `${PROJECT_URL}/rest/v1/profiles?select=id&id=is.null&limit=1`
  async function probe() {
    const auth = await request(`${PROJECT_URL}/auth/v1/health`, {
      headers: publicHeaders, label: 'Authentication health',
    })
    let health
    try { health = await auth.json() } catch { throw new Error('Invalid authentication health response.') }
    if (health.name !== 'GoTrue') throw new Error('Unexpected authentication health response.')
    const database = await request(probeUrl, { headers: publicHeaders, label: 'Database health' })
    let rows
    try { rows = await database.json() } catch { throw new Error('Invalid database health response.') }
    if (!Array.isArray(rows) || rows.length !== 0) throw new Error('Unexpected database probe response.')
    const site = await request('https://nursecommand.com/', { label: 'Website health' })
    const html = await site.text()
    if (!html.includes('Nurse Command') || !html.includes('id="root"')) {
      throw new Error('Website response is not the expected application shell.')
    }
  }
  for (let attempt = 1; ; attempt++) {
    try { await probe(); break } catch (error) {
      if (attempt === 3) throw error
      await sleep(5_000)
    }
  }
  const message = restored
    ? 'Nurse Command restored and verified: project, authentication, database, and website shell are healthy.'
    : 'Nurse Command healthy: project, authentication, database, and website shell checks passed.'
  log(message)
  return { restored, message }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let summary
  try {
    const result = await checkBackend()
    summary = result.message
  } catch (error) {
    summary = error.message
    console.error(summary)
    process.exitCode = 1
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Nurse Command backend check\n\n${summary}\n`)
  }
}
