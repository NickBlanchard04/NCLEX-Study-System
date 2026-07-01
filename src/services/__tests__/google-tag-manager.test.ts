import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoredAppEvent } from '../analytics-client'
import {
  initializeGoogleTagManager,
  pushAppEventToDataLayer,
  toGoogleTagManagerAppEvent,
} from '../google-tag-manager'

const baseEvent: StoredAppEvent = {
  id: 'event-1',
  event_name: 'quiz_completed',
  user_id: 'user-private-id',
  anonymous_user_id: 'anon-private-id',
  session_id: 'session-private-id',
  page_path: '/practice-questions',
  source: 'instagram',
  campaign: 'open-beta',
  exam_track: 'nclex-rn',
  feature_name: 'Question Bank',
  question_category: 'prioritization',
  question_result: 'correct',
  confidence_level: 'high',
  time_spent_seconds: 180,
  is_demo_user: false,
  device_type: 'desktop',
  metadata: {
    cohort: 'open-beta',
    note: 'private learner note',
    filename: 'learner-upload.pdf',
  },
  created_at: '2026-07-01T00:00:00.000Z',
}

describe('google-tag-manager event bridge', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps allowlisted app events to safe dataLayer payloads', () => {
    expect(toGoogleTagManagerAppEvent(baseEvent)).toEqual({
      event: 'quiz_completed',
      page_path: '/practice-questions',
      source: 'instagram',
      campaign: 'open-beta',
      exam_track: 'nclex-rn',
      feature_name: 'Question Bank',
      question_category: 'prioritization',
      question_result: 'correct',
      confidence_level: 'high',
      is_demo_user: false,
      device_type: 'desktop',
    })
  })

  it('excludes private identifiers, raw metadata, and unsupported events', () => {
    const googleEvent = toGoogleTagManagerAppEvent(baseEvent)

    expect(googleEvent).not.toHaveProperty('user_id')
    expect(googleEvent).not.toHaveProperty('anonymous_user_id')
    expect(googleEvent).not.toHaveProperty('session_id')
    expect(googleEvent).not.toHaveProperty('metadata')
    expect(googleEvent).not.toHaveProperty('created_at')
    expect(
      toGoogleTagManagerAppEvent({
        ...baseEvent,
        event_name: 'question_answered',
      }),
    ).toBeNull()
  })

  it('does not initialize or push when no GTM container is configured', () => {
    const headAppendChild = vi.fn()
    const documentStub = {
      getElementById: vi.fn(),
      createElement: vi.fn(),
      head: {
        appendChild: headAppendChild,
      },
    }
    const windowStub: { dataLayer?: Array<Record<string, unknown>> } = {}

    vi.stubGlobal('document', documentStub)
    vi.stubGlobal('window', windowStub)

    expect(initializeGoogleTagManager()).toBe(false)
    pushAppEventToDataLayer(baseEvent)

    expect(documentStub.createElement).not.toHaveBeenCalled()
    expect(headAppendChild).not.toHaveBeenCalled()
    expect(windowStub.dataLayer).toBeUndefined()
  })
})
