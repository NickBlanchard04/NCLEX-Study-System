import { walkFrame, WALK_CYCLE_DISTANCE } from './tycoon-walk-cycle'
import { clearSegment, findWardPath, isWardWalkable } from './tycoon-navigation'
export { clearSegment, findWardPath, isWardWalkable } from './tycoon-navigation'
import { availableRoomCount, HOSPITAL_MAP } from './tycoon-map-config'
import { projectGround, type GroundPoint, type NurseDirection, type ScreenPoint } from './tycoon-care-presentation'
import type { TycoonCall, TycoonTask, TycoonWorldJob } from '../app/types'
import { ROOM_PROPS, ROOM_STOPS, STATION_POSITION, roomPoint } from './tycoon-ward-layout'
export { ROOM_SPACING, STATION_POSITION } from './tycoon-ward-layout'

export type WardTask = Pick<TycoonTask, 'id' | 'room' | 'patientName' | 'status' | 'category' | 'careProgress' | 'simulation'>
export type WardTarget = { id: string; kind: 'patient' | 'equipment' | 'safety' | 'station' | 'elevator'; label: string; position: GroundPoint; taskId?: string }
export type WardState = {
  soundEnabled?: boolean
  suggestedTargetId?: string
  worldJobs?: readonly TycoonWorldJob[]
  playerWorking?: boolean
  calls?: readonly TycoonCall[]
  shiftId: string; tasks: readonly WardTask[]; selectedTaskId?: string
  reviewedTaskIds: readonly string[]; paused: boolean; reducedMotion: boolean
  upgrades?: Record<string, number>
}
export type WardStatus = { label: string; moving: boolean; nearby: WardTarget | null; caring: boolean; workKind?: 'assess' | 'treat' | 'chart' | 'scanner' }
export const unprojectGround = ({ x, y }: ScreenPoint): GroundPoint => ({
  u: (x - 600) / 144 + (y - 80) / 88,
  v: (y - 80) / 88 - (x - 600) / 144,
})
export function wardTargets(tasks: readonly WardTask[]): WardTarget[] {
  return [
    { id: 'station', kind: 'station', label: 'Nursing station · handoff', position: STATION_POSITION },
    ...HOSPITAL_MAP.elevators.map((lift): WardTarget => ({id:lift.id,kind:'elevator',label:'Floor 2 · Locked',position:lift.approach})),
    ...tasks.flatMap((task, i): WardTarget[] => task.simulation?.discharged ? [] : [
      { id: `patient:${task.id}`, kind: 'patient', taskId: task.id, label: `${task.room} · ${task.patientName}`, position: roomPoint(i, ROOM_STOPS.patient) },
      { id: `equipment:${task.id}`, kind: 'equipment', taskId: task.id, label: `${task.room} · ${task.category === 'medication-check' ? 'Medication checks' : 'Patient monitor'}`, position: roomPoint(i, ROOM_STOPS.equipment) },
      { id: `safety:${task.id}`, kind: 'safety', taskId: task.id, label: `${task.room} · Bedside safety check`, position: roomPoint(i, ROOM_STOPS.safety) },
    ]),
  ]
}

const distance = (a: GroundPoint, b: GroundPoint) => Math.hypot(a.u - b.u, a.v - b.v)

/** Movement runs outside React; only arrival and status changes cross the bridge. */
export class TycoonWardController {
  private state: WardState | null = null
  private cachedTargets: WardTarget[] = []
  private position = { ...STATION_POSITION }
  private direction: NurseDirection = 'se'
  private path: GroundPoint[] = []
  private destination: WardTarget | null = null
  private queuedTarget: string | null = null
  private hidden = false
  private animationMs = 0
  private careMs = 0
  private workKind: 'assess' | 'treat' | null = null
  private speed = 0
  private strideDistance = 0
  private manualHeading: { x: number; y: number } | null = null
  private pendingFacing: NurseDirection | null = null
  private turnMs = 0
  private moving = false
  private message = 'Walk to a patient or inspect their equipment.'
  private readonly onInteract: (target: WardTarget) => void
  private readonly animateCare: boolean
  constructor(onInteract: (target: WardTarget) => void, animateCare = true) { this.animateCare = animateCare; this.onInteract = onInteract }

  update(state: WardState) {
    if (state.tasks !== this.state?.tasks) this.cachedTargets = wardTargets(state.tasks)
    if (state.shiftId !== this.state?.shiftId) {
      this.position = { ...STATION_POSITION }; this.path = []; this.destination = null; this.careMs = 0
      this.workKind = null; this.queuedTarget = null; this.stopMotion(); this.strideDistance = 0; this.direction = 'se'
      this.message = 'Walk to a patient or inspect their equipment.'
    } else if (this.animateCare) {
      const changed = state.tasks.find(task => task.careProgress?.steps.some(step => step !== 'documentation' && !this.state?.tasks.find(old => old.id === task.id)?.careProgress?.steps.includes(step)))
      if (changed) {
        const previous = this.state?.tasks.find(old => old.id === changed.id)
        this.workKind = changed.careProgress?.steps.includes('care') && !previous?.careProgress?.steps.includes('care') ? 'treat' : 'assess'
        this.careMs = this.workKind === 'treat' ? 1600 : 1200
        this.animationMs = 0; this.path = []; this.destination = null
        const target = this.cachedTargets.find(target => target.taskId === changed.id && target.kind === 'patient')
        if (target) this.faceTarget(target)
      }
    }
    this.state = state
    if (state.playerWorking) { this.path = []; this.destination = null; this.queuedTarget = null }
    if (this.destination?.taskId && !state.tasks.some((task) => task.id === this.destination?.taskId)) {
      this.path = []; this.destination = null; this.queuedTarget = null; this.moving = false
    }
    if (this.paused) this.stopMotion()
  }
  setHidden(hidden: boolean) { this.hidden = hidden; if (hidden) this.stopMotion() }
  get paused() { return !this.state || this.state.paused || this.state.playerWorking || this.hidden }
  restorePosition(position: GroundPoint) {
    if (!this.state || !isWardWalkable(position, this.openRooms)) return false
    this.position = { ...position }; this.path = []; this.destination = null; this.queuedTarget = null; this.careMs = 0; this.workKind = null; this.moving = false
    this.stopMotion()
    return true
  }
  private get openRooms() {
    return availableRoomCount(this.state?.tasks.length ?? 0, this.state?.upgrades)
  }
  targets() { return this.cachedTargets }
  nearby() {
    let nearest: WardTarget | null = null, span = 0.52
    for (const target of this.cachedTargets) {
      const next = distance(this.position, target.position)
      if (next < span) { span = next; nearest = target }
    }
    return nearest
  }
  goTo(targetId: string) {
    if (this.paused) return false
    const target = this.targets().find((t) => t.id === targetId)
    if (target && this.careMs > 0) { this.queuedTarget = targetId; return true }
    if (!target || !this.moveTo(target.position)) return false
    this.destination = target
    this.message = `Walking to ${target.label}`
    return true
  }
  moveTo(point: GroundPoint) {
    if (this.paused || this.careMs > 0) return false
    const path = findWardPath(this.position, point, this.openRooms)
    if (!path) { this.message = 'That spot is blocked. Choose an open floor tile.'; return false }
    this.path = path; this.destination = null; this.message = 'Walking · use a direction key to change course'
    return true
  }
  interact() {
    if (this.paused || this.careMs > 0) return
    const target = this.nearby()
    if (target) { this.path = []; this.destination = null; this.stopMotion(); this.faceTarget(target); this.onInteract(target) }
    else this.message = 'Move closer to a patient, monitor, or the nursing station.'
  }
  private stopMotion() { this.speed = 0; this.moving = false; this.manualHeading = null; this.pendingFacing = null; this.turnMs = 0 }
  facePoint(point: GroundPoint) {
    const a = projectGround(this.position), b = projectGround(point)
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.01) return
    this.direction = b.x >= a.x ? (b.y >= a.y ? 'se' : 'ne') : (b.y >= a.y ? 'sw' : 'nw')
    this.pendingFacing = null; this.turnMs = 0
  }
  faceTarget(target: WardTarget) {
    if(target.kind==='elevator') {
      const lift=HOSPITAL_MAP.elevators.find(lift=>lift.id===target.id)
      if(lift)this.facePoint(lift.point)
      return
    }
    const index = this.state?.tasks.findIndex((task) => task.id === target.taskId) ?? -1
    this.facePoint(target.kind === 'station' ? HOSPITAL_MAP.station.prop.point : roomPoint(Math.max(0, index), target.kind === 'equipment' ? ROOM_PROPS.monitor : target.kind === 'safety' ? ROOM_PROPS.scanner : ROOM_PROPS.bed))
  }
  tick(deltaMs: number, input = { x: 0, y: 0 }) {
    this.moving = false
    if (this.paused || !Number.isFinite(deltaMs) || deltaMs <= 0) return
    const delta = Math.min(deltaMs, 50), seconds = delta / 1000
    this.animationMs += delta
    if (this.careMs > 0) {
      this.stopMotion()
      this.careMs = Math.max(0, this.careMs - delta)
      this.message = this.workKind === 'treat' ? 'Bedside care recorded · reassess this patient' : 'Bedside check recorded · continue care'
      if (!this.careMs) this.workKind = null
      if (!this.careMs && this.queuedTarget) { const target = this.queuedTarget; this.queuedTarget = null; this.goTo(target) }
      return
    }
    const old = { ...this.position }, manual = Boolean(input.x || input.y)
    if (manual) {
      this.path = []; this.destination = null
      const length = Math.hypot(input.x, input.y)
      this.manualHeading = { x: input.x / length, y: input.y / length }
    } else if (this.path.length) this.manualHeading = null
    let desiredSpeed = manual || this.path.length ? 125 : 0
    if (this.path.length) {
      let remaining = 0, previous = projectGround(old)
      for (const point of this.path) { const next = projectGround(point); remaining += Math.hypot(next.x - previous.x, next.y - previous.y); previous = next }
      desiredSpeed = Math.min(125, Math.max(20, Math.sqrt(2 * 850 * remaining)))
    }
    const acceleration = desiredSpeed > this.speed ? 800 : 1200
    const priorSpeed=this.speed, rampSeconds=Math.min(seconds,Math.abs(desiredSpeed-priorSpeed)/acceleration)
    this.speed += Math.sign(desiredSpeed - this.speed) * Math.min(Math.abs(desiredSpeed - this.speed), acceleration * seconds)
    // Integrate the acceleration ramp, including any constant-speed remainder.
    // Right-end sampling makes a 30 Hz nurse accelerate farther than a 144 Hz nurse.
    let travel = (priorSpeed+this.speed)*.5*rampSeconds+this.speed*(seconds-rampSeconds)
    let arrived: WardTarget | null = null
    if (this.manualHeading && (manual || this.speed > 0)) {
      const dx = this.manualHeading.x * travel, dy = this.manualHeading.y * travel
      const next = { u: old.u + dx / 144 + dy / 88, v: old.v + dy / 88 - dx / 144 }
      if (clearSegment(old, next, this.openRooms)) this.position = next
      else if (clearSegment(old, { u: next.u, v: old.v }, this.openRooms)) this.position.u = next.u
      else if (clearSegment(old, { u: old.u, v: next.v }, this.openRooms)) this.position.v = next.v
      this.message = 'Explore the ward · E to interact nearby'
    } else while (this.path.length && travel > 0) {
      const target = this.path[0], a = projectGround(this.position), b = projectGround(target)
      const span = Math.hypot(b.x - a.x, b.y - a.y), t = span ? Math.min(1, travel / span) : 1
      this.position = { u: this.position.u + (target.u - this.position.u) * t, v: this.position.v + (target.v - this.position.v) * t }
      travel -= span * t
      if (t < 1) break
      this.path.shift()
      if (!this.path.length) {
        arrived = this.destination; this.destination = null; this.speed = 0
        this.message = arrived ? `At ${arrived.label}` : 'Choose a destination or use E to interact'
      }
    }
    const a = projectGround(old), b = projectGround(this.position), dx = b.x - a.x, dy = b.y - a.y
    const traveled = Math.hypot(dx, dy)
    this.moving = traveled > 0.0001
    if (this.moving) {
      this.strideDistance += traveled
      // A dead band around the axes stops tiny path corrections flipping the sprite.
      const east = Math.abs(dx) < traveled * 0.15 ? this.direction.endsWith('e') : dx > 0
      const south = Math.abs(dy) < traveled * 0.15 ? this.direction.startsWith('s') : dy > 0
      const facing: NurseDirection = south ? east ? 'se' : 'sw' : east ? 'ne' : 'nw'
      if (facing === this.direction) { this.pendingFacing = null; this.turnMs = 0 }
      else {
        if (facing !== this.pendingFacing) { this.pendingFacing = facing; this.turnMs = 0 }
        this.turnMs += delta
        if (this.turnMs >= 65) { this.direction = facing; this.pendingFacing = null; this.turnMs = 0 }
      }
    } else if (!this.path.length) this.stopMotion()
    if (arrived) { this.faceTarget(arrived); this.onInteract(arrived) }
  }
  status(): WardStatus {
    return { label: this.paused ? 'Paused' : this.careMs > 0 ? this.workKind === 'assess' ? 'Recording bedside check…' : 'Providing bedside care…' : this.message, moving: this.moving, nearby: this.nearby(), caring: this.careMs > 0, workKind: this.workKind ?? undefined }
  }
  snapshot() {
    const pose = this.state?.reducedMotion ? 'idle-0' : this.careMs > 0 ? `${this.workKind ?? 'assess'}-${Math.floor(this.animationMs / 140) % 8}` : this.moving ? `walk-${walkFrame(this.strideDistance)}` : 'idle-0'
    return { direction: this.direction, speed: this.speed, strideDistance: this.strideDistance, footfall: Math.floor(this.strideDistance / (WALK_CYCLE_DISTANCE / 2)), position: { ...this.position }, screenPosition: projectGround(this.position), frame: `${this.direction}-${pose}`, path: this.path, workKind: this.workKind, destination: this.destination, ...this.status() }
  }
}
