import { describe, expect, it } from 'vitest'
import type { ExamTrackId, Question } from '../../app/types'
import { questionBank } from '../../data/content'
import { qualityQuestionPacks } from '../../data/quality-question-packs'
import {
  auditQuestionRenderFormatting,
  diagnoseQuestionRenderFeedback,
  diagnoseQuestionRenderQuality,
} from '../question-render-quality'

const makeQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'render-clean-001',
  examTrack: 'nclex-rn',
  category: 'Fundamentals & Safety',
  domain: 'Fundamentals & Safety',
  system: 'Priority',
  board: 'NCSBN NCLEX-RN',
  contentQuality: 'authored-draft',
  authorType: 'clinical-editor-draft',
  sourceRefs: ['NCSBN 2026 NCLEX test plan'],
  sourceTopic: 'Fundamentals & Safety / Priority',
  testTakingTrap: 'Choosing comfort before immediate safety.',
  blueprintMapped: true,
  sourceBacked: true,
  updatedAt: '2026-06-23',
  subcategory: 'Post-op safety',
  difficulty: 'developing',
  difficultyProfile: 'case-based',
  format: 'multiple-choice',
  scenario: 'A client becomes dizzy while standing after surgery.',
  prompt: 'Which action should the nurse take first?',
  choices: [
    { id: 'A', text: 'Assist the client back to bed and assess vital signs.' },
    { id: 'B', text: 'Encourage the client to keep walking to build tolerance.' },
    { id: 'C', text: 'Document the finding after the scheduled assessment.' },
    { id: 'D', text: 'Offer teaching about discharge activity restrictions.' },
  ],
  correctAnswer: ['A'],
  rationale: {
    whyCorrect: 'Dizziness after surgery creates a fall and perfusion concern, so the nurse protects safety and assesses first.',
    whyOthers: 'Walking, delayed documentation, and discharge teaching do not address the immediate instability.',
  },
  nclexTip: 'When safety and assessment compete with routine tasks, stabilize and assess first.',
  clinicalRelevance: 'Early bedside action reduces fall risk and catches post-op deterioration.',
  tags: ['safety', 'priority'],
  ...overrides,
})

const flattenQualityPacks = () =>
  (Object.keys(qualityQuestionPacks) as ExamTrackId[]).flatMap((track) => qualityQuestionPacks[track])

const getProductionQuestionsForAudit = () => {
  const byId = new Map<string, Question>()
  questionBank.forEach((question) => byId.set(question.id, question))
  flattenQualityPacks().forEach((question) => byId.set(question.id, question))
  return Array.from(byId.values())
}

describe('question render quality', () => {
  it('keeps a clean question display-safe', () => {
    const result = diagnoseQuestionRenderQuality(makeQuestion())

    expect(result.displaySafe).toBe(true)
    expect(result.action).toBe('none')
    expect(result.issueCount).toBe(0)
  })

  it('finds display artifacts that can cause bad question formatting', () => {
    const result = diagnoseQuestionRenderQuality(
      makeQuestion({
        prompt: 'Which action should the nurse take first? <strong>Choose priority</strong>',
        scenario: 'Which action should the nurse take first? <strong>Choose priority</strong>',
        choices: [
          { id: 'A', text: 'Correct the clientâ€™s position immediately.' },
          { id: 'B', text: 'Use-this-unbroken-token-that-is-long-enough-to-overflow-on-mobile-layouts.' },
          { id: 'C', text: 'Document the expected finding later.' },
          { id: 'D', text: 'Document the expected finding later.' },
        ],
      }),
    )

    expect(result.displaySafe).toBe(false)
    expect(result.action).toBe('needs_render_review')
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'raw_html',
        'weird_character',
        'long_unbroken_token',
        'duplicate_answer_choice',
        'scenario_prompt_duplicate',
      ]),
    )
  })

  it('blocks internal topic and blueprint labels from learner-visible question copy', () => {
    const result = diagnoseQuestionRenderQuality(
      makeQuestion({
        scenario:
          'A client reports worsening shortness of breath. Focus area: Med-Surg. Blueprint: NCSBN NCLEX-RN.',
      }),
    )

    expect(result.displaySafe).toBe(false)
    expect(result.action).toBe('needs_render_review')
    expect(result.issues.map((issue) => issue.code)).toContain('internal_metadata_leak')
  })

  it('turns learner formatting flags into render review instead of clinical scoring changes', () => {
    const question = makeQuestion({ id: 'render-feedback-001' })
    const diagnosis = diagnoseQuestionRenderFeedback(question, [
      {
        id: 'feedback-1',
        createdAt: '2026-06-23T12:00:00.000Z',
        questionId: question.id,
        reason: 'text_overlap',
        renderState: 'review_open',
        route: '/practice-questions',
        viewport: {
          deviceClass: 'desktop',
          height: 1080,
          width: 1920,
        },
      },
    ])

    expect(diagnosis.feedbackCount).toBe(1)
    expect(diagnosis.action).toBe('needs_render_review')
    expect(diagnosis.issueCountsByCode.learner_reported_formatting_issue).toBe(1)
    expect(diagnosis.renderAudit.displaySafe).toBe(true)
  })

  it('audits the full production question bank without display blockers', () => {
    const summary = auditQuestionRenderFormatting(getProductionQuestionsForAudit())

    expect(summary.totalQuestions).toBeGreaterThan(100)
    expect(summary.blockerCount).toBe(0)
    expect(summary.items.every((item) => item.question.id)).toBe(true)
  })
})
