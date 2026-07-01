import { describe, expect, it } from 'vitest'
import type { StoredAppEvent } from '../analytics-client'
import { toMetaPixelAppEvent } from '../meta-pixel'

const baseEvent: StoredAppEvent = {
  id: 'event-1',
  event_name: 'signup_completed',
  user_id: 'user-private-id',
  anonymous_user_id: 'anon-private-id',
  session_id: 'session-private-id',
  page_path: '/',
  source: 'meta',
  campaign: 'open-beta',
  exam_track: 'nclex-rn',
  feature_name: 'Beta Account',
  question_category: null,
  question_result: null,
  confidence_level: null,
  time_spent_seconds: null,
  is_demo_user: false,
  device_type: 'desktop',
  metadata: {
    cohort: 'open-beta',
    message: 'private text should not leave the app',
  },
  created_at: '2026-07-01T00:00:00.000Z',
}

describe('meta-pixel event bridge', () => {
  it('maps signup completion to a safe standard conversion event', () => {
    expect(toMetaPixelAppEvent(baseEvent)).toEqual({
      method: 'track',
      name: 'CompleteRegistration',
      payload: {
        page_path: '/',
        source: 'meta',
        campaign: 'open-beta',
        exam_track: 'nclex-rn',
        feature_name: 'Beta Account',
        is_demo_user: false,
        device_type: 'desktop',
        meta_cohort: 'open-beta',
      },
    })
  })

  it('excludes private identifiers and unsupported events', () => {
    const metaEvent = toMetaPixelAppEvent(baseEvent)

    expect(metaEvent?.payload).not.toHaveProperty('user_id')
    expect(metaEvent?.payload).not.toHaveProperty('anonymous_user_id')
    expect(metaEvent?.payload).not.toHaveProperty('session_id')
    expect(metaEvent?.payload).not.toHaveProperty('message')
    expect(
      toMetaPixelAppEvent({
        ...baseEvent,
        event_name: 'question_answered',
      }),
    ).toBeNull()
  })
})
