import { quickStudyBank } from './quick-study-bank'

export interface QuickStudyProgress {
  seenIds: string[]
  savedIds: string[]
  missedIds: string[]
}

const validIds = new Set(quickStudyBank.questions.map((question) => question.id))
export function normalizeQuickStudyProgress(value?: Partial<QuickStudyProgress> | null): QuickStudyProgress {
  const clean = (ids: unknown) => Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string' && validIds.has(id)))] : []
  return { seenIds: clean(value?.seenIds), savedIds: clean(value?.savedIds), missedIds: clean(value?.missedIds) }
}

// A fresh shuffle per launch, not a date-seeded or cached lesson. Exhaustion is explicit.
export function selectDailyLesson(seenIds: string[], random = Math.random) {
  const seen = new Set(seenIds)
  const available = quickStudyBank.questions.filter((question) => !seen.has(question.id))
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[available[i], available[j]] = [available[j], available[i]]
  }
  return available.slice(0, 5)
}

export function recordQuickStudyAnswer(progress: QuickStudyProgress, id: string, correct: boolean): QuickStudyProgress {
  return normalizeQuickStudyProgress({
    ...progress,
    seenIds: [...progress.seenIds, id],
    missedIds: correct ? progress.missedIds.filter((item) => item !== id) : [...progress.missedIds, id],
  })
}

const guestKey = 'nurse-command-guest-question-history-v1'
let guestMemory: string[] = []
export function readGuestSeenIds(): string[] {
  try {
    const stored = normalizeQuickStudyProgress({ seenIds: JSON.parse(localStorage.getItem(guestKey) ?? '[]') }).seenIds
    guestMemory = [...new Set([...guestMemory, ...stored])]
  } catch { /* Storage can be disabled; retain this tab's history. */ }
  return guestMemory
}
export function writeGuestSeenIds(ids: string[]) {
  guestMemory = normalizeQuickStudyProgress({ seenIds: ids }).seenIds
  try { localStorage.setItem(guestKey, JSON.stringify(guestMemory)) } catch { /* In-memory fallback. */ }
}
