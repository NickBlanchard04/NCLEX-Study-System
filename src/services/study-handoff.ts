export interface SavedStudyResult {
  id: string
  title: string
  route: string
  completedAt: string
  total: number
  answers: { id: string; correct: boolean }[]
}

const allowedRoutes = new Set(['/quick-study', '/daily-lesson', '/practice-questions', '/test-mode', '/exam-prep', '/study-results'])
export function safeStudyReturn(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  try {
    const url = new URL(value, 'https://study.invalid')
    if (url.origin !== 'https://study.invalid' || !allowedRoutes.has(url.pathname)) return null
    const id = url.searchParams.get('studyResult')
    return url.pathname + (id && /^[\w-]{1,100}$/.test(id) ? `?studyResult=${id}` : '')
  } catch { return null }
}

// Browser-local guest data is deliberately separate from the account store.
export function readStudyLocal<T>(key: string): T | null {
  try {
    const record = JSON.parse(localStorage.getItem(`nc-study-v1:${key}`) ?? 'null')
    if (!record || !Number.isFinite(record.expires) || record.expires < Date.now()) return null
    return record.value as T
  } catch { return null }
}
export function writeStudyLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(`nc-study-v1:${key}`, JSON.stringify({ expires: Date.now() + 30 * 86400000, value }))
    return true
  } catch { return false }
}
export function validStudyResult(value: unknown): value is SavedStudyResult {
  if (!value || typeof value !== 'object') return false
  const result = value as SavedStudyResult
  return typeof result.id === 'string' && /^[\w-]{1,100}$/.test(result.id) && typeof result.title === 'string' && result.title.length <= 100 &&
    safeStudyReturn(result.route) === result.route && typeof result.completedAt === 'string' && Number.isFinite(Date.parse(result.completedAt)) &&
    Number.isInteger(result.total) && result.total > 0 && result.total <= 500 && Array.isArray(result.answers) && result.answers.length <= result.total &&
    new Set(result.answers.map((a) => a?.id)).size === result.answers.length && result.answers.every((a) => typeof a?.id === 'string' && a.id.length <= 150 && typeof a.correct === 'boolean')
}
export function mergeStudyResult(existing: SavedStudyResult[] | undefined, result: SavedStudyResult) {
  return [result, ...(Array.isArray(existing) ? existing.filter(validStudyResult) : []).filter((item) => item.id !== result.id)].slice(0, 100)
}
