import { projectGround, type GroundPoint, type NurseDirection, type ScreenPoint } from './tycoon-care-presentation'
import type { TycoonTask } from '../app/types'
import { CORRIDOR, ROOM_DOOR, ROOM_OBSTACLES, ROOM_PROPS, ROOM_SPACING, ROOM_STOPS, STATION_POSITION, WARD_ROOM, roomPoint, wardEnd } from './tycoon-ward-layout'
export { ROOM_SPACING, STATION_POSITION } from './tycoon-ward-layout'

export type WardTask = Pick<TycoonTask, 'id' | 'room' | 'patientName' | 'status' | 'category' | 'careProgress'>
export type WardTarget = { id: string; kind: 'patient' | 'equipment' | 'safety' | 'station'; label: string; position: GroundPoint; taskId?: string }
export type WardState = {
  shiftId: string; tasks: readonly WardTask[]; selectedTaskId?: string
  reviewedTaskIds: readonly string[]; paused: boolean; reducedMotion: boolean
  upgrades?: Record<string, number>
}
export type WardStatus = { label: string; moving: boolean; nearby: WardTarget | null; caring: boolean }
export const unprojectGround = ({ x, y }: ScreenPoint): GroundPoint => ({
  u: (x - 600) / 144 + (y - 80) / 88,
  v: (y - 80) / 88 - (x - 600) / 144,
})
const distance = (a: GroundPoint, b: GroundPoint) => Math.hypot(a.u - b.u, a.v - b.v)
const inside = (p: GroundPoint, a: number, b: number, c: number, d: number) => p.u >= a && p.u <= b && p.v >= c && p.v <= d

/** The walkable floor and artwork use the same room coordinates. Margins include the nurse's radius. */
export function isWardWalkable(p: GroundPoint, roomCount: number): boolean {
  if (!Number.isFinite(p.u) || !Number.isFinite(p.v)) return false
  if (inside(p, CORRIDOR.minU + 0.25, wardEnd(roomCount) - 0.25, CORRIDOR.minV + 0.22, CORRIDOR.maxV - 0.25)) {
    for (let i = 0; i < roomCount; i++) {
      const plant = roomPoint(i, ROOM_PROPS.plant)
      if (inside(p, plant.u - 0.33, plant.u + 0.33, plant.v - 0.33, CORRIDOR.maxV - 0.25)) return false
    }
    return !inside(p, 0.35, 2.05, 3.02, 3.98)
  }
  for (let i = 0; i < roomCount; i++) {
    const u = p.u - i * ROOM_SPACING
    const local = { u, v: p.v }
    if (inside(local, ROOM_DOOR.minU + 0.2, ROOM_DOOR.maxU - 0.2, WARD_ROOM.maxV - 0.25, CORRIDOR.minV + 0.23)) return true
    if (!inside(local, WARD_ROOM.minU + 0.22, WARD_ROOM.maxU - 0.22, WARD_ROOM.minV + 0.22, WARD_ROOM.maxV - 0.22)) continue
    if (ROOM_OBSTACLES.some((obstacle) => inside(local, obstacle.minU, obstacle.maxU, obstacle.minV, obstacle.maxV))) return false
    return true
  }
  return false
}

export function wardTargets(tasks: readonly WardTask[]): WardTarget[] {
  return [
    { id: 'station', kind: 'station', label: 'Nursing station · handoff', position: STATION_POSITION },
    ...tasks.flatMap((task, i): WardTarget[] => [
      { id: `patient:${task.id}`, kind: 'patient', taskId: task.id, label: `${task.room} · ${task.patientName}`, position: roomPoint(i, ROOM_STOPS.patient) },
      { id: `equipment:${task.id}`, kind: 'equipment', taskId: task.id, label: `${task.room} · ${task.category === 'medication-check' ? 'Medication checks' : 'Patient monitor'}`, position: roomPoint(i, ROOM_STOPS.equipment) },
      { id: `safety:${task.id}`, kind: 'safety', taskId: task.id, label: `${task.room} · Bedside safety check`, position: roomPoint(i, ROOM_STOPS.safety) },
    ]),
  ]
}

// A small four-neighbour grid avoids diagonal corner cutting through beds/walls.
const STEP = 0.2
const cellKey = (x: number, y: number) => `${x},${y}`
const boundaryCache = new Map<number, { u: number[]; v: number[] }>()
function wardBoundaries(rooms: number) {
  const cached = boundaryCache.get(rooms)
  if (cached) return cached
  const u = new Set([CORRIDOR.minU + 0.25, wardEnd(rooms) - 0.25, 0.35, 2.05])
  const v = new Set([CORRIDOR.minV + 0.22, CORRIDOR.maxV - 0.25, 3.02, 3.98,
    WARD_ROOM.minV + 0.22, WARD_ROOM.maxV - 0.22, WARD_ROOM.maxV - 0.25, CORRIDOR.minV + 0.23])
  for (let room = 0; room < rooms; room++) {
    const offset = room * ROOM_SPACING
    for (const edge of [WARD_ROOM.minU + 0.22, WARD_ROOM.maxU - 0.22, ROOM_DOOR.minU + 0.2, ROOM_DOOR.maxU - 0.2]) u.add(edge + offset)
    const plant = roomPoint(room, ROOM_PROPS.plant)
    u.add(plant.u - 0.33); u.add(plant.u + 0.33); v.add(plant.v - 0.33)
    for (const obstacle of ROOM_OBSTACLES) {
      u.add(obstacle.minU + offset); u.add(obstacle.maxU + offset)
      v.add(obstacle.minV); v.add(obstacle.maxV)
    }
  }
  const boundaries = { u: [...u], v: [...v] }
  boundaryCache.set(rooms, boundaries)
  return boundaries
}
function clearSegment(a: GroundPoint, b: GroundPoint, rooms: number) {
  // Split at every floor/obstacle edge: fixed-distance samples can miss a thin
  // blocked sliver when smoothing a route past the corner of a doorway.
  const boundaries = wardBoundaries(rooms)
  const cuts = [0, 1]
  for (const axis of ['u', 'v'] as const) {
    const delta = b[axis] - a[axis]
    if (!delta) continue
    for (const edge of boundaries[axis]) {
      const t = (edge - a[axis]) / delta
      if (t > 0 && t < 1) cuts.push(t)
    }
  }
  cuts.sort((x, y) => x - y)
  const walkableAt = (t: number) => isWardWalkable({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t }, rooms)
  for (let i = 0; i < cuts.length; i++) {
    if (!walkableAt(cuts[i]) || (i > 0 && !walkableAt((cuts[i - 1] + cuts[i]) / 2))) return false
  }
  return true
}

export function findWardPath(start: GroundPoint, end: GroundPoint, rooms: number): GroundPoint[] | null {
  if (!isWardWalkable(start, rooms) || !isWardWalkable(end, rooms)) return null
  if (clearSegment(start, end, rooms)) return [{ ...end }]
  const cells: { x: number; y: number; point: GroundPoint }[] = []
  for (let x = 1; x <= Math.ceil(wardEnd(rooms) / STEP); x++) {
    for (let y = Math.ceil((WARD_ROOM.minV + 0.22) / STEP); y <= Math.floor((CORRIDOR.maxV - 0.25) / STEP); y++) {
      const point = { u: x * STEP, v: y * STEP }
      if (isWardWalkable(point, rooms)) cells.push({ x, y, point })
    }
  }
  const closest = (point: GroundPoint) => cells
    .filter((c) => distance(c.point, point) < 0.5 && clearSegment(point, c.point, rooms))
    .sort((a, b) => distance(a.point, point) - distance(b.point, point))[0]
  const from = closest(start), to = closest(end)
  if (!from || !to) return null
  const open = [from]
  const firstKey = cellKey(from.x, from.y), endKey = cellKey(to.x, to.y)
  const parents = new Map<string, string | null>([[firstKey, null]])
  const byKey = new Map(cells.map((c) => [cellKey(c.x, c.y), c]))
  for (let head = 0; head < open.length; head++) {
    const current = open[head], key = cellKey(current.x, current.y)
    if (key === endKey) {
      const path: GroundPoint[] = [{ ...end }]
      for (let k: string | null = key; k !== null; k = parents.get(k) ?? null) path.unshift(byKey.get(k)!.point)
      // Remove redundant corners only when the whole segment is collision free.
      const smooth: GroundPoint[] = []
      let anchor = start
      for (let i = 0; i < path.length; i++) {
        if (i + 1 < path.length && clearSegment(anchor, path[i + 1], rooms)) continue
        smooth.push(path[i]); anchor = path[i]
      }
      return smooth
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextKey = cellKey(current.x + dx, current.y + dy), next = byKey.get(nextKey)
      if (!next || parents.has(nextKey) || !clearSegment(current.point, next.point, rooms)) continue
      parents.set(nextKey, key); open.push(next)
    }
  }
  return null
}

/** Movement runs outside React; only arrival and status changes cross the bridge. */
export class TycoonWardController {
  private state: WardState | null = null
  private position = { ...STATION_POSITION }
  private direction: NurseDirection = 'se'
  private path: GroundPoint[] = []
  private destination: WardTarget | null = null
  private queuedTarget: string | null = null
  private hidden = false
  private animationMs = 0
  private careMs = 0
  private moving = false
  private message = 'Walk to a patient or inspect their equipment.'
  private readonly onInteract: (target: WardTarget) => void
  constructor(onInteract: (target: WardTarget) => void) { this.onInteract = onInteract }

  update(state: WardState) {
    if (state.shiftId !== this.state?.shiftId) {
      this.position = { ...STATION_POSITION }; this.path = []; this.destination = null; this.careMs = 0
      this.queuedTarget = null
      this.message = 'Walk to a patient or inspect their equipment.'
    } else if (state.tasks.some((task) => task.careProgress?.steps.includes('care') && !this.state?.tasks.find((old) => old.id === task.id)?.careProgress?.steps.includes('care'))) {
      this.careMs = 1600; this.path = []; this.destination = null
    }
    this.state = state
    if (this.paused) this.moving = false
  }
  setHidden(hidden: boolean) { this.hidden = hidden; if (hidden) this.moving = false }
  get paused() { return !this.state || this.state.paused || this.hidden }
  targets() { return wardTargets(this.state?.tasks ?? []) }
  nearby() {
    return this.targets().filter((target) => distance(this.position, target.position) < 0.52)
      .sort((a, b) => distance(this.position, a.position) - distance(this.position, b.position))[0] ?? null
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
    const path = findWardPath(this.position, point, this.state!.tasks.length)
    if (!path) { this.message = 'That spot is blocked. Choose an open floor tile.'; return false }
    this.path = path; this.destination = null; this.message = 'Walking · use a direction key to change course'
    return true
  }
  interact() {
    if (this.paused || this.careMs > 0) return
    const target = this.nearby()
    if (target) { this.path = []; this.destination = null; this.moving = false; this.onInteract(target) }
    else this.message = 'Move closer to a patient, monitor, or the nursing station.'
  }
  tick(deltaMs: number, input = { x: 0, y: 0 }) {
    this.moving = false
    if (this.paused || !Number.isFinite(deltaMs) || deltaMs <= 0) return
    const delta = Math.min(deltaMs, 50)
    this.animationMs += delta
    if (this.careMs > 0) {
      this.careMs = Math.max(0, this.careMs - delta)
      this.message = 'Bedside care recorded · reassess this patient'
      if (!this.careMs && this.queuedTarget) { const target = this.queuedTarget; this.queuedTarget = null; this.goTo(target) }
      return
    }
    const speed = 175 * delta / 1000
    const old = { ...this.position }
    if (input.x || input.y) {
      this.path = []; this.destination = null
      const length = Math.hypot(input.x, input.y)
      const dx = input.x / length * speed, dy = input.y / length * speed
      const du = dx / 144 + dy / 88, dv = dy / 88 - dx / 144
      const next = { u: old.u + du, v: old.v + dv }
      if (clearSegment(old, next, this.state!.tasks.length)) this.position = next
      else if (clearSegment(old, { u: next.u, v: old.v }, this.state!.tasks.length)) this.position.u = next.u
      else if (clearSegment(old, { u: old.u, v: next.v }, this.state!.tasks.length)) this.position.v = next.v
      this.message = 'Explore the ward · E to interact nearby'
    } else if (this.path.length) {
      const target = this.path[0], a = projectGround(old), b = projectGround(target)
      const span = Math.hypot(b.x - a.x, b.y - a.y)
      const t = span ? Math.min(1, speed / span) : 1
      this.position = { u: old.u + (target.u - old.u) * t, v: old.v + (target.v - old.v) * t }
      if (t === 1) this.path.shift()
      if (!this.path.length) {
        const arrived = this.destination; this.destination = null
        this.message = arrived ? `At ${arrived.label}` : 'Choose a destination or use E to interact'
        if (arrived) this.onInteract(arrived)
      }
    }
    this.moving = distance(old, this.position) > 0.0001
    if (this.moving) {
      const a = projectGround(old), b = projectGround(this.position)
      this.direction = b.x >= a.x ? (b.y >= a.y ? 'se' : 'ne') : (b.y >= a.y ? 'sw' : 'nw')
    }
  }
  status(): WardStatus {
    return { label: this.paused ? 'Paused' : this.careMs > 0 ? 'Providing bedside care…' : this.message, moving: this.moving, nearby: this.nearby(), caring: this.careMs > 0 }
  }
  snapshot() {
    const pose = this.state?.reducedMotion ? 'idle-0' : this.careMs > 0 ? `care-${Math.floor(this.animationMs / 320) % 2}` : this.moving ? `walk-${Math.floor(this.animationMs / 130) % 4}` : 'idle-0'
    return { position: { ...this.position }, screenPosition: projectGround(this.position), frame: `${this.direction}-${pose}`, path: this.path, ...this.status() }
  }
}
