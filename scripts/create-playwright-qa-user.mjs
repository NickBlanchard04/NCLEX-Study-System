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

loadLocalEnv()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
if (!supabaseUrl?.trim()) {
  throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL. Add it to .env.local.')
}

const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const email = process.env.PLAYWRIGHT_QA_EMAIL?.trim() || 'qa@nursecommand.com'
const password = requiredEnv('PLAYWRIGHT_QA_PASSWORD')

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const metadata = {
  name: 'Nurse Command QA',
  nursing_school: 'Nurse Command QA Program',
  exam_track: 'nclex-rn',
  beta_terms_accepted: true,
  beta_terms_accepted_at: new Date().toISOString(),
  beta_terms_copy_requested: false,
  beta_terms_version: 'open-beta',
  qa_account: true,
}

const existingUser = await findUserByEmail(admin, email)

if (existingUser) {
  const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...existingUser.user_metadata,
      ...metadata,
    },
  })
  if (error) throw error
  console.log(`Updated confirmed QA user: ${email}`)
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error) throw error
  console.log(`Created confirmed QA user: ${email}`)
}
