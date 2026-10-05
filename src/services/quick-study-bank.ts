import data from '../data/quick-study-bank.json'

export const quickStudyBank = data
export type QuickStudyItem = typeof data.questions[number]
// Spread the introductory round across topics, preferring questions not seen yet.
export function getIntroPracticeSet(seenIds: string[] = [], random = Math.random) {
  const seen = new Set(seenIds)
  const groups = [...data.sessions]
  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[groups[i], groups[j]] = [groups[j], groups[i]]
  }
  const selected: QuickStudyItem[] = []
  for (const unseenOnly of [true, false]) {
    for (const group of groups) {
      if (selected.length === 5) return selected
      if (selected.some(item => item.session === group.id)) continue
      const pool = data.questions.filter(item => item.session === group.id && (!unseenOnly || !seen.has(item.id)))
      if (pool.length) selected.push(pool[Math.floor(random() * pool.length)])
    }
  }
  return selected
}
export const quickStudySources = data.sources as Record<string, (string | null)[]>
export function getQuickStudySet(sessionId: number) {
  return data.questions.filter((question) => question.session === sessionId)
}
export function getNextQuickStudySessionId(sessionId: number) {
  const index = data.sessions.findIndex((session) => session.id === sessionId)
  return data.sessions[(index + 1) % data.sessions.length].id
}
export function isQuickStudyCorrect(selected: number[], correct: number[]) {
  return selected.length === correct.length && new Set(selected).size === selected.length && selected.every((choice) => correct.includes(choice))
}
export function getQuickStudyResult(selected: number[], question: QuickStudyItem) {
  if (isQuickStudyCorrect(selected, question.correct)) return 'correct'
  return question.type === 'multiple' && selected.some((choice) => question.correct.includes(choice)) ? 'partial' : 'incorrect'
}
