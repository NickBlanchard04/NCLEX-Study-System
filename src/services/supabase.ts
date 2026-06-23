import { createClient, type Session, type User } from '@supabase/supabase-js'
import type { AuthSession, AuthUser, ExamTrackId } from '../app/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

const examTrackIds = new Set<ExamTrackId>(['nclex-rn', 'nclex-pn', 'teas', 'fnp', 'ccma'])

const getMetadataString = (metadata: User['user_metadata'] | null | undefined, key: string) => {
  const value = (metadata as Record<string, unknown> | null | undefined)?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export const toAuthUser = (user: User | null): AuthUser | null => {
  if (!user?.email) return null
  const examTrack = getMetadataString(user.user_metadata, 'exam_track')
  return {
    id: user.id,
    email: user.email,
    name: getMetadataString(user.user_metadata, 'name'),
    nursingSchool: getMetadataString(user.user_metadata, 'nursing_school'),
    examTrack: examTrackIds.has(examTrack as ExamTrackId) ? (examTrack as ExamTrackId) : undefined,
  }
}

export const toAuthSession = (session: Session | null): AuthSession | null =>
  session
    ? {
        accessToken: session.access_token,
        expiresAt: session.expires_at,
      }
    : null
