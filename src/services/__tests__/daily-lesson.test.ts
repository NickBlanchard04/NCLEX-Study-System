import { describe, expect, it } from 'vitest'
import { normalizeQuickStudyProgress, recordQuickStudyAnswer, selectDailyLesson } from '../daily-lesson'
import { quickStudyBank } from '../quick-study-bank'

describe('fresh daily lessons and draft review history', () => {
  it('visits all 80 questions once across sixteen launches, then stops', () => {
    const seen: string[] = []
    for (let round = 0; round < 16; round++) {
      const items = selectDailyLesson(seen)
      expect(items).toHaveLength(5)
      expect(items.every((item) => !seen.includes(item.id))).toBe(true)
      seen.push(...items.map((item) => item.id))
    }
    expect(new Set(seen).size).toBe(80)
    expect(selectDailyLesson(seen)).toEqual([])
  })
  it('returns only remaining unseen questions, without filling with repeats', () => {
    const ids = quickStudyBank.questions.map((item) => item.id)
    expect(selectDailyLesson(ids.slice(0, -2)).map((item) => item.id).sort()).toEqual(ids.slice(-2).sort())
  })
  it('shuffles each selection, not according to a fixed date', () => {
    expect(selectDailyLesson([], () => 0).map((item) => item.id)).not.toEqual(selectDailyLesson([], () => 0.99).map((item) => item.id))
  })
  it('rejects unknown IDs and duplicate review entries', () => {
    const id = quickStudyBank.questions[0].id
    expect(normalizeQuickStudyProgress({ seenIds: [id, id, 'unknown'], savedIds: [id] })).toEqual({ seenIds: [id], savedIds: [id], missedIds: [] })
    expect(normalizeQuickStudyProgress(null)).toEqual({ seenIds: [], savedIds: [], missedIds: [] })
  })
  it('adds misses, removes repaired misses and preserves explicit saves', () => {
    const id = quickStudyBank.questions[0].id
    const initial = normalizeQuickStudyProgress({ savedIds: [id] })
    const miss = recordQuickStudyAnswer(initial, id, false)
    expect(miss.missedIds).toEqual([id])
    expect(recordQuickStudyAnswer(miss, id, false).missedIds).toEqual([id])
    expect(recordQuickStudyAnswer(miss, id, true)).toEqual({ seenIds: [id], savedIds: [id], missedIds: [] })
  })
})
