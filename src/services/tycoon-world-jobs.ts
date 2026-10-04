import type { TycoonGameState, TycoonWorldJob } from '../app/types'
import { advanceTycoonCare, nextCareStep } from './tycoon-care'
import { ROOM_STOPS, STATION_POSITION, roomPoint } from '../game/tycoon-ward-layout'

export const worldJobActive = (job: TycoonWorldJob) => job.phase !== 'complete' && job.phase !== 'cancelled'
export const worldWorkMs = (phase: TycoonWorldJob['phase']) => phase === 'reporting' ? 1200 : 2000
const near = (a: { u: number; v: number }, b: { u: number; v: number }) => Number.isFinite(a.u) && Number.isFinite(a.v) && Math.hypot(a.u - b.u, a.v - b.v) <= 0.35

export function queueWorldJob(state: TycoonGameState, taskId: string, kind: 'lab' | 'scanner' | 'chart', shiftId: string, position?: { u: number; v: number }, noteId?: string): TycoonGameState {
  const shift = state.activeShift, index = shift?.tasks.findIndex((task) => task.id === taskId) ?? -1, task = shift?.tasks[index]
  if (!shift?.loop?.physicalInteractions || shift.id !== shiftId || shift.status !== 'running' || !task?.simulation || task.simulation.discharged || ['completed', 'failed'].includes(task.status)) return state
  const jobs = shift.worldJobs ?? []
  if (jobs.some((job) => job.taskId === taskId && job.kind === kind && job.phase !== 'cancelled')) return state
  if (kind !== 'lab' && jobs.some((job) => ['scanner', 'chart'].includes(job.kind) && worldJobActive(job))) return state
  if (kind === 'lab' && (!(state.upgrades['lab-runner'] > 0) || task.category !== 'vitals' || !task.careProgress?.steps.includes('assessment'))) return state
  if (kind === 'scanner' && (!(state.upgrades['med-safety-scanner'] > 0) || task.simulation.scenario !== 'medication' || nextCareStep(task) !== 'safety')) return state
  if (kind === 'chart' && (nextCareStep(task) !== 'documentation' || !noteId)) return state
  const anchor = kind === 'chart' || kind === 'lab' ? STATION_POSITION : roomPoint(index, ROOM_STOPS.safety)
  if (kind !== 'lab' && (!position || !near(position, anchor))) return state
  const job: TycoonWorldJob = { id: `${shift.id}:${taskId}:${kind}`, taskId, noteId, kind, phase: kind === 'lab' ? 'to-patient' : 'working', anchor: { ...anchor } }
  return { ...state, activeShift: { ...shift, worldJobs: [...jobs.filter((item) => item.id !== job.id), job] } }
}

/** Arrival includes an expected phase and position. Replayed, remote, stale and early completions are no-ops. */
export function advanceWorldJob(state: TycoonGameState, jobId: string, phase: TycoonWorldJob['phase'], position: { u: number; v: number }, workedMs: number, shiftId: string): TycoonGameState {
  const shift = state.activeShift, job = shift?.worldJobs?.find((item) => item.id === jobId)
  if (!shift || shift.id !== shiftId || shift.status !== 'running' || !job || job.phase !== phase || !worldJobActive(job)) return state
  const index = shift.tasks.findIndex((task) => task.id === job.taskId), task = shift.tasks[index]
  if (!task || task.simulation?.discharged) return state
  const station = phase === 'to-station' || phase === 'reporting' || job.kind === 'chart'
  const expected = station ? STATION_POSITION : roomPoint(index, job.kind === 'scanner' ? ROOM_STOPS.safety : ROOM_STOPS.patient)
  if (!near(position, expected) || (phase === 'working' || phase === 'reporting') && (!Number.isFinite(workedMs) || workedMs < worldWorkMs(phase))) return state
  const nextPhase = phase === 'to-patient' ? 'working' : phase === 'to-station' ? 'reporting' : phase === 'working' && (job.kind === 'support' || job.kind === 'lab') ? 'to-station' : 'complete'
  let updated: TycoonGameState = { ...state, activeShift: { ...shift, worldJobs: shift.worldJobs!.map((item) => item.id === job.id ? { ...item, phase: nextPhase, anchor: { ...expected } } : item) } }
  if (nextPhase !== 'complete') return updated
  let current = updated.activeShift!
  if (job.kind === 'support') {
    if (!current.loop?.calls.some((call) => call.id === job.callId && call.status === 'assigned')) return state
    current = { ...current, loop: { ...current.loop, calls: current.loop.calls.map((call) => call.id === job.callId ? { ...call, status: 'answered', answeredBy: 'staff' } : call) } }
  }
  if (job.kind === 'lab' || job.kind === 'scanner') current = { ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, simulation: { ...item.simulation!, ...(job.kind === 'lab' ? { labDelivered: true } : { scannerUsed: true }) } } : item) }
  const message = job.kind === 'support' ? 'Support staff completed bedside comfort care and returned to report.' : job.kind === 'lab' ? 'Lab runner collected the prepared training sample and delivered it to the station. The vitals-case time discount is now available.' : job.kind === 'scanner' ? 'Wristband and prepared medication scanned at the bedside. Verification recorded.' : 'Charting finished at the nursing station. The saved care note is recorded.'
  updated = { ...updated, activeShift: { ...current, events: [{ id: `${job.id}:complete`, minute: current.shiftMinute, type: 'shift', taskId: task.id, title: job.kind === 'support' ? 'Support request completed' : 'Equipment work completed', message }, ...current.events] } }
  if (job.kind === 'scanner') return advanceTycoonCare(updated, task.id, 'safety', shiftId)
  if (job.kind === 'chart') return advanceTycoonCare(updated, task.id, 'documentation', shiftId)
  return updated
}
