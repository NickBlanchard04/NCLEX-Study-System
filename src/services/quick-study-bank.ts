import data from '../data/quick-study-bank.json'

export const quickStudyBank = data
export type QuickStudyItem = typeof data.questions[number]
export const quickStudySources = data.sources as Record<string, (string | null)[]>
export function getQuickStudySet(sessionId: number) {
  return data.questions.filter((question) => question.session === sessionId)
}
export function isQuickStudyCorrect(selected: number[], correct: number[]) {
  return selected.length === correct.length && new Set(selected).size === selected.length && selected.every((choice) => correct.includes(choice))
}
export function getQuickStudyResult(selected: number[], question: QuickStudyItem) {
  if (isQuickStudyCorrect(selected, question.correct)) return 'correct'
  return question.type === 'multiple' && selected.some((choice) => question.correct.includes(choice)) ? 'partial' : 'incorrect'
}
