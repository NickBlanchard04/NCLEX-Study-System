import { quickStudyBank } from './quick-study-bank'
import { readStudyLocal } from './study-handoff'
export interface QuickStudyRound {
  id: string; startedAt: string; sessionId: number; ids: string[]; index: number; selected: number[];
  checked: boolean; results: { id: string; correct: boolean }[]; finished: boolean; retry: boolean; completedAt?: string
}
export function readQuickStudyRound(key: string): QuickStudyRound | null {
  const value = readStudyLocal<QuickStudyRound>(key)
  if (!value || typeof value.id !== 'string' || typeof value.startedAt !== 'string' || !Number.isFinite(Date.parse(value.startedAt)) || !quickStudyBank.sessions.some((s) => s.id === value.sessionId) ||
    !Array.isArray(value.ids) || !value.ids.length || value.ids.length > 5 || !value.ids.every((id) => quickStudyBank.questions.some((q) => q.id === id)) ||
    !Number.isInteger(value.index) || value.index < 0 || value.index >= value.ids.length || !Array.isArray(value.selected) || !value.selected.every((n) => Number.isInteger(n) && n >= 0 && n < 4) ||
    !Array.isArray(value.results) || value.results.length > value.ids.length || !value.results.every((r) => value.ids.includes(r.id) && typeof r.correct === 'boolean') ||
    typeof value.checked !== 'boolean' || typeof value.finished !== 'boolean' || typeof value.retry !== 'boolean') return null
  return value
}
