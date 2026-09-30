import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeStudyResult, readStudyLocal, safeStudyReturn, validStudyResult, writeStudyLocal } from '../study-handoff'
import { readQuickStudyRound } from '../quick-study-resume'

describe('guest study handoff', () => {
  const data = new Map<string, string>()
  const result = { id: 'round-1', title: 'Practice', route: '/quick-study', completedAt: '2026-09-28T12:00:00Z', total: 5, answers: [{ id: 'NCDEMO-001', correct: true }] }
  beforeEach(() => {
    data.clear()
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
  it('returns to the original result without carrying auth or external redirect parameters', () => {
    expect(safeStudyReturn('/test-mode?studyResult=round-1&auth=signup&next=https://evil.test')).toBe('/test-mode?studyResult=round-1')
    for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/admin', '/test-mode/../settings', '/quick-study?studyResult=../../bad']) {
      expect(safeStudyReturn(value) ?? '').not.toContain('evil.test')
    }
    expect(safeStudyReturn('/admin')).toBeNull()
    expect(safeStudyReturn('//evil.test')).toBeNull()
  })
  it('round-trips guest results separately from account state', () => {
    expect(writeStudyLocal('result:round-1', result)).toBe(true)
    expect(readStudyLocal('result:round-1')).toEqual(result)
    expect(data.has('nclex-study-system')).toBe(false)
  })
  it('expires local data after thirty days', () => {
    vi.useFakeTimers(); writeStudyLocal('result', result)
    vi.advanceTimersByTime(31 * 86400000)
    expect(readStudyLocal('result')).toBeNull()
  })
  it('handles blocked storage and corrupt JSON without losing the current screen', () => {
    data.set('nc-study-v1:result', '{broken')
    expect(readStudyLocal('result')).toBeNull()
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('Blocked') }, getItem: () => { throw new Error('Blocked') } })
    expect(writeStudyLocal('result', result)).toBe(false)
    expect(readStudyLocal('result')).toBeNull()
  })
  it('validates results and merges idempotently without dropping earlier history', () => {
    expect(validStudyResult(result)).toBe(true)
    expect(validStudyResult({ ...result, answers: [null] })).toBe(false)
    expect(validStudyResult({ ...result, total: -1 })).toBe(false)
    expect(validStudyResult({ ...result, route: 'https://evil.test' })).toBe(false)
    expect(mergeStudyResult([{ ...result, id: 'older' }, result], result).map((r) => r.id)).toEqual(['round-1', 'older'])
  })
  it('rejects corrupt saved practice rounds', () => {
    const round = { id: 'round-1', startedAt: result.completedAt, sessionId: 1, ids: ['NCDEMO-001'], index: 0, selected: [1], checked: true, results: result.answers, finished: false, retry: false }
    writeStudyLocal('round', round)
    expect(readQuickStudyRound('round')).toEqual(round)
    writeStudyLocal('round', { ...round, index: 7 })
    expect(readQuickStudyRound('round')).toBeNull()
    writeStudyLocal('round', { ...round, ids: ['removed-question'] })
    expect(readQuickStudyRound('round')).toBeNull()
  })
})
