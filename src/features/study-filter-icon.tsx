type FilterKind = 'count' | 'status' | 'type' | 'difficulty'

export const studyFilterArtwork: Record<FilterKind, Record<string, string>> = {
  count: { '5': 'count-5', '10': 'count-10', '15': 'count-15', '20': 'count-20' },
  status: { all: 'status-all', unused: 'status-unused', incorrect: 'status-incorrect' },
  type: { mixed: 'type-mixed', 'multiple-choice': 'type-single', 'select-all-that-apply': 'type-multiple' },
  difficulty: { adaptive: 'difficulty-adaptive', foundation: 'difficulty-foundation', developing: 'difficulty-developing', advanced: 'difficulty-advanced', mixed: 'difficulty-mixed' },
}

export function StudyFilterIcon({ kind, value }: { kind: FilterKind; value: string }) {
  const name = studyFilterArtwork[kind][value]
  return <img className="study-filter-icon" src={`/images/question-bank/filters/${name}.webp`} alt="" width="72" height="72" />
}
