import type Phaser from 'phaser'
import type { WardState, WardTarget } from './tycoon-ward'
import { CARE_LABELS, nextCareStep } from '../services/tycoon-care'
import { patientObservation } from '../data/tycoon-scenarios'
export const INTERACTION_COLORS = { patient: 0x49baff, equipment: 0x52dea0, safety: 0xffc65c, station: 0xbf9aff, elevator: 0x9ba4af } as const
export interface InteractionCue { target: WardTarget; graphic: Phaser.GameObjects.Arc; glow: Phaser.GameObjects.Image; icon: Phaser.GameObjects.Image | null; label: Phaser.GameObjects.Text; bubble: Phaser.GameObjects.Graphics }
export function createInteractionIcon(scene: Phaser.Scene,target:WardTarget,x:number,y:number) {
 const key='care-icon-'+target.kind
 return scene.textures.exists(key)?scene.add.image(x,y,key).setDisplaySize(32,32*44/72).setDepth(-.5):null
}
/** One small shared radial texture supplies all floor glows; no blur filters. */
export function createInteractionGlow(scene: Phaser.Scene, target: WardTarget, x: number, y: number) {
  const key = 'ward-interaction-glow-v1'
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96
    const context = canvas.getContext('2d')!
    const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48)
    gradient.addColorStop(0, 'rgba(255,255,255,.06)')
    gradient.addColorStop(.48, 'rgba(255,255,255,.16)')
    gradient.addColorStop(.58, 'rgba(255,255,255,.65)')
    gradient.addColorStop(.72, 'rgba(255,255,255,.16)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient; context.fillRect(0, 0, 96, 96)
    scene.textures.addCanvas(key, canvas)
  }
  return scene.add.image(x, y, key).setScale(.9, .9 * 44 / 72).setTint(INTERACTION_COLORS[target.kind]).setDepth(-.65)
}
/** Presentation only: this module never starts care or mutates game state. */
export function updateInteractionCue({ target, graphic, glow, icon, label, bubble }: InteractionCue, state: WardState | null, nearbyTarget: WardTarget | null, hoveredTarget: string | null, paused: boolean, walkingTo: WardTarget | null = null, touch = false) {
  const task = state?.tasks.find((t) => t.id === target.taskId)
  const complete = target.kind === 'equipment' ? state?.reviewedTaskIds.includes(target.taskId!) : target.kind === 'safety' ? task?.careProgress?.steps.includes('safety') : task?.status === 'completed'
  const failed = target.kind === 'patient' && task?.status === 'failed'
  const color = INTERACTION_COLORS[target.kind]
  graphic.setFillStyle(color, nearbyTarget?.id === target.id ? 0.18 : 0.08)
  label.setText(complete ? target.kind === 'patient' ? '✓ Care complete' : '✓ Checked' : failed ? 'Task closed' : target.kind === 'patient' ? task && nextCareStep(task) ? CARE_LABELS[nextCareStep(task)!] : 'Bedside' : target.kind === 'station' ? 'Handoff' : target.kind === 'safety' ? 'Safety' : 'Monitor')
  if(target.kind==='equipment'&&!state?.upgrades?.['vitals-monitor'])label.setText('Check monitor')
  if(target.kind==='safety'&&!complete)label.setText('Bedside safety check')
  if(target.kind==='elevator') label.setText('Floor 2 · Locked')
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
  graphic.setStrokeStyle(travelling ? 3 : 2, color, .9)
  const hovered = hoveredTarget === target.id
  const nearby = nearbyTarget?.id === target.id
  const selectedRoom = Boolean(target.taskId && state?.selectedTaskId === target.taskId)
  label.setVisible(!paused && !state?.playerWorking && (touch ? nearby : hovered || nearby || selectedRoom || target.kind === 'station' || travelling))
  bubble.setVisible(label.visible).setPosition(label.x, label.y)
  const bubbleKey = label.text
  if (bubble.getData('text') !== bubbleKey) {
    bubble.setData('text', bubbleKey)
    const w = label.width + 6, h = label.height + 4
    bubble.clear().fillStyle(0xfffaf0).lineStyle(2, color)
      .fillRoundedRect(-w/2,-h/2,w,h,14).strokeRoundedRect(-w/2,-h/2,w,h,14)
      .fillTriangle(-6,h/2-1,6,h/2-1,0,h/2+9)
      .lineBetween(-6,h/2,0,h/2+9).lineBetween(0,h/2+9,6,h/2)
  }
  const highlighted = travelling || destination || hovered || nearby
  // Restore care labels in the selected room and the shared handoff location.
  graphic.setVisible(true).setAlpha(complete || failed ? .4 : highlighted ? 1 : .65)
  icon?.setAlpha(complete || failed ? .45 : highlighted ? 1 : .85)
  glow.setVisible(true).setAlpha(paused || complete || failed ? .2 : highlighted ? .8 : .45)
}
