import type { AuthSession, AuthUser, UserProfile } from '../app/types'
import { BETA_TERMS_EMAIL_COPY, type BetaTermsConsent } from '../app/beta-terms'
import {
  initialUrlHasPasswordRecovery,
  isSupabaseConfigured,
  supabase,
  toAuthSession,
  toAuthUser,
} from './supabase'

export interface AuthSnapshot {
  user: AuthUser | null
  session: AuthSession | null
  event?: string
}

const requireSupabase = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable accounts.')
  }
  return supabase
}

const getAuthRedirectTo = () => {
  const baseUrl = import.meta.env.BASE_URL || '/'
  if (typeof window === 'undefined') return baseUrl
  return new URL(baseUrl, window.location.origin).toString()
}

export async function getCurrentAuthSnapshot(): Promise<AuthSnapshot> {
  if (!supabase) return { user: null, session: null }
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return {
    user: toAuthUser(data.session?.user ?? null),
    session: toAuthSession(data.session ?? null),
    event: initialUrlHasPasswordRecovery && data.session ? 'PASSWORD_RECOVERY' : undefined,
  }
}

export function onAuthSnapshotChange(callback: (snapshot: AuthSnapshot) => void) {
  if (!supabase) return () => undefined

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback({
      user: toAuthUser(session?.user ?? null),
      session: toAuthSession(session ?? null),
      event,
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
  betaTermsConsent?: BetaTermsConsent,
): Promise<AuthSnapshot> {
  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectTo(),
      data: {
        name: profile.name,
        nursing_school: profile.nursingSchool,
        exam_track: profile.examTrack,
        beta_terms_accepted: Boolean(betaTermsConsent),
        beta_terms_accepted_at: betaTermsConsent?.acceptedAt,
        beta_terms_copy_requested: betaTermsConsent?.emailCopyRequested ?? false,
        beta_terms_email_copy: betaTermsConsent?.emailCopyRequested ? BETA_TERMS_EMAIL_COPY : undefined,
        beta_terms_version: betaTermsConsent?.version,
      },
    },
  })
  if (error) throw error
  const signedInUser = data.session ? data.user : null
  return {
    user: toAuthUser(signedInUser),
    session: toAuthSession(data.session),
  }
}

export async function requestPasswordReset(email: string) {
  const client = requireSupabase()
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectTo(),
  })
  if (error) throw error
}

export async function updateCurrentUserPassword(password: string) {
  const client = requireSupabase()
  const { error } = await client.auth.updateUser({ password })
  if (error) throw error
}

export async function signOutCurrentUser() {
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}
