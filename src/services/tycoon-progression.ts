import type { TycoonGameState } from '../app/types'

export function successfulShiftCount(state: TycoonGameState): number {
  return state.successfulShifts ?? state.completedShifts.filter((shift) => shift.payoutSummary?.objectiveMet).length
}
export function upgradeRequirement(state: TycoonGameState, id: string): string | null {
  const required = id === 'simulation-room' ? 2 : ['extra-bed', 'staff-training', 'med-safety-scanner'].includes(id) ? 1 : 0
  const completed = successfulShiftCount(state)
  return completed < required ? `Complete ${required} successful shift${required === 1 ? '' : 's'} (${completed}/${required})` : null
}
