import { describe, expect, it } from 'vitest'
import type { Question } from '../../app/types'
import { recordContentFeedback } from '../content-feedback'

const question: Question = {
  id: 'NC-RN-MOC-PRIORITY-CLIENTS-0001',
  examTrack: 'nclex-rn',
  category: 'Leadership / Prioritization / Delegation',
  domain: 'Safe and Effective Care Environment',
  system: 'Management of Care',
  board: 'NCSBN NCLEX-RN',
  contentQuality: 'authored-draft',
  authorType: 'clinical-editor-draft',
  sourceRefs: ['NCSBN 2026 NCLEX-RN Test Plan'],
  sourceTopic: 'Management of Care',
  sourceStatus: 'source_needed',
  clinicalReviewStatus: 'not_sme_reviewed',
  learnerVisible: false,
  visibility: 'internal',
  contentStage: 'beta_draft',
  countsTowardOfficialReadiness: false,
  sourceBacked: false,
  blueprintMapped: true,
  feedbackEnabled: true,
  sourcePackId: 'SP-RN-PRIORITY-CLIENTS-0001',
  fixtureId: 'FIXTURE-SP-RN-PRIORITY-CLIENTS-0001',
  subcategory: 'Management of Care',
  difficulty: 'developing',
  difficultyProfile: 'case-based',
  format: 'multiple-choice',
  prompt: 'Which client should the RN assess first?',
  choices: [
    { id: 'A', text: 'Unstable client.' },
    { id: 'B', text: 'Stable client.' },
  ],
  correctAnswer: ['A'],
  rationale: {
    whyCorrect: 'Unstable physiologic cues come first.',
    whyOthers: 'Stable needs can wait.',
  },
  nclexTip: 'Prioritize unstable clients.',
  clinicalRelevance: 'Prompt escalation protects client safety.',
  tags: ['internal fixture'],
}

describe('content feedback capture', () => {
  it('records internal fixture trust state with the feedback report', () => {
    const report = recordContentFeedback({
      question,
      reason: 'source_concern',
      route: '/practice-questions',
      reviewState: 'review_open',
    })

    expect(report.questionId).toBe(question.id)
    expect(report.reason).toBe('source_concern')
    expect(report.sourcePackId).toBe('SP-RN-PRIORITY-CLIENTS-0001')
    expect(report.fixtureId).toBe('FIXTURE-SP-RN-PRIORITY-CLIENTS-0001')
    expect(report.sourceStatus).toBe('source_needed')
    expect(report.clinicalReviewStatus).toBe('not_sme_reviewed')
    expect(report.visibility).toBe('internal')
    expect(report.contentStage).toBe('beta_draft')
    expect(report.learnerVisible).toBe(false)
  })

  it('redacts private-looking note text before local storage capture', () => {
    const report = recordContentFeedback({
      question,
      reason: 'confusing_rationale',
      note: 'Please email learner@example.com and bearer abcdefghijklmnop for context.',
    })

    expect(report.note).toContain('[redacted-email]')
    expect(report.note).toContain('[redacted-token]')
    expect(report.note).not.toContain('learner@example.com')
  })
})
