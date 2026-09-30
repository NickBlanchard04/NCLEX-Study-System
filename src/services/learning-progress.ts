import { useStudySystemStore } from '../app/store'
import { normalizeQuickStudyProgress, readGuestSeenIds, selectDailyLesson, writeGuestSeenIds } from './daily-lesson'
import type { QuickStudyProgress } from './daily-lesson'

export function updateLearningProgress(update: (current: QuickStudyProgress) => QuickStudyProgress) {
  const state = useStudySystemStore.getState()
  if (!state.authInitialized || !state.authUser || state.isDemoMode || state.profile.userId !== state.authUser.id || state.syncStatus === 'syncing' || state.syncStatus === 'error') return false
  state.updateProfile({ preferences: { ...state.profile.preferences, quickStudy: update(normalizeQuickStudyProgress(state.profile.preferences.quickStudy)) } })
  return true
}

export function launchDailyLesson(repeat = false) {
  const state = useStudySystemStore.getState()
  if (!state.authInitialized) return null
  if (state.authUser && (state.isDemoMode || state.profile.userId !== state.authUser.id || state.syncStatus === 'syncing' || state.syncStatus === 'error')) return null
  const progress = normalizeQuickStudyProgress(state.profile.preferences.quickStudy)
  const seen = repeat ? [] : state.authUser ? progress.seenIds : readGuestSeenIds()
  const items = selectDailyLesson(seen)
  const nextSeen = [...seen, ...items.map((question) => question.id)]
  if (state.authUser) updateLearningProgress((current) => ({ ...current, seenIds: nextSeen }))
  else writeGuestSeenIds(nextSeen)
  return items
}
