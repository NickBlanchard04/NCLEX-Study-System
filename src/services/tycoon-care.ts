import type { TycoonCareStep, TycoonGameState, TycoonTask } from '../app/types'
import { completeTycoonTaskWithAction } from './tycoon-engine'
import { tycoonScenarios } from '../data/tycoon-scenarios'
import { advanceShiftLoop } from './tycoon-shift-loop'

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
  const combined = task.simulation?.workflow === 'bedside'
  const scannerUsed = combined && !task.simulation?.physicalEquipment && task.simulation?.scenario === 'medication' && (state.upgrades['med-safety-scanner'] ?? 0) > 0
  const steps: TycoonCareStep[] = combined ? task.simulation?.scenario !== 'medication' || scannerUsed ? ['assessment', 'monitor', 'safety'] : ['assessment', 'monitor'] : ['assessment']
  return advanceShiftLoop({ ...state, activeShift: { ...shift,
    equipmentReviewedTaskIds: combined ? [...new Set([...(shift.equipmentReviewedTaskIds ?? []), taskId])] : shift.equipmentReviewedTaskIds,
    tasks: shift.tasks.map((item) => item.id === taskId
    ? { ...item, simulation: item.simulation ? { ...item.simulation, scannerUsed } : undefined, careProgress: { assessmentActionId: actionId, steps } } : item) } })
}

/** Stages are ordered and idempotent. Rewards are issued only after the saved care note. */
export function advanceTycoonCare(state: TycoonGameState, taskId: string, step: TycoonCareStep, shiftId: string): TycoonGameState {
  const shift = state.activeShift, task = shift?.tasks.find((item) => item.id === taskId)
  if (!shift || shift.id !== shiftId || shift.status !== 'running' || !task?.careProgress || step === 'assessment' || nextCareStep(task) !== step) return state
  if (task.simulation && ((step === 'care' && !task.simulation.intervention) || (step === 'reassessment' && !task.simulation.reassessment))) return state
  if (task.simulation?.physicalEquipment && (step === 'documentation' || step === 'safety' && (state.upgrades['med-safety-scanner'] ?? 0) > 0)
    && !shift.worldJobs?.some((job) => job.taskId === taskId && job.kind === (step === 'documentation' ? 'chart' : 'scanner') && job.phase === 'complete')) return state
  const updated: TycoonGameState = { ...state, activeShift: { ...shift,
    tasks: shift.tasks.map((item) => item.id === taskId ? { ...item, simulation: item.simulation && step === 'care' ? { ...item.simulation, condition: item.simulation.condition === 'worsening' ? 'worsening' : 'improving' } : item.simulation, careProgress: { ...task.careProgress!, steps: [...task.careProgress!.steps, step] } } : item),
    equipmentReviewedTaskIds: step === 'monitor' ? [...new Set([...(shift.equipmentReviewedTaskIds ?? []), taskId])] : shift.equipmentReviewedTaskIds,
  } }
  return step === 'documentation' ? completeTycoonTaskWithAction(updated, taskId, task.careProgress.assessmentActionId, shiftId) : updated
}

export function decideTycoonCare(state: TycoonGameState, taskId: string, choice: string, phase: 'care' | 'reassessment', shiftId: string): TycoonGameState {
  const shift = state.activeShift, task = shift?.tasks.find((item) => item.id === taskId)
  if (!shift || shift.id !== shiftId || shift.status !== 'running' || !task?.simulation || nextCareStep(task) !== phase) return state
  const sim = task.simulation, key = `${phase}:${choice}`
  if (sim.attempted.includes(key) || (phase === 'care' ? sim.intervention : sim.reassessment)) return state
  const definition = tycoonScenarios[sim.scenario]
  const option = definition.choices.find((item) => item.id === choice)
  if (phase === 'care' && !option || phase === 'reassessment' && !['improved', 'escalate'].includes(choice)) return state
  const correct = phase === 'care' ? choice === definition.intervention : choice === (sim.condition === 'worsening' ? 'escalate' : 'improved')
  const message = phase === 'care' ? option!.feedback : correct
    ? choice === 'escalate' ? 'Persistent abnormal findings escalated. A further simulated team response and follow-up assessment confirm the onward care plan.' : 'Improved findings recognized. Continue the agreed monitoring plan and document the response.'
    : 'Compare the current symptoms and observations with the original findings. Persistent deterioration needs further escalation.'
  const updated: TycoonGameState = { ...state,
    money: Math.max(0, state.money - (correct ? 0 : 25)),
    patientSafety: Math.max(0, state.patientSafety - (correct ? 0 : 4)),
    activeShift: { ...shift, tasks: shift.tasks.map((item): TycoonTask => item.id !== taskId ? item : { ...item,
      status: correct && phase === 'reassessment' ? 'available' : correct ? item.status : 'deteriorating',
      simulation: { ...sim, attempted: [...sim.attempted, key],
        intervention: correct && phase === 'care' ? choice : sim.intervention,
        reassessment: correct && phase === 'reassessment' ? choice : sim.reassessment,
        condition: correct ? phase === 'reassessment' ? 'stable' : sim.condition : phase === 'care' ? 'worsening' : sim.condition,
      },
    }), events: [{ id: `${shiftId}:${taskId}:${key}`, minute: shift.shiftMinute, type: correct ? 'shift' : 'penalty', title: correct ? phase === 'care' ? 'Care decision' : 'Reassessment recorded' : 'Decision needs review', message, taskId }, ...shift.events] },
  }
  return correct && phase === 'reassessment' ? advanceTycoonCare(updated, taskId, 'reassessment', shiftId) : updated
}
