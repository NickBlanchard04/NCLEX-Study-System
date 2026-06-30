import { describe, expect, it } from 'vitest'
import {
  getInternalDraftFixtureQuestions,
  internalPriorityClientsFlashcards,
  internalPriorityClientsStandaloneQuestions,
} from '../internal-draft-fixtures'

describe('internal draft fixtures', () => {
  it('keeps Priority Clients fixture questions internal and draft-only', () => {
    expect(internalPriorityClientsStandaloneQuestions).toHaveLength(3)

    internalPriorityClientsStandaloneQuestions.forEach((question) => {
      expect(question.learnerVisible).toBe(false)
      expect(question.visibility).toBe('internal')
      expect(question.contentStage).toBe('beta_draft')
      expect(question.sourceStatus).toBe('source_needed')
      expect(question.clinicalReviewStatus).toBe('not_sme_reviewed')
      expect(question.countsTowardOfficialReadiness).toBe(false)
      expect(question.sourceBacked).toBe(false)
      expect(question.contentQuality).toBe('authored-draft')
      expect(question.feedbackEnabled).toBe(true)
      expect(question.format).toBe('multiple-choice')
      expect(question.correctAnswer).toHaveLength(1)
      expect(question.choices.some((choice) => choice.id === question.correctAnswer[0])).toBe(true)
    })
  })

  it('only exposes internal fixture questions when the hidden flag is enabled at build time', () => {
    const expected = import.meta.env.VITE_ENABLE_INTERNAL_CONTENT_FIXTURES === 'true'
      ? internalPriorityClientsStandaloneQuestions
      : []

    expect(getInternalDraftFixtureQuestions('nclex-rn')).toEqual(expected)
  })

  it('does not apply trusted-bank labels to the internal fixture adapter', () => {
    const serialized = JSON.stringify([
      ...internalPriorityClientsStandaloneQuestions,
      ...internalPriorityClientsFlashcards,
    ]).toLowerCase()

    expect(serialized).not.toContain('source_checked')
    expect(serialized).not.toContain('approved')
    expect(serialized).not.toContain('sme verified')
  })

  it('keeps linked Priority Clients flashcards available for internal remediation routing', () => {
    const flashcardIds = new Set(internalPriorityClientsFlashcards.map((card) => card.id))

    expect(internalPriorityClientsFlashcards).toHaveLength(6)
    internalPriorityClientsStandaloneQuestions.forEach((question) => {
      expect(question.relatedFlashcardIds?.length).toBeGreaterThan(0)
      question.relatedFlashcardIds?.forEach((id) => expect(flashcardIds.has(id)).toBe(true))
    })
  })
})
