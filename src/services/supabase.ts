import { createClient, type Session, type User } from '@supabase/supabase-js'
import type { AuthSession, AuthUser } from '../app/types'

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

export const toAuthUser = (user: User | null): AuthUser | null =>
  user?.email
    ? {
        id: user.id,
        email: user.email,
      }
    : null

export const toAuthSession = (session: Session | null): AuthSession | null =>
  session
    ? {
        accessToken: session.access_token,
        expiresAt: session.expires_at,
      }
    : null
