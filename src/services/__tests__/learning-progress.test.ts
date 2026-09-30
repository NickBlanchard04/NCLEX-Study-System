import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ state: {
  authInitialized: true, authUser: { id: 'account-a' } as { id: string } | null,
  isDemoMode: false, syncStatus: 'idle',
  profile: { userId: 'account-a', preferences: { quickStudy: { seenIds: [] as string[], savedIds: [] as string[], missedIds: [] as string[] } } },
  updateProfile: vi.fn(),
} }))
vi.mock('../../app/store', () => ({ useStudySystemStore: { getState: () => mock.state } }))
import { launchDailyLesson, updateLearningProgress } from '../learning-progress'

describe('learning progress account boundary', () => {
  beforeEach(() => {
    mock.state.authInitialized = true
    mock.state.authUser = { id: 'account-a' }
    mock.state.isDemoMode = false
    mock.state.syncStatus = 'idle'
    mock.state.profile.userId = 'account-a'
    mock.state.profile.preferences.quickStudy = { seenIds: [], savedIds: [], missedIds: [] }
    mock.state.updateProfile.mockReset()
    mock.state.updateProfile.mockImplementation((update) => { mock.state.profile.preferences = update.preferences })
  })
  it('reserves fresh question IDs before navigating and does not reuse the last lesson', () => {
    const first = launchDailyLesson()!
    const second = launchDailyLesson()!
    expect(first).toHaveLength(5)
    expect(second.every((item) => !first.some((previous) => previous.id === item.id))).toBe(true)
    expect(mock.state.profile.preferences.quickStudy.seenIds).toHaveLength(10)
  })
  it('never writes private review data for guests or a different account', () => {
    mock.state.authUser = null
    expect(updateLearningProgress((current) => current)).toBe(false)
    mock.state.authUser = { id: 'account-b' }
    expect(updateLearningProgress((current) => current)).toBe(false)
    expect(launchDailyLesson()).toBeNull()
    expect(mock.state.updateProfile).not.toHaveBeenCalled()
  })
  it('waits for initialization and blocks writes while hydration is in progress or failed', () => {
    mock.state.authInitialized = false
    expect(launchDailyLesson()).toBeNull()
    mock.state.authInitialized = true
    for (const status of ['syncing', 'error']) {
      mock.state.syncStatus = status
      expect(launchDailyLesson()).toBeNull()
      expect(updateLearningProgress((current) => current)).toBe(false)
    }
    expect(mock.state.updateProfile).not.toHaveBeenCalled()
  })
})
