import type { ExamTrackId } from '../app/types'
import { isSupabaseConfigured, supabase } from './supabase'

export type AppEventName =
  | 'page_view'
  | 'demo_started'
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'exam_track_selected'
  | 'feature_opened'
  | 'quiz_started'
  | 'question_answered'
  | 'confidence_selected'
  | 'rationale_opened'
  | 'quiz_completed'
  | 'weak_area_opened'
  | 'study_plan_opened'
  | 'flashcard_reviewed'
  | 'material_upload_started'
  | 'material_upload_completed'
  | 'material_upload_failed'
  | 'generated_asset_used'
  | 'note_created'
  | 'feedback_opened'
  | 'feedback_submitted'
  | 'pricing_viewed'
  | 'external_cta_clicked'

export type QuestionResult = 'correct' | 'incorrect'

export interface AppEventPayload {
  page_path?: string
  source?: string
  campaign?: string
  exam_track?: ExamTrackId
  feature_name?: string
  question_category?: string
  question_result?: QuestionResult
  confidence_level?: 'low' | 'medium' | 'high'
  time_spent_seconds?: number
  is_demo_user?: boolean
  device_type?: 'desktop' | 'tablet' | 'mobile'
  metadata?: Record<string, string | number | boolean | null>
}

export interface AppEventContext {
  userId?: string
  isDemoUser?: boolean
}

export interface StoredAppEvent extends Required<Pick<AppEventPayload, 'device_type'>> {
  id: string
  event_name: AppEventName
  user_id: string | null
  anonymous_user_id: string
  session_id: string
  page_path: string
  source: string | null
  campaign: string | null
  exam_track: ExamTrackId | null
  feature_name: string | null
  question_category: string | null
  question_result: QuestionResult | null
  confidence_level: 'low' | 'medium' | 'high' | null
  time_spent_seconds: number | null
  is_demo_user: boolean
  metadata: Record<string, string | number | boolean | null>
  created_at: string
}

const analyticsEnabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
const debugAnalytics = import.meta.env.VITE_DEBUG_ANALYTICS === 'true'
const localEventsKey = 'nurse-command-app-events'
const anonymousIdKey = 'nurse-command-anonymous-user-id'
const sessionIdKey = 'nurse-command-session-id'

const prohibitedKeyPatterns = [
  /^email$/i,
  /^user_email$/i,
  /^name$/i,
  /^full_name$/i,
  /^password$/i,
  /token/i,
  /secret/i,
  /^note$/i,
  /^note_text$/i,
  /^note_body$/i,
  /^body$/i,
  /^document$/i,
  /^document_text$/i,
  /^upload_text$/i,
  /^filename$/i,
  /^file_name$/i,
  /school_record/i,
  /patient/i,
  /phi/i,
  /clinical_record/i,
]

const emailLikePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const tokenLikePattern = /(eyJ[a-zA-Z0-9_-]{12,}|access_token|refresh_token|bearer\s+[a-zA-Z0-9._-]+)/i

const safeRandomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const readStoredString = (key: string) => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeStoredString = (key: string, value: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Analytics must never break the product.
  }
}

export const getAnonymousUserId = () => {
  const existing = readStoredString(anonymousIdKey)
  if (existing) return existing
  const next = `anon_${safeRandomId()}`
  writeStoredString(anonymousIdKey, next)
  return next
}

export const getSessionId = () => {
  const existing = readStoredString(sessionIdKey)
  if (existing) return existing
  const next = `session_${safeRandomId()}`
  writeStoredString(sessionIdKey, next)
  return next
}

const getDeviceType = (): StoredAppEvent['device_type'] => {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia('(max-width: 767px)').matches) return 'mobile'
  if (window.matchMedia('(max-width: 1023px)').matches) return 'tablet'
  return 'desktop'
}

const sanitizePath = (path?: string) => {
  if (typeof window === 'undefined') return path ?? '/'
  const rawPath = path ?? window.location.pathname
  return rawPath.split('?')[0].split('#')[0] || '/'
}

const getUtmValue = (key: string) => {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get(key)
  return sanitizeString(value)
}

const sanitizeString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, 120)
  if (!trimmed) return null
  if (emailLikePattern.test(trimmed) || tokenLikePattern.test(trimmed)) return null
  return trimmed
}

const sanitizeMetadata = (metadata: AppEventPayload['metadata']) => {
  const safe: StoredAppEvent['metadata'] = {}
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (prohibitedKeyPatterns.some((pattern) => pattern.test(key))) continue
    if (typeof value === 'string') {
      const next = sanitizeString(value)
      if (next !== null) safe[key] = next
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value
      continue
    }
    if (typeof value === 'boolean' || value === null) {
      safe[key] = value
    }
  }
  return safe
}

const assertSafePayload = (payload: AppEventPayload) => {
  const entries = Object.entries(payload) as [string, unknown][]
  for (const [key, value] of entries) {
    if (key === 'metadata') continue
    if (prohibitedKeyPatterns.some((pattern) => pattern.test(key))) {
      throw new Error(`Analytics payload rejected prohibited key: ${key}`)
    }
    if (typeof value === 'string' && (emailLikePattern.test(value) || tokenLikePattern.test(value))) {
      throw new Error(`Analytics payload rejected private-looking value for key: ${key}`)
    }
  }
}

const createStoredEvent = (
  eventName: AppEventName,
  payload: AppEventPayload = {},
  context: AppEventContext = {},
): StoredAppEvent => {
  assertSafePayload(payload)
  return {
    id: safeRandomId(),
    event_name: eventName,
    user_id: context.userId ?? null,
    anonymous_user_id: getAnonymousUserId(),
    session_id: getSessionId(),
    page_path: sanitizePath(payload.page_path),
    source: sanitizeString(payload.source) ?? getUtmValue('utm_source'),
    campaign: sanitizeString(payload.campaign) ?? getUtmValue('utm_campaign'),
    exam_track: payload.exam_track ?? null,
    feature_name: sanitizeString(payload.feature_name),
    question_category: sanitizeString(payload.question_category),
    question_result: payload.question_result ?? null,
    confidence_level: payload.confidence_level ?? null,
    time_spent_seconds:
      typeof payload.time_spent_seconds === 'number' && Number.isFinite(payload.time_spent_seconds)
        ? Math.max(0, Math.round(payload.time_spent_seconds))
        : null,
    is_demo_user: payload.is_demo_user ?? context.isDemoUser ?? false,
    device_type: payload.device_type ?? getDeviceType(),
    metadata: sanitizeMetadata(payload.metadata),
    created_at: new Date().toISOString(),
  }
}

const appendLocalEvent = (event: StoredAppEvent) => {
  if (typeof window === 'undefined') return
  try {
    const previous = JSON.parse(window.localStorage.getItem(localEventsKey) ?? '[]') as StoredAppEvent[]
    window.localStorage.setItem(localEventsKey, JSON.stringify([event, ...previous].slice(0, 250)))
  } catch {
    // Analytics must never break the product.
  }
}

export const getLocalAppEvents = (): StoredAppEvent[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(localEventsKey) ?? '[]') as StoredAppEvent[]
  } catch {
    return []
  }
}

export async function trackAppEvent(
  eventName: AppEventName,
  payload: AppEventPayload = {},
  context: AppEventContext = {},
) {
  const event = createStoredEvent(eventName, payload, context)
  appendLocalEvent(event)

  if (debugAnalytics) {
    console.info('[Nurse Command analytics]', event)
  }

  if (!analyticsEnabled || !isSupabaseConfigured || !supabase) return

  const { error } = await supabase.from('app_events').insert({
    event_name: event.event_name,
    user_id: event.user_id,
    anonymous_user_id: event.anonymous_user_id,
    session_id: event.session_id,
    page_path: event.page_path,
    source: event.source,
    campaign: event.campaign,
    exam_track: event.exam_track,
    feature_name: event.feature_name,
    question_category: event.question_category,
    question_result: event.question_result,
    confidence_level: event.confidence_level,
    time_spent_seconds: event.time_spent_seconds,
    is_demo_user: event.is_demo_user,
    device_type: event.device_type,
    metadata: event.metadata,
    created_at: event.created_at,
  })

  if (error && debugAnalytics) {
    console.warn('[Nurse Command analytics] insert failed', error.message)
  }
}
