import type { AuthUser } from '../app/types'
import { isSupabaseConfigured, supabase } from './supabase'
import type { StoredAppEvent } from './analytics-client'

const envAdminEmails = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const previewPasskeyHash = ((import.meta.env.VITE_ADMIN_PREVIEW_PASSKEY_SHA256 as string | undefined) ?? '')
  .trim()
  .toLowerCase()

const passkeyStorageKey = 'nurse-command-admin-preview-passkey'

export interface AdminDataAccessStatus {
  configured: boolean
  signedIn: boolean
  isAdmin: boolean
  email: string | null
  error: string | null
}

export interface AdminProfileSummary {
  id: string
  name: string
  member_number: number | null
  exam_track: string | null
  nursing_school: string | null
  profile_state: string | null
  updated_at: string
}

export const isLocalAdminPreview = () =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)

export const isAdminPanelEnabled = () =>
  import.meta.env.VITE_ENABLE_ADMIN_PANEL === 'true' || isLocalAdminPreview()

export const isAdminPreviewPasskeyEnabled = () => Boolean(previewPasskeyHash)

export const hasStoredAdminPreviewPasskeyAccess = () => {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(passkeyStorageKey) === 'verified'
}

async function sha256Hex(value: string) {
  const buffer = new TextEncoder().encode(value)
  const digest = await window.crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyAdminPreviewPasskey(value: string) {
  if (!previewPasskeyHash || typeof window === 'undefined' || !window.crypto?.subtle) return false
  const candidateHash = await sha256Hex(value.trim())
  const verified = candidateHash === previewPasskeyHash
  if (verified) {
    window.sessionStorage.setItem(passkeyStorageKey, 'verified')
  }
  return verified
}

export async function checkAdminAccess(user: AuthUser | null) {
  if (isLocalAdminPreview()) return true
  if (!user?.email || !isAdminPanelEnabled()) return false

  if (envAdminEmails.includes(user.email.toLowerCase())) return true

  if (!isSupabaseConfigured || !supabase) return false

  const { data, error } = await supabase.rpc('is_admin_user')
  if (error) return false
  return data === true
}

export async function loadRecentAdminEvents(limit = 500): Promise<StoredAppEvent[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('app_events')
    .select(
      'id,event_name,user_id,anonymous_user_id,session_id,page_path,source,campaign,exam_track,feature_name,question_category,question_result,confidence_level,time_spent_seconds,is_demo_user,device_type,metadata,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as StoredAppEvent[]
}

export async function loadAdminProfiles(userIds: string[] = []): Promise<AdminProfileSummary[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]
  if (!uniqueUserIds.length) return []

  const { data, error } = await supabase.rpc('admin_profile_directory', {
    user_ids: uniqueUserIds,
  })

  if (error || !data) return []
  return data as AdminProfileSummary[]
}

export async function getAdminDataAccessStatus(): Promise<AdminDataAccessStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      signedIn: false,
      isAdmin: false,
      email: null,
      error: 'Supabase is not configured for this build.',
    }
  }

  const { data, error } = await supabase.auth.getUser()
  const email = data.user?.email?.toLowerCase() ?? null

  if (error || !data.user || !email) {
    return {
      configured: true,
      signedIn: false,
      isAdmin: false,
      email,
      error: error?.message ?? null,
    }
  }

  if (envAdminEmails.includes(email)) {
    return {
      configured: true,
      signedIn: true,
      isAdmin: true,
      email,
      error: null,
    }
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_user')

  return {
    configured: true,
    signedIn: true,
    isAdmin: isAdmin === true,
    email,
    error: adminError?.message ?? null,
  }
}
