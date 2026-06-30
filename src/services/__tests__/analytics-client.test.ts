import { describe, expect, it } from 'vitest'
import { trackAppEvent } from '../analytics-client'

describe('analytics-client privacy guardrails', () => {
  it('rejects private-looking top-level analytics values', async () => {
    await expect(
      trackAppEvent('feature_opened', {
        feature_name: 'Uploaded notes for learner@example.com',
      }),
    ).rejects.toThrow('Analytics payload rejected private-looking value')
  })

  it('rejects prohibited top-level analytics keys', async () => {
    await expect(
      trackAppEvent('feature_opened', {
        metadata: {},
        // @ts-expect-error prohibited keys must stay blocked even if a caller widens the payload type.
        email: 'learner@example.com',
      }),
    ).rejects.toThrow('Analytics payload rejected prohibited key: email')
  })

  it('allows safe aggregate event payloads', async () => {
    await expect(
      trackAppEvent('question_answered', {
        page_path: '/practice',
        feature_name: 'Practice Quiz',
        question_category: 'prioritization',
        question_result: 'incorrect',
        confidence_level: 'high',
        metadata: {
          itemCount: 5,
          timed: true,
          cohort: 'open-beta',
        },
      }),
    ).resolves.toBeUndefined()
  })
})
