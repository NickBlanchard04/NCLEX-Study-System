import { describe, expect, it } from 'vitest'
import { createBetaFeedbackMailto, createBetaFeedbackReport } from '../beta-feedback'

describe('beta feedback capture', () => {
  it('redacts private-looking text before local feedback storage', () => {
    const report = createBetaFeedbackReport({
      source: 'dashboard',
      sentiment: 'confused',
      confusion: 'My email is learner@example.com and bearer abcdefghijklmnop.',
      expected: 'I expected a clear start button.',
      returnTrigger: 'A cleaner first task.',
    })

    expect(report.confusion).toContain('[redacted-email]')
    expect(report.confusion).toContain('[redacted-token]')
    expect(report.confusion).not.toContain('learner@example.com')
  })

  it('builds a support email handoff without requiring raw feedback in analytics', () => {
    const report = createBetaFeedbackReport({
      source: 'help',
      sentiment: 'idea',
      confusion: 'The next step was clear.',
      expected: 'I wanted a checklist.',
      returnTrigger: 'Weekly score history.',
    })

    const mailto = createBetaFeedbackMailto(report)

    expect(mailto).toContain('mailto:support@nursecommand.com')
    expect(mailto).toContain('Nurse%20Command%20beta%20feedback')
    expect(mailto).toContain('Weekly%20score%20history')
  })
})
