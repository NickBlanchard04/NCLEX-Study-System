import type { TycoonCareStep, TycoonGameState } from '../app/types'

export type CareCompletion = { id: string; taskId: string; step: TycoonCareStep; reward?: { money: number; xp: number } }
/** Read committed transitions only: hydration and repeated renders cannot reward or replay care. */
export function careCompletions(before: TycoonGameState, after: TycoonGameState): CareCompletion[] {
  const previous = before.activeShift, current = after.activeShift
  if (!previous || !current || previous.id !== current.id) return []
  return current.tasks.flatMap(task => {
    const old = previous.tasks.find(item => item.id === task.id)
    if (!old) return []
    const added = task.careProgress?.steps.filter(step => !old.careProgress?.steps.includes(step)) ?? []
    if (!added.length) return []
    const step = added.includes('assessment') ? 'assessment' : added.at(-1)!
    return [{ id: `${current.id}:${task.id}:${step}`, taskId: task.id, step,
      reward: task.status === 'completed' && old.status !== 'completed' ? task.payout : undefined }]
  })
}
