import type { AppEventName, StoredAppEvent } from './analytics-client'

type DataLayerValue = string | number | boolean | null

export interface GoogleTagManagerAppEvent extends Record<string, DataLayerValue | undefined> {
  event: AppEventName
  page_path: string
  is_demo_user: boolean
  device_type: StoredAppEvent['device_type']
  source?: string
  campaign?: string
  exam_track?: NonNullable<StoredAppEvent['exam_track']>
  feature_name?: string
  question_category?: string
  question_result?: NonNullable<StoredAppEvent['question_result']>
  confidence_level?: NonNullable<StoredAppEvent['confidence_level']>
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, DataLayerValue | undefined>>
  }
}

const gtmContainerId = ((import.meta.env.VITE_GTM_CONTAINER_ID as string | undefined) ?? '').trim()

const googleEventAllowlist = new Set<AppEventName>([
  'page_view',
  'demo_started',
  'signup_started',
  'signup_completed',
  'onboarding_completed',
  'quiz_started',
  'quiz_completed',
  'pricing_viewed',
  'external_cta_clicked',
])

const setIfPresent = <Key extends keyof GoogleTagManagerAppEvent>(
  event: GoogleTagManagerAppEvent,
  key: Key,
  value: GoogleTagManagerAppEvent[Key] | null,
) => {
  if (value !== null && value !== undefined) {
    event[key] = value
  }
}

export const isGoogleTagManagerConfigured = () => Boolean(gtmContainerId)

export function initializeGoogleTagManager() {
  if (!gtmContainerId || typeof window === 'undefined' || typeof document === 'undefined') return false
  if (document.getElementById('nurse-command-gtm')) return true

  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: 'gtm.js',
    'gtm.start': Date.now(),
  })

  const script = document.createElement('script')
  script.id = 'nurse-command-gtm'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmContainerId)}`
  document.head.appendChild(script)

  return true
}

export function toGoogleTagManagerAppEvent(event: StoredAppEvent): GoogleTagManagerAppEvent | null {
  if (!googleEventAllowlist.has(event.event_name)) return null

  const googleEvent: GoogleTagManagerAppEvent = {
    event: event.event_name,
    page_path: event.page_path,
    is_demo_user: event.is_demo_user,
    device_type: event.device_type,
  }

  setIfPresent(googleEvent, 'source', event.source)
  setIfPresent(googleEvent, 'campaign', event.campaign)
  setIfPresent(googleEvent, 'exam_track', event.exam_track)
  setIfPresent(googleEvent, 'feature_name', event.feature_name)
  setIfPresent(googleEvent, 'question_category', event.question_category)
  setIfPresent(googleEvent, 'question_result', event.question_result)
  setIfPresent(googleEvent, 'confidence_level', event.confidence_level)

  return googleEvent
}

export function pushAppEventToDataLayer(event: StoredAppEvent) {
  if (!isGoogleTagManagerConfigured() || typeof window === 'undefined') return

  const googleEvent = toGoogleTagManagerAppEvent(event)
  if (!googleEvent) return

  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(googleEvent)
}
