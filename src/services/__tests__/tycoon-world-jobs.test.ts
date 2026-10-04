import type { TycoonGameState, TycoonWorldJob } from '../../app/types'
import { describe, expect, it } from 'vitest'
import { createInitialTycoonState, startTycoonShiftForUnit, advanceTycoonShiftTime, finishTycoonShiftNow } from '../tycoon-engine'
import { assessTycoonPatient, advanceTycoonCare, decideTycoonCare, nextCareStep } from '../tycoon-care'
import { queueWorldJob, advanceWorldJob, worldJobActive } from '../tycoon-world-jobs'
import { respondToCall } from '../tycoon-shift-loop'
import { TycoonJobActor } from '../../game/tycoon-job-actor'
import { ROOM_STOPS, STATION_POSITION, roomPoint } from '../../game/tycoon-ward-layout'
import { tycoonScenarios } from '../../data/tycoon-scenarios'
const start = () => startTycoonShiftForUnit({ ...createInitialTycoonState(), upgrades: { 'staff-training': 1, 'lab-runner': 1, 'med-safety-scanner': 1 } }, 'fundamentals-clinic', { simulation: true, paced: true, physicalInteractions: true })
describe('physical ward work', () => {
  it('requires bedside scanner work and rejects duplicate, stale, remote and early reports', () => {
    let state = start(); const sid = state.activeShift!.id, task = state.activeShift!.tasks[1], at = roomPoint(1, ROOM_STOPS.safety)
    state = assessTycoonPatient(state, task.id, task.correctActionId, sid)
    expect(nextCareStep(state.activeShift!.tasks[1])).toBe('safety')
    expect(advanceTycoonCare(state, task.id, 'safety', sid)).toBe(state)
    expect(queueWorldJob(state, task.id, 'scanner', sid, STATION_POSITION)).toBe(state)
    state = queueWorldJob(state, task.id, 'scanner', sid, at)
    const job = state.activeShift!.worldJobs![0]
    expect(queueWorldJob(state, task.id, 'scanner', sid, at)).toBe(state)
    expect(advanceWorldJob(state, job.id, 'working', at, 1999, sid)).toBe(state)
    expect(advanceWorldJob(state, job.id, 'working', STATION_POSITION, 2000, sid)).toBe(state)
    expect(advanceWorldJob(state, job.id, 'working', at, 2000, 'old')).toBe(state)
    const money = state.money
    state = advanceWorldJob(state, job.id, 'working', at, 2000, sid)
    expect(nextCareStep(state.activeShift!.tasks[1])).toBe('care')
    expect(state.activeShift!.tasks[1].simulation!.scannerUsed).toBe(true)
    expect(state.money).toBe(money)
    expect(advanceWorldJob(state, job.id, 'working', at, 2000, sid)).toBe(state)
  })
  it('pays chart rewards only after station work and once across reload', () => {
    let state = start(); const sid = state.activeShift!.id, task = state.activeShift!.tasks[0]
    state = assessTycoonPatient(state, task.id, task.correctActionId, sid)
    state = decideTycoonCare(state, task.id, tycoonScenarios.chest.intervention, 'care', sid)
    state = advanceTycoonCare(state, task.id, 'care', sid)
    state = decideTycoonCare(state, task.id, 'improved', 'reassessment', sid)
    const money = state.money
    expect(advanceTycoonCare(state, task.id, 'documentation', sid)).toBe(state)
    expect(queueWorldJob(state, task.id, 'chart', sid, STATION_POSITION)).toBe(state)
    state = queueWorldJob(state, task.id, 'chart', sid, STATION_POSITION, 'saved-note')
    const job = state.activeShift!.worldJobs![0]
    expect(state.money).toBe(money)
    state = advanceWorldJob(JSON.parse(JSON.stringify(state)), job.id, 'working', STATION_POSITION, 2000, sid)
    expect(state.activeShift!.tasks[0].status).toBe('completed')
    expect(state.money).toBeGreaterThan(money)
    expect(advanceWorldJob(state, job.id, 'working', STATION_POSITION, 2000, sid)).toBe(state)
    expect(queueWorldJob(state, task.id, 'chart', sid, STATION_POSITION, 'saved-note')).toBe(state)
  })
  it('moves support through arrival, work, return and reporting; pause and reload preserve checkpoints', () => {
    let state = advanceTycoonShiftTime(start(), 1); const sid = state.activeShift!.id, call = state.activeShift!.loop!.calls[0]
    state = respondToCall(state, call.id, 'delegate', sid)
    expect(respondToCall(state, call.id, 'delegate', sid)).toBe(state)
    state = advanceTycoonShiftTime(state, 0.5)
    expect(state.activeShift!.loop!.calls[0].status).toBe('assigned')
    const phases: string[] = []
    const report = (id: string, phase: TycoonWorldJob['phase'], position: {u:number;v:number}, ms: number, shiftId: string) => { phases.push(phase); state = advanceWorldJob(state, id, phase, position, ms, shiftId) }
    let actor = new TycoonJobActor(report)
    const tick = (paused = false, reducedMotion = false) => actor.tick({ shiftId: sid, tasks: state.activeShift!.tasks, reviewedTaskIds: [], paused, reducedMotion }, state.activeShift!.worldJobs!.find(worldJobActive), 50)
    for (let i = 0; i < 15; i++) tick()
    const before = actor.snapshot().position
    for (let i = 0; i < 200; i++) tick(true)
    expect(actor.snapshot().position).toEqual(before)
    expect(phases).toEqual([])
    for (let i = 0; i < 2000 && state.activeShift!.worldJobs![0].phase !== 'to-station'; i++) tick()
    expect(phases).toEqual(['to-patient', 'working'])
    state = JSON.parse(JSON.stringify(state)); actor = new TycoonJobActor(report)
    for (let i = 0; i < 2000 && state.activeShift!.worldJobs!.some(worldJobActive); i++) tick(false, true)
    expect(phases).toEqual(['to-patient', 'working', 'to-station', 'reporting'])
    expect(state.activeShift!.loop!.calls[0].answeredBy).toBe('staff')
    expect(state.activeShift!.events.filter((event) => event.title === 'Support request completed')).toHaveLength(1)
  })
  it('delivers a sample only after the complete route and rejects callbacks after ending a shift', () => {
    let state = start(); const sid = state.activeShift!.id, task = state.activeShift!.tasks[2], bedside = roomPoint(2, ROOM_STOPS.patient)
    expect(queueWorldJob(state, task.id, 'lab', sid)).toBe(state)
    state = assessTycoonPatient(state, task.id, task.correctActionId, sid)
    state = queueWorldJob(state, task.id, 'lab', sid)
    const job = state.activeShift!.worldJobs![0]
    state = advanceWorldJob(state, job.id, 'to-patient', bedside, 0, sid)
    state = advanceWorldJob(state, job.id, 'working', bedside, 2000, sid)
    expect(state.activeShift!.tasks[2].simulation!.labDelivered).not.toBe(true)
    state = advanceWorldJob(state, job.id, 'to-station', STATION_POSITION, 0, sid)
    const undelivered = state
    state = advanceWorldJob(state, job.id, 'reporting', STATION_POSITION, 1200, sid)
    const finish = (initial: TycoonGameState) => {
      let next = decideTycoonCare(initial, task.id, tycoonScenarios.falls.intervention, 'care', sid)
      next = advanceTycoonCare(next, task.id, 'care', sid)
      next = decideTycoonCare(next, task.id, 'improved', 'reassessment', sid)
      next = queueWorldJob(next, task.id, 'chart', sid, STATION_POSITION, 'saved-note')
      return advanceWorldJob(next, `${sid}:${task.id}:chart`, 'working', STATION_POSITION, 2000, sid)
    }
    expect(finish(undelivered).activeShift!.shiftMinute - finish(state).activeShift!.shiftMinute).toBe(0.5)
    expect(state.activeShift!.tasks[2].simulation!.labDelivered).toBe(true)
    const ended = finishTycoonShiftNow(state)
    expect(advanceWorldJob(ended, job.id, 'reporting', STATION_POSITION, 1200, sid)).toBe(ended)
  })
})
