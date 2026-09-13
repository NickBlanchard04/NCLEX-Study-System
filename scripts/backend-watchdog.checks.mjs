// Native Node test runner; kept separate from the application's Vitest suite.
import assert from 'node:assert/strict'
import test from 'node:test'
import { checkBackend, PROJECT_REF } from './backend-watchdog.mjs'

function harness(statuses = ['ACTIVE_HEALTHY'], override = () => undefined) {
  const calls = []
  let time = 0
  const env = {
    SUPABASE_MANAGEMENT_TOKEN: 'private-test-token',
    VITE_SUPABASE_ANON_KEY: 'public-test-key',
    VITE_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
  }
  const options = {
    env, log: () => {}, now: () => time,
    sleep: async (ms) => { time += ms },
    fetchImpl: async (url, init) => {
      calls.push({ url, ...init })
      const custom = override(url, init, calls)
      if (custom) return custom
      if (url.endsWith('/restore')) return Response.json({})
      if (url === `https://api.supabase.com/v1/projects/${PROJECT_REF}`) {
        const status = statuses.length > 1 ? statuses.shift() : statuses[0]
        return Response.json({ id: PROJECT_REF, status })
      }
      if (url.includes('/auth/')) return Response.json({ name: 'GoTrue' })
      if (url.includes('/rest/')) return Response.json([])
      return new Response('<title>Nurse Command</title><div id="root"></div>')
    },
  }
  return { calls, options }
}

test('healthy run reads database without mutations or management credential leakage', async () => {
  const { calls, options } = harness()
  assert.equal((await checkBackend(options)).restored, false)
  assert.equal(calls.length, 4)
  assert.ok(calls.every((call) => call.method === 'GET' && call.redirect === 'error'))
  assert.ok(calls.some((call) => call.url.includes('id=is.null')))
  for (const call of calls.filter((call) => !call.url.startsWith('https://api.supabase.com'))) {
    assert.ok(!JSON.stringify(call.headers).includes('private-test-token'))
  }
})

test('confirmed pause issues exactly one restore and waits for health', async () => {
  const { calls, options } = harness(['INACTIVE', 'INACTIVE', 'COMING_UP', 'RESTORING', 'ACTIVE_HEALTHY'])
  assert.equal((await checkBackend(options)).restored, true)
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1)
  assert.equal(calls.find((call) => call.method === 'POST').url,
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/restore`)
})

test('already restoring does not submit a duplicate restore', async () => {
  const { calls, options } = harness(['RESTORING', 'ACTIVE_HEALTHY'])
  await checkBackend(options)
  assert.ok(calls.every((call) => call.method === 'GET'))
})

test('other unhealthy states never trigger a restart', async () => {
  const { calls, options } = harness(['ACTIVE_UNHEALTHY'])
  await assert.rejects(checkBackend(options), /not ACTIVE_HEALTHY/)
  assert.equal(calls.length, 1)
})

test('management network failure fails closed and redacts upstream detail', async () => {
  const { calls, options } = harness([], () => { throw new Error('private-test-token') })
  await assert.rejects(checkBackend(options), /^Error: Project status: network request failed or timed out\.$/)
  assert.equal(calls.length, 1)
})

test('unauthorized management response never triggers restore', async () => {
  const { calls, options } = harness([], () => new Response('private-test-token', { status: 401 }))
  await assert.rejects(checkBackend(options), /Project status: HTTP 401/)
  assert.equal(calls.length, 1)
})

test('ambiguous restore response is never blindly retried', async () => {
  const { calls, options } = harness(['INACTIVE'], (url) => {
    if (url.endsWith('/restore')) return new Response('', { status: 503 })
  })
  await assert.rejects(checkBackend(options), /Restore request: HTTP 503/)
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1)
})

test('restore polling has a deadline', async () => {
  const { calls, options } = harness(['INACTIVE', 'RESTORING'])
  await assert.rejects(checkBackend({ ...options, restoreTimeoutMs: 30_000 }), /not completed/)
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1)
  assert.ok(calls.length < 6)
})

test('wrong project or missing credentials prevents all network access', async () => {
  for (const patch of [{ VITE_SUPABASE_URL: 'https://other.supabase.co' }, { SUPABASE_MANAGEMENT_TOKEN: '' }]) {
    const { calls, options } = harness()
    await assert.rejects(checkBackend({ ...options, env: { ...options.env, ...patch } }))
    assert.equal(calls.length, 0)
  }
})

test('management response must identify the authorized project', async () => {
  const { calls, options } = harness([], () => Response.json({ id: 'other', status: 'INACTIVE' }))
  await assert.rejects(checkBackend(options), /did not match/)
  assert.equal(calls.length, 1)
})

test('persistent database failure is retried three times but never restored', async () => {
  const { calls, options } = harness(undefined, (url) => {
    if (url.includes('/rest/')) return new Response('private upstream details', { status: 503 })
  })
  await assert.rejects(checkBackend(options), /Database health: HTTP 503/)
  assert.equal(calls.filter((call) => call.url.includes('/rest/')).length, 3)
  assert.ok(calls.every((call) => call.method === 'GET'))
})

test('probe never accepts returned user data or a wrong website', async () => {
  for (const target of ['database', 'site']) {
    const { options } = harness(undefined, (url) => {
      if (target === 'database' && url.includes('/rest/')) return Response.json([{ id: 'unexpected' }])
      if (target === 'site' && url === 'https://nursecommand.com/') return new Response('wrong app')
    })
    await assert.rejects(checkBackend(options), /Unexpected database probe|not the expected application/)
  }
})
