import { HOSPITAL_MAP } from './tycoon-map-config'
import type { TycoonWorldJob } from '../app/types'
import { STATION_POSITION } from './tycoon-ward-layout'
import { worldWorkMs } from '../services/tycoon-world-jobs'
import { TycoonWardController, type WardState } from './tycoon-ward'

export type WorldJobReport = (jobId: string, phase: TycoonWorldJob['phase'], position: { u: number; v: number }, workedMs: number, shiftId: string) => void

/** Job checkpoints persist in game state; travel and presentation time stay outside React. */
export class TycoonJobActor {
  readonly controller = new TycoonWardController(() => { this.arrived = true }, false)
  private jobId = ''
  private phaseKey = ''
  private routed = false
  private arrived = false
  private workedMs = 0
  private reported = false
  private initialized = false
  private shiftId = ''
  private readonly report: WorldJobReport
  private readonly parking: { u: number; v: number }
  constructor(report: WorldJobReport, parking = STATION_POSITION) { this.report = report; this.parking = parking }
  tick(state: WardState, job: TycoonWorldJob | undefined, deltaMs: number) {
    if (state.shiftId !== this.shiftId) { this.shiftId = state.shiftId; this.initialized = false; this.jobId = ''; this.phaseKey = ''; this.routed = false }
    this.controller.update({ ...state, playerWorking: false })
    if (!this.initialized) { this.controller.restorePosition(job?.anchor ?? this.parking); this.initialized = true }
    if ((job?.id ?? '') !== this.jobId) {
      this.jobId = job?.id ?? ''; this.phaseKey = ''; this.routed = false
    }
    if (!job) {
      if (!this.routed && !state.paused) this.routed = this.controller.moveTo(this.parking)
      this.controller.tick(deltaMs)
      if (!this.controller.snapshot().moving) this.controller.facePoint(HOSPITAL_MAP.station.prop.point)
      return
    }
    const key = `${job.id}:${job.phase}`
    if (key !== this.phaseKey) { this.phaseKey = key; this.routed = false; this.arrived = false; this.workedMs = 0; this.reported = false }
    if (state.paused || !Number.isFinite(deltaMs) || deltaMs <= 0) return
    const traveling = job.phase === 'to-patient' || job.phase === 'to-station'
    if (traveling) {
      if (!this.routed) this.routed = this.controller.goTo(job.phase === 'to-patient' ? `patient:${job.taskId}` : 'station')
      this.controller.tick(deltaMs)
    } else {
      const target = this.controller.targets().find((target) => target.id === (job.phase === 'reporting' ? 'station' : `patient:${job.taskId}`))
      if (target) this.controller.faceTarget(target)
      this.workedMs += Math.min(deltaMs, 50)
    }
    if (!this.reported && (traveling ? this.arrived : this.workedMs >= worldWorkMs(job.phase))) {
      this.reported = true
      this.report(job.id, job.phase, this.controller.snapshot().position, this.workedMs, state.shiftId)
    }
  }
  snapshot() { return { ...this.controller.snapshot(), workedMs: this.workedMs } }
}
