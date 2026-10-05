import { describe, expect, it } from 'vitest'
import { getIntroPracticeSet, quickStudyBank } from '../quick-study-bank'

describe('introductory practice', () => {
  it('selects five different topics without modifying the bank', () => {
    const before = JSON.stringify(quickStudyBank)
    const items = getIntroPracticeSet([], () => 0.4)
    expect(items).toHaveLength(5)
    expect(new Set(items.map(item => item.session)).size).toBe(5)
    expect(JSON.stringify(quickStudyBank)).toBe(before)
  })
  it('avoids seen questions when unseen questions remain', () => {
    const first = getIntroPracticeSet([], () => 0.4)
    const next = getIntroPracticeSet(first.map(item => item.id), () => 0.4)
    expect(next).toHaveLength(5)
    expect(next.every(item => !first.some(previous => previous.id === item.id))).toBe(true)
  })
  it('still offers practice after exhausting the pool', () => {
    expect(getIntroPracticeSet(quickStudyBank.questions.map(item => item.id))).toHaveLength(5)
  })
})
