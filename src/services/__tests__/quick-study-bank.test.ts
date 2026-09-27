import { describe, expect, it } from 'vitest'
import { getQuickStudyResult, getQuickStudySet, isQuickStudyCorrect, quickStudyBank, quickStudySources } from '../quick-study-bank'

describe('50-question Quick Study draft bank', () => {
  it('has ten five-question sets with valid unique draft items and sources', () => {
    expect(quickStudyBank.questions).toHaveLength(50)
    expect(new Set(quickStudyBank.questions.map((item) => item.id)).size).toBe(50)
    for (const session of quickStudyBank.sessions) expect(getQuickStudySet(session.id)).toHaveLength(5)
    for (const item of quickStudyBank.questions) {
      expect(new Set(item.choices).size).toBe(4)
      expect(item.reviewStatus).toBe('draft-not-SME-reviewed')
      expect(item.correct.length).toBeGreaterThan(0)
      expect(item.correct.every((value) => Number.isInteger(value) && value >= 0 && value < 4)).toBe(true)
      expect(item.sources.every((key) => quickStudySources[key])).toBe(true)
      expect(item.type === 'multiple').toBe(item.correct.length > 1)
      expect(getQuickStudyResult(item.correct, item)).toBe('correct')
    }
  })
  it('requires exact matching and distinguishes partial answers', () => {
    expect(isQuickStudyCorrect([0, 2], [2, 0])).toBe(true)
    expect(isQuickStudyCorrect([0, 0], [0, 2])).toBe(false)
    const item = getQuickStudySet(1)[4]
    expect(getQuickStudyResult([0], item)).toBe('partial')
    expect(getQuickStudyResult([1], item)).toBe('incorrect')
    expect(getQuickStudyResult([0, 1, 2, 3], item)).toBe('partial')
  })
  it('has independently verified arithmetic keys', () => {
    const answers = [375 / 125, 180 / 120 * 5, 600 / 5, 6 * 18, 90 * 20 / 45]
    getQuickStudySet(9).forEach((item, index) => expect(parseFloat(item.choices[item.correct[0]])).toBe(answers[index]))
  })
})
