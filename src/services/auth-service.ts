import type { AuthSession, AuthUser, UserProfile } from '../app/types'
import { isSupabaseConfigured, supabase, toAuthSession, toAuthUser } from './supabase'

export interface AuthSnapshot {
  user: AuthUser | null
  session: AuthSession | null
}

const requireSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable accounts.')
  }
  return supabase
}

export async function getCurrentAuthSnapshot(): Promise<AuthSnapshot> {
  if (!supabase) return { user: null, session: null }
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return {
    user: toAuthUser(data.session?.user ?? null),
    session: toAuthSession(data.session ?? null),
  }
}

export function onAuthSnapshotChange(callback: (snapshot: AuthSnapshot) => void) {
  if (!supabase) return () => undefined

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({
      user: toAuthUser(session?.user ?? null),
      session: toAuthSession(session ?? null),
    })
  })

  return () => subscription.unsubscribe()
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSnapshot> {
  const client = requireSupabase()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return {
    user: toAuthUser(data.user),
    session: toAuthSession(data.session),
  }
}

export async function signUpWithPassword(
  email: string,
  password: string,
  profile: UserProfile,
): Promise<AuthSnapshot> {
  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: profile.name,
        nursing_school: profile.nursingSchool,
        exam_track: profile.examTrack,
      },
    },
  })
  if (error) throw error
  return {
    user: toAuthUser(data.user),
    session: toAuthSession(data.session),
  }
}

export async function requestPasswordReset(email: string) {
  const client = requireSupabase()
  const { error } = await client.auth.resetPasswordForEmail(email)
  if (error) throw error
}

export async function signOutCurrentUser() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}
