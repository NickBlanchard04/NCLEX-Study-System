/** Visual state only. Assessment, rewards and shift time belong to the game store. */
export interface HospitalBridgeState {
  shiftId: string
  taskId: string
  taskStatus: string
  paused: boolean
  reducedMotion: boolean
  selected: boolean
}

export type CarePhase = 'ready' | 'waiting' | 'walking' | 'caring' | 'completed'
export type NurseDirection = 'se' | 'sw' | 'nw' | 'ne'
export interface GroundPoint { u: number; v: number }
export interface ScreenPoint { x: number; y: number }
export interface HospitalStatus { phase: CarePhase; label: string }

export const HOSPITAL_SIZE = { width: 1200, height: 760 }
export const ROOM_BOUNDS = { minU: 3.7, maxU: 7, minV: 0, maxV: 2.8 }

export const projectGround = ({ u, v }: GroundPoint): ScreenPoint => ({
  x: 600 + (u - v) * 72,
  y: 80 + (u + v) * 44,
})

// The corridor is v=3.65. The only room crossing is its open entrance at u=5.7.
// The last point stays beside the mattress, whose footprint is v=0.65..1.65.
export const CARE_ROUTE: readonly GroundPoint[] = [
  { u: 1.6, v: 3.65 },
  { u: 2.85, v: 3.65 },
  { u: 5.7, v: 3.65 },
  { u: 5.7, v: 2.8 },
  { u: 5.7, v: 2.1 },
]

const labels: Record<CarePhase, string> = {
  ready: 'Select Room 101 to assess your patient',
  waiting: 'Assessment complete · nurse ready at the station',
  walking: 'Nurse en route to Room 101',
  caring: 'Providing care at the bedside',
  completed: 'Room 101 · care complete',
}

export interface CareSnapshot {
  phase: CarePhase
  position: GroundPoint
  screenPosition: ScreenPoint
  direction: NurseDirection
  frame: string
  nurseCount: 0 | 1
  spawnCount: number
  routeLeg: number
  careProgress: number
}

/** Deterministic one-nurse presentation, independent from Phaser and wall time. */
export class TycoonCarePresentation {
  private state: HospitalBridgeState | null = null
  private key: string | null = null
  private phase: CarePhase = 'ready'
  private position: GroundPoint = { ...CARE_ROUTE[0] }
  private direction: NurseDirection = 'se'
  private routeLeg = 1
  private animationMs = 0
  private careMs = 0
  private spawnCount = 0
  private nurseVisible = false
  private hidden = false

  update(state: HospitalBridgeState) {
    const key = `${state.shiftId}:${state.taskId}`
    if (this.key !== key) {
      this.key = key
      this.phase = 'ready'
      this.position = { ...CARE_ROUTE[0] }
      this.direction = 'se'
      this.routeLeg = 1
      this.animationMs = 0
      this.careMs = 0
      this.spawnCount = 0
      this.nurseVisible = false
      // A restored completed task is already done. Never replay its route.
      if (state.taskStatus === 'completed') this.finish(false)
    } else if (state.taskStatus === 'completed' && this.phase === 'ready') {
      this.phase = 'waiting'
    }
    this.state = { ...state }
    this.releaseWaiting()
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden
    this.releaseWaiting()
  }

  private get paused() { return !this.state || this.state.paused || this.hidden }

  private finish(spawn: boolean) {
    if (spawn && !this.nurseVisible) this.spawnCount += 1
    this.nurseVisible = true
    this.phase = 'completed'
    this.position = { ...CARE_ROUTE[CARE_ROUTE.length - 1] }
    this.direction = 'ne'
    this.animationMs = 0
    this.careMs = 1600
  }

  private releaseWaiting() {
    if (this.paused) return
    if (this.state?.reducedMotion && (this.phase === 'waiting' || this.phase === 'walking' || this.phase === 'caring')) {
      this.finish(true)
    } else if (this.phase === 'waiting') {
      this.phase = 'walking'
      this.nurseVisible = true
      this.spawnCount += 1
      this.animationMs = 0
    }
  }

  tick(deltaMs: number) {
    this.releaseWaiting()
    if (this.paused || !Number.isFinite(deltaMs) || deltaMs <= 0) return
    // Never catch up movement after a background tab or long render stall.
    const delta = Math.min(deltaMs, 100)
    if (this.phase === 'walking') {
      this.animationMs += delta
      let travel = delta * 0.105
      while (travel > 0 && this.phase === 'walking') {
        const target = CARE_ROUTE[this.routeLeg]
        const from = projectGround(this.position)
        const to = projectGround(target)
        const distance = Math.hypot(to.x - from.x, to.y - from.y)
        if (distance > 0) {
          this.direction = to.x >= from.x ? (to.y >= from.y ? 'se' : 'ne') : (to.y >= from.y ? 'sw' : 'nw')
        }
        if (distance <= travel) {
          this.position = { ...target }
          travel -= distance
          this.routeLeg += 1
          if (this.routeLeg === CARE_ROUTE.length) {
            this.phase = 'caring'
            this.direction = 'ne'
            this.animationMs = 0
          }
        } else {
          const ratio = travel / distance
          this.position = {
            u: this.position.u + (target.u - this.position.u) * ratio,
            v: this.position.v + (target.v - this.position.v) * ratio,
          }
          travel = 0
        }
      }
    } else if (this.phase === 'caring') {
      this.animationMs += delta
      this.careMs += delta
      if (this.careMs >= 1600) this.finish(false)
    }
  }

  status(): HospitalStatus { return { phase: this.phase, label: labels[this.phase] } }

  snapshot(): CareSnapshot {
    const pose = this.phase === 'walking' ? `walk-${Math.floor(this.animationMs / 130) % 4}`
      : this.phase === 'caring' ? `care-${Math.floor(this.animationMs / 320) % 2}` : 'idle-0'
    return {
      phase: this.phase,
      position: { ...this.position },
      screenPosition: projectGround(this.position),
      direction: this.direction,
      frame: `${this.direction}-${pose}`,
      nurseCount: this.nurseVisible ? 1 : 0,
      spawnCount: this.spawnCount,
      routeLeg: this.routeLeg,
      careProgress: Math.min(this.careMs / 1600, 1),
    }
  }
}
