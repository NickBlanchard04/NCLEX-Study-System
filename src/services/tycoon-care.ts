import type { TycoonCareStep, TycoonGameState, TycoonTask } from '../app/types'
import { completeTycoonTaskWithAction } from './tycoon-engine'

export const CARE_STEPS: readonly TycoonCareStep[] = ['assessment', 'monitor', 'safety', 'care', 'reassessment', 'documentation']
export const CARE_LABELS: Record<TycoonCareStep, string> = {
  assessment: 'Assess patient', monitor: 'Check monitor', safety: 'Bedside safety check',
  care: 'Provide care', reassessment: 'Reassess patient', documentation: 'Chart at station',
}
export function nextCareStep(task: Pick<TycoonTask, 'status' | 'careProgress'>): TycoonCareStep | null {
  if (task.status === 'completed' || task.status === 'failed') return null
  return CARE_STEPS.find((step) => !task.careProgress?.steps.includes(step)) ?? null
}
export function careDestination(task: TycoonTask): string {
  const step = nextCareStep(task)
  return step === 'monitor' ? `equipment:${task.id}` : step === 'safety' ? `safety:${task.id}` : step === 'documentation' ? 'station' : `patient:${task.id}`
}

export function assessTycoonPatient(state: TycoonGameState, taskId: string, actionId: string, shiftId: string): TycoonGameState {
  const shift = state.activeShift, task = shift?.tasks.find((item) => item.id === taskId)
  if (!shift || shift.id !== shiftId || shift.status !== 'running' || !task || nextCareStep(task) !== 'assessment') return state
  if (actionId !== task.correctActionId) return completeTycoonTaskWithAction(state, taskId, actionId, shiftId)
  return { ...state, activeShift: { ...shift, tasks: shift.tasks.map((item) => item.id === taskId
    ? { ...item, careProgress: { assessmentActionId: actionId, steps: ['assessment'] } } : item) } }
}

/** Stages are ordered and idempotent. Rewards are issued only after the saved care note. */
export function advanceTycoonCare(state: TycoonGameState, taskId: string, step: TycoonCareStep, shiftId: string): TycoonGameState {
  const shift = state.activeShift, task = shift?.tasks.find((item) => item.id === taskId)
  if (!shift || shift.id !== shiftId || shift.status !== 'running' || !task?.careProgress || step === 'assessment' || nextCareStep(task) !== step) return state
  const updated: TycoonGameState = { ...state, activeShift: { ...shift,
    tasks: shift.tasks.map((item) => item.id === taskId ? { ...item, careProgress: { ...task.careProgress!, steps: [...task.careProgress!.steps, step] } } : item),
    equipmentReviewedTaskIds: step === 'monitor' ? [...new Set([...(shift.equipmentReviewedTaskIds ?? []), taskId])] : shift.equipmentReviewedTaskIds,
  } }
  return step === 'documentation' ? completeTycoonTaskWithAction(updated, taskId, task.careProgress.assessmentActionId, shiftId) : updated
}
