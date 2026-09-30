import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../../app/types'
const mock = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn() }))
vi.mock('../supabase', () => ({ isSupabaseConfigured: true, supabase: { from: mock.from } }))
import { loadCloudState, saveProfile } from '../cloud-repositories'

describe('private draft review profile round-trip', () => {
  const quickStudy = { seenIds: ['NCDEMO-001'], savedIds: ['NCDEMO-001'], missedIds: ['NCDEMO-002'] }
  const studyResults = [{ id: 'guest-result', title: 'Practice', route: '/quick-study', completedAt: '2026-09-28T12:00:00Z', total: 5, answers: [{ id: 'NCDEMO-001', correct: true }] }]
  beforeEach(() => { mock.from.mockReset(); mock.upsert.mockReset() })
  it('loads question IDs only from the requested owner profile', async () => {
    const filters: string[] = []
    mock.from.mockImplementation((table: string) => {
      const result = Promise.resolve({ data: table === 'profiles' ? { name: 'Test', preferences: { quickStudy, studyResults } } : [], error: null })
      const chain = Object.assign(result, {
        select: () => chain, eq: (column: string, owner: string) => { filters.push(`${table}:${column}:${owner}`); return chain },
        is: () => chain, maybeSingle: () => chain,
      })
      return chain
    })
    const state = await loadCloudState('owner-a')
    expect(state.profile?.preferences.quickStudy).toEqual(quickStudy)
    expect(state.profile?.preferences.studyResults).toEqual(studyResults)
    expect(state.profile?.userId).toBe('owner-a')
    expect(filters).toContain('profiles:id:owner-a')
    expect(state.attempts).toEqual([])
  })
  it('saves draft review IDs in profile preferences, not question attempts', async () => {
    mock.from.mockReturnValue({ upsert: mock.upsert.mockResolvedValue({ error: null }) })
    const profile: UserProfile = { name: 'Test', examTrack: 'nclex-rn', examDate: '2027-01-01', studyIntensity: 'focused', dailyGoal: 5, streak: 0,
      preferences: { reducedMotion: false, notifications: false, analyticsScope: 'selected-track', quickStudy, studyResults } }
    await saveProfile('owner-a', profile)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.from).toHaveBeenCalledWith('profiles')
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'owner-a', preferences: expect.objectContaining({ quickStudy, studyResults }) }))
  })
})
