import type Phaser from 'phaser'
import type { WardState, WardTarget } from './tycoon-ward'
import { CARE_LABELS, nextCareStep } from '../services/tycoon-care'
import { patientObservation } from '../data/tycoon-scenarios'
export interface InteractionCue { target: WardTarget; graphic: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }
/** Presentation only: this module never starts care or mutates game state. */
export function updateInteractionCue({ target, graphic, label }: InteractionCue, state: WardState | null, nearbyTarget: WardTarget | null, hoveredTarget: string | null, paused: boolean, walkingTo: WardTarget | null = null) {
  const task = state?.tasks.find((t) => t.id === target.taskId)
  const complete = target.kind === 'equipment' ? state?.reviewedTaskIds.includes(target.taskId!) : target.kind === 'safety' ? task?.careProgress?.steps.includes('safety') : task?.status === 'completed'
  const failed = target.kind === 'patient' && task?.status === 'failed'
  graphic.setFillStyle(complete ? 0x438567 : failed ? 0xb3684a : 0x347f86, nearbyTarget?.id === target.id ? 0.1 : 0.05)
  label.setText(complete ? target.kind === 'patient' ? '✓ Care complete' : '✓ Checked' : failed ? 'Task closed' : target.kind === 'patient' ? task && nextCareStep(task) ? CARE_LABELS[nextCareStep(task)!] : 'Bedside' : target.kind === 'station' ? 'Handoff' : target.kind === 'safety' ? 'Safety' : 'Monitor')
  if (target.kind === 'equipment' && task?.simulation && state?.upgrades?.['vitals-monitor']) {
    const observation = patientObservation(task)!
    label.setText(`HR ${observation.pulse} · SpO₂ ${observation.oxygen}%\n${task.simulation.condition}`)
  }
  const next = task ? nextCareStep(task) : null
  const nextKind = next === 'monitor' ? 'equipment' : next === 'safety' ? 'safety' : next === 'documentation' ? 'station' : 'patient'
  const selected = state?.tasks.find(t => t.id === state?.selectedTaskId)
  const stationNext = selected && nextCareStep(selected) === 'documentation'
  const destination = target.kind === 'station' ? Boolean(stationNext) : state?.selectedTaskId === target.taskId && target.kind === nextKind && Boolean(next)
  const travelling = walkingTo?.id === target.id
  graphic.setStrokeStyle(travelling ? 3 : 1.5, travelling ? 0xc72533 : 0x347f86, travelling ? .95 : .55)
  const hovered = hoveredTarget === target.id
  const nearby = nearbyTarget?.id === target.id
  label.setVisible(!paused && !state?.playerWorking && (hovered || nearby))
  graphic.setVisible(!paused && (travelling || destination || hovered || nearby)).setAlpha(travelling || hovered || nearby ? 0.85 : 0.5)
}
