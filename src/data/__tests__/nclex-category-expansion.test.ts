import { describe, expect, it } from 'vitest'
import { getExamQuestionBank } from '../content'
import { nclexCategoryExpansion } from '../nclex-category-expansion'

describe('NCLEX category expansion', () => {
  it('adds five questions in each requested category', () => {
    expect(nclexCategoryExpansion).toHaveLength(25)
    for (const category of ['Management of Care', 'Safety and Infection Control', 'Health Promotion', 'Psychosocial Integrity', 'Physiological Integrity']) {
      expect(nclexCategoryExpansion.filter((q) => q.category === category)).toHaveLength(5)
    }
  })

  it('integrates unique questions into the RN bank only', () => {
    const bank = getExamQuestionBank('nclex-rn')
    expect(new Set(bank.map((q) => q.id)).size).toBe(bank.length)
    for (const question of nclexCategoryExpansion) {
      expect(bank.find((q) => q.id === question.id)).toEqual(question)
      expect(getExamQuestionBank('nclex-pn').some((q) => q.id === question.id)).toBe(false)
    }
  })

  it('has complete answer keys, feedback, and sentence formatting', () => {
    for (const question of nclexCategoryExpansion) {
      expect(question.choices).toHaveLength(4)
      expect(new Set(question.choices.map((c) => c.text)).size).toBe(4)
      expect(question.correctAnswer).toHaveLength(1)
      expect(question.choices.map((c) => c.id)).toContain(question.correctAnswer[0])
      expect(question.prompt.endsWith('?')).toBe(true)
      for (const choice of question.choices) {
        expect(choice.text).toMatch(/^[A-Z0-9]/)
        expect(choice.text).toMatch(/[.?]$/)
        expect(question.rationale.choices?.[choice.id]).toBeTruthy()
      }
    }
    expect(new Set(nclexCategoryExpansion.map((q) => q.correctAnswer[0])).size).toBe(4)
  })

  it('preserves honest draft status and authoritative answer sources', () => {
    for (const question of nclexCategoryExpansion) {
      expect(question.contentQuality).toBe('authored-draft')
      expect(question.clinicalReviewStatus).toBe('not_sme_reviewed')
      expect(question.countsTowardOfficialReadiness).toBe(false)
      expect(question.sourceRefs?.[0]).toMatch(/^https:\/\/(ncsbn\.org|www\.cdc\.gov|.*\.nih\.gov|www\.niddk\.nih\.gov|www\.nimh\.nih\.gov)\//)
      expect(question.learnerVisible).toBe(true)
    }
  })
})
