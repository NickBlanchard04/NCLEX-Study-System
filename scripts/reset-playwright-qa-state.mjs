import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const loadLocalEnv = () => {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      if (!process.env[key]) {
        process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '')
      }
    }
  }
}

const requiredEnv = (name) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}. Add it to .env.local or export it locally.`)
  return value
}

const findUserByEmail = async (admin, email) => {
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < perPage) return null
    page += 1
  }
}

const safeDelete = async (admin, table, column, value) => {
  const { error, count } = await admin
    .from(table)
    .delete({ count: 'exact' })
    .eq(column, value)

  if (!error) {
    console.log(`reset ${table}.${column}: ${count ?? 0}`)
    return
  }

  if (
    error.code === '42P01' ||
    error.code === '42703' ||
    /does not exist|column/i.test(error.message)
  ) {
    console.warn(`skip ${table}.${column}: ${error.message}`)
    return
  }

  throw error
}

const resetStorageFolder = async (admin, userId) => {
  const bucket = admin.storage.from('study-materials')
  const { data, error } = await bucket.list(userId, { limit: 1000 })
  if (error) {
    console.warn(`skip study-materials storage reset: ${error.message}`)
    return
  }

  const paths = (data ?? [])
    .filter((object) => object.name)
    .map((object) => `${userId}/${object.name}`)

  if (!paths.length) {
    console.log('reset study-materials storage: 0')
    return
  }

  const { error: removeError } = await bucket.remove(paths)
  if (removeError) throw removeError
  console.log(`reset study-materials storage: ${paths.length}`)
}

loadLocalEnv()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
if (!supabaseUrl?.trim()) {
  throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL. Add it to .env.local.')
}

const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const email = process.env.PLAYWRIGHT_QA_EMAIL?.trim() || 'qa@nursecommand.com'

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const user = await findUserByEmail(admin, email)
if (!user) {
  throw new Error(`QA user ${email} was not found. Run npm run qa:create-user first.`)
}

const userId = user.id

const deletePlan = [
  ['friend_request_email_notifications', 'requester_id'],
  ['friend_request_email_notifications', 'recipient_id'],
  ['social_messages', 'sender_id'],
  ['social_messages', 'recipient_id'],
  ['friend_requests', 'requester_id'],
  ['friend_requests', 'recipient_id'],
  ['friendships', 'user_id'],
  ['friendships', 'friend_id'],
  ['user_blocks', 'blocker_id'],
  ['user_blocks', 'blocked_id'],
  ['app_events', 'user_id'],
  ['claim_evidence_records', 'user_id'],
  ['readiness_snapshots', 'user_id'],
  ['learner_mastery_vectors', 'user_id'],
  ['remediation_events', 'user_id'],
  ['attempt_diagnoses', 'user_id'],
  ['practice_session_responses', 'user_id'],
  ['practice_sessions', 'user_id'],
  ['material_quiz_sessions', 'user_id'],
  ['material_questions', 'user_id'],
  ['material_flashcards', 'user_id'],
  ['study_materials', 'user_id'],
  ['flashcard_reviews', 'user_id'],
  ['notes', 'user_id'],
  ['question_attempts', 'user_id'],
  ['sync_events', 'user_id'],
]

for (const [table, column] of deletePlan) {
  await safeDelete(admin, table, column, userId)
}

await resetStorageFolder(admin, userId)

const preferences = {
  reducedMotion: false,
  notifications: true,
  analyticsScope: 'selected-track',
  betaTermsAccepted: true,
  betaTermsVersion: 'open-beta',
}

const { error: profileError } = await admin.from('profiles').upsert(
  {
    id: userId,
    name: 'Nurse Command QA',
    exam_track: 'nclex-rn',
    exam_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    study_intensity: 'steady',
    daily_goal: 15,
    streak: 0,
    preferences,
    nursing_school: 'Nurse Command QA Program',
    profile_state: 'QA',
    directory_visible: true,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'id' },
)

if (profileError) throw profileError

console.log(`QA state reset complete for ${email}`)
