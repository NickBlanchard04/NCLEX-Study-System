import { describe, expect, it } from 'vitest'
import { getNextQuickStudySessionId, getQuickStudyResult, getQuickStudySet, isQuickStudyCorrect, quickStudyBank, quickStudySources } from '../quick-study-bank'

describe('80-question Quick Study draft bank', () => {
  it('has sixteen five-question sets with valid unique draft items and sources', () => {
    expect(quickStudyBank.questions).toHaveLength(80)
    expect(new Set(quickStudyBank.questions.map((item) => item.id)).size).toBe(80)
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
  it('adds four infection-prevention rounds with per-choice explanations', () => {
    const items = quickStudyBank.questions.filter((item) => item.topic === 'Infection prevention')
    expect(items).toHaveLength(20)
    expect(new Set(items.map((item) => item.session)).size).toBe(4)
    expect(new Set(items.map((item) => item.prompt)).size).toBe(20)
    expect(items.map((item) => item.correct[0])).toEqual([1, 3, 0, 2, 1, 2, 0, 3, 1, 2, 0, 2, 1, 3, 2, 3, 0, 2, 1, 0])
    for (const item of items) {
      expect(item.type).toBe('single')
      expect(item.choiceRationales).toHaveLength(4)
      expect(item.choiceRationales.every((reason) => reason.length > 30)).toBe(true)
      expect(item.sources.every((key) => quickStudySources[key][1]?.startsWith('https://www.cdc.gov/'))).toBe(true)
    }
  })
  it('advances through every session and wraps only after the last', () => {
    expect(quickStudyBank.sessions).toHaveLength(16)
    quickStudyBank.sessions.forEach((session, index) => {
      expect(getNextQuickStudySessionId(session.id)).toBe(quickStudyBank.sessions[(index + 1) % quickStudyBank.sessions.length].id)
    })
  })
  it('requires exact matching and distinguishes partial answers', () => {
    expect(isQuickStudyCorrect([0, 2], [2, 0])).toBe(true)
    expect(isQuickStudyCorrect([0, 0], [0, 2])).toBe(false)
    const item = getQuickStudySet(1)[4]
    expect(getQuickStudyResult([0], item)).toBe('partial')
    expect(getQuickStudyResult([1], item)).toBe('incorrect')
    expect(getQuickStudyResult([0, 1, 2, 3], item)).toBe('partial')
  })
  it('verifies every new medication calculation with independent arithmetic', () => {
    const expected = [
      [0.75 * 1000 / 250, 'tablets'],
      [120 / (80 / 2), 'mL'],
      [500 / 1000 / 1, 'mL'],
      [1.2 / 0.4, 'mL'],
      [Math.round(210 * 5 / 125 * 10) / 10, 'mL'],
      [1000 / 8, 'mL/hr'],
      [150 / (45 / 60), 'mL/hr'],
      [Math.round(250 * 15 / (2 * 60)), 'drops/min'],
      [400 / 250 * 30, 'mg/hr'],
      [24 / (120 / 100), 'mL/hr'],
      [66 / 2.2 * 8, 'mg'],
      [30 * 18 / 3, 'mg'],
      [6 * 25 * 5 / 100, 'mL'],
      [2 * 60 * 60 / 1000 / (50 / 250), 'mL/hr'],
    ] as const
    const added = quickStudyBank.questions.filter((item) => item.id.startsWith('NCMATH-'))
    expect(added).toHaveLength(15)
    expect(quickStudyBank.questions.filter((item) => item.topic === 'Medication calculations')).toHaveLength(20)
    added.slice(0, 14).forEach((item, index) => {
      const answer = item.choices[item.correct[0]]
      expect(parseFloat(answer)).toBeCloseTo(expected[index][0], 8)
      expect(answer.endsWith(expected[index][1])).toBe(true)
    })
    const dailyTotal = 100 * 3
    expect(dailyTotal).toBeGreaterThanOrEqual(12 * 20)
    expect(dailyTotal).toBeLessThanOrEqual(18 * 20)
    expect(added[14].choices[added[14].correct[0]]).toBe('300 mg/day; within the range')
    for (const item of added) {
      expect(item.type).toBe('single')
      expect(item.choiceRationales).toHaveLength(4)
      expect(item.choiceRationales.every((reason) => reason.length > 30)).toBe(true)
      expect(item.sources).toEqual(['math'])
      for (let choice = 0; choice < 4; choice++) {
        expect(getQuickStudyResult([choice], item)).toBe(item.correct.includes(choice) ? 'correct' : 'incorrect')
      }
    }
  })
  it('has independently verified arithmetic keys', () => {
    const answers = [375 / 125, 180 / 120 * 5, 600 / 5, 6 * 18, 90 * 20 / 45]
    getQuickStudySet(quickStudyBank.sessions.find((session) => session.title === 'Medication calculations')!.id).forEach((item, index) => expect(parseFloat(item.choices[item.correct[0]])).toBe(answers[index]))
  })
})
