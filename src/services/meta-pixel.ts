import type { AppEventName, StoredAppEvent } from './analytics-client'

type MetaPixelPayload = Record<string, string | number | boolean | null>
type MetaPixelMethod = 'track' | 'trackCustom'

export interface MetaPixelAppEvent {
  method: MetaPixelMethod
  name: string
  payload: MetaPixelPayload
}

declare global {
  interface Window {
    fbq?: {
      (...args: unknown[]): void
      callMethod?: (...args: unknown[]) => void
      queue?: unknown[]
      loaded?: boolean
      version?: string
      push?: (...args: unknown[]) => void
    }
    _fbq?: Window['fbq']
  }
}

const metaPixelId = ((import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? '').trim()
const metaPixelEnabled = import.meta.env.VITE_ENABLE_META_PIXEL === 'true'

const metaEventAllowlist = new Set<AppEventName>([
  'page_view',
  'signup_started',
  'signup_completed',
  'external_cta_clicked',
  'activation_choice_clicked',
  'quiz_started',
  'material_upload_started',
  'material_upload_completed',
  'feedback_submitted',
])

const standardEventByAppEvent = new Map<AppEventName, string>([
  ['page_view', 'PageView'],
  ['signup_started', 'Lead'],
  ['signup_completed', 'CompleteRegistration'],
])

const customEventByAppEvent = new Map<AppEventName, string>([
  ['external_cta_clicked', 'LandingCtaClicked'],
  ['activation_choice_clicked', 'ActivationChoiceClicked'],
  ['quiz_started', 'PracticeStarted'],
  ['material_upload_started', 'MaterialImportStarted'],
  ['material_upload_completed', 'MaterialImportCompleted'],
  ['feedback_submitted', 'BetaFeedbackSubmitted'],
])

const setIfPresent = (
  payload: MetaPixelPayload,
  key: string,
  value: string | number | boolean | null | undefined,
) => {
  if (value !== null && value !== undefined) {
    payload[key] = value
  }
}

export const isMetaPixelConfigured = () => metaPixelEnabled && Boolean(metaPixelId)

export function initializeMetaPixel() {
  if (!isMetaPixelConfigured() || typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }
  if (window.fbq?.loaded || document.getElementById('nurse-command-meta-pixel')) return true

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args)
    } else {
      fbq.queue?.push(args)
    }
  }) as NonNullable<Window['fbq']>
  fbq.queue = [] as unknown[]
  fbq.loaded = true
  fbq.version = '2.0'
  window.fbq = fbq
  window._fbq = fbq

  const script = document.createElement('script')
  script.id = 'nurse-command-meta-pixel'
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  window.fbq('init', metaPixelId)
  return true
}

export function toMetaPixelAppEvent(event: StoredAppEvent): MetaPixelAppEvent | null {
  if (!metaEventAllowlist.has(event.event_name)) return null

  const standardEvent = standardEventByAppEvent.get(event.event_name)
  const customEvent = customEventByAppEvent.get(event.event_name)
  const name = standardEvent ?? customEvent
  if (!name) return null

  const payload: MetaPixelPayload = {
    page_path: event.page_path,
    is_demo_user: event.is_demo_user,
    device_type: event.device_type,
  }

  setIfPresent(payload, 'source', event.source)
  setIfPresent(payload, 'campaign', event.campaign)
  setIfPresent(payload, 'exam_track', event.exam_track)
  setIfPresent(payload, 'feature_name', event.feature_name)

  if (event.event_name === 'quiz_started') {
    setIfPresent(payload, 'question_category', event.question_category)
  }

  for (const [key, value] of Object.entries(event.metadata)) {
    if (key === 'message' || key === 'feedback' || key === 'note') continue
    setIfPresent(payload, `meta_${key}`, value)
  }

  return {
    method: standardEvent ? 'track' : 'trackCustom',
    name,
    payload,
  }
}

export function pushMetaPixelEvent(event: StoredAppEvent) {
  if (!isMetaPixelConfigured() || typeof window === 'undefined') return

  const metaEvent = toMetaPixelAppEvent(event)
  if (!metaEvent) return

  initializeMetaPixel()
  window.fbq?.(metaEvent.method, metaEvent.name, metaEvent.payload)
}
