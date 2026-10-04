import { describe, expect, it } from 'vitest'
import type { TycoonGameState } from '../../app/types'
import { patientObservation, tycoonScenarios } from '../../data/tycoon-scenarios'
import { advanceTycoonCare, assessTycoonPatient, decideTycoonCare } from '../tycoon-care'
import { advanceTycoonShiftTime, completeTycoonTaskWithAction, createInitialTycoonState, dischargeTycoonPatient, finishTycoonShiftNow, purchaseTycoonUpgradeById, startTycoonShiftForUnit, summarizeTycoonShift } from '../tycoon-engine'
import { upgradeRequirement } from '../tycoon-progression'

const start = () => startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic', { simulation: true })
function readyForCare(state: TycoonGameState, id: string) {
  const shiftId = state.activeShift!.id
  state = assessTycoonPatient(state, id, 'focused-assessment', shiftId)
  state = advanceTycoonCare(state, id, 'monitor', shiftId)
  return advanceTycoonCare(state, id, 'safety', shiftId)
}
function complete(state: TycoonGameState, id: string) {
  const shiftId = state.activeShift!.id
  state = readyForCare(state, id)
  const task = state.activeShift!.tasks.find((task) => task.id === id)!
  state = decideTycoonCare(state, id, tycoonScenarios[task.simulation!.scenario].intervention, 'care', shiftId)
  state = advanceTycoonCare(state, id, 'care', shiftId)
  const worsening = state.activeShift!.tasks.find((task) => task.id === id)!.simulation!.condition === 'worsening'
  state = decideTycoonCare(state, id, worsening ? 'escalate' : 'improved', 'reassessment', shiftId)
  return advanceTycoonCare(state, id, 'documentation', shiftId)
}

describe('replayable ward simulation', () => {
  it('starts three distinct cases, preserves a running shift, and rotates the next shift', () => {
    const first = start()
    expect(new Set(first.activeShift!.tasks.map((task) => task.simulation!.scenario)).size).toBe(3)
    expect(startTycoonShiftForUnit(first, 'fundamentals-clinic', { simulation: true })).toBe(first)
    const next = startTycoonShiftForUnit(finishTycoonShiftNow(first), 'fundamentals-clinic', { simulation: true })
    expect(next.activeShift!.tasks[0].simulation!.scenario).not.toBe(first.activeShift!.tasks[0].simulation!.scenario)
    expect(next.activeShift!.tasks[0].id).not.toBe(first.activeShift!.tasks[0].id)
  })
  it('changes symptoms and vitals once when an untreated patient becomes overdue', () => {
    const initial = start(), observation = patientObservation(initial.activeShift!.tasks[0])
    const overdue = advanceTycoonShiftTime(initial, 8)
    expect(overdue.activeShift!.tasks[0].simulation!.condition).toBe('worsening')
    expect(patientObservation(overdue.activeShift!.tasks[0])).not.toEqual(observation)
    expect(advanceTycoonShiftTime(overdue, 1).patientSafety).toBe(overdue.patientSafety)
  })
  it('does not permit reward or discharge without the complete clinical sequence', () => {
    const state = start(), task = state.activeShift!.tasks[0], sid = state.activeShift!.id
    expect(completeTycoonTaskWithAction(state, task.id, task.correctActionId, sid)).toBe(state)
    expect(dischargeTycoonPatient(state, task.id, sid)).toBe(state)
    const prepared = readyForCare(state, task.id)
    expect(advanceTycoonCare(prepared, task.id, 'care', sid)).toBe(prepared)
    expect(advanceTycoonCare(prepared, task.id, 'documentation', sid)).toBe(prepared)
  })
  it.each(['chest', 'medication', 'falls'] as const)('completes %s with recorded observations, choices, and one payout', (scenario) => {
    const state = start(), task = state.activeShift!.tasks.find((task) => task.simulation!.scenario === scenario)!, sid = state.activeShift!.id
    const finished = complete(state, task.id), result = finished.activeShift!.tasks.find((item) => item.id === task.id)!
    expect(result.status).toBe('completed')
    expect(result.simulation!.condition).toBe('stable')
    expect(result.careProgress!.steps).toHaveLength(6)
    expect(finished.money).toBe(state.money + task.rewardMoney)
    expect(advanceTycoonCare(finished, task.id, 'documentation', sid)).toBe(finished)
    expect(completeTycoonTaskWithAction(finished, task.id, task.correctActionId, sid)).toBe(finished)
  })
  it('penalizes a repeated wrong choice only once, then requires escalation for persistent symptoms', () => {
    const state = start(), id = state.activeShift!.tasks[0].id, sid = state.activeShift!.id
    const ready = readyForCare(state, id)
    const wrong = decideTycoonCare(ready, id, 'walk-it-off', 'care', sid)
    expect(wrong.money).toBe(ready.money - 25)
    expect(decideTycoonCare(wrong, id, 'walk-it-off', 'care', sid)).toBe(wrong)
    let treated = decideTycoonCare(wrong, id, 'urgent-help', 'care', sid)
    treated = advanceTycoonCare(treated, id, 'care', sid)
    const incorrect = decideTycoonCare(treated, id, 'improved', 'reassessment', sid)
    expect(incorrect.activeShift!.tasks[0].careProgress!.steps).not.toContain('reassessment')
    const escalated = decideTycoonCare(incorrect, id, 'escalate', 'reassessment', sid)
    expect(escalated.activeShift!.tasks[0].simulation!.condition).toBe('stable')
    expect(escalated.activeShift!.tasks[0].careProgress!.steps).toContain('reassessment')
  })
  it('allows recovery after either incorrect reassessment without creating a dead end', () => {
    let state = start()
    const id = state.activeShift!.tasks[0].id, sid = state.activeShift!.id
    state = readyForCare(state, id)
    state = decideTycoonCare(state, id, 'urgent-help', 'care', sid)
    state = advanceTycoonCare(state, id, 'care', sid)
    state = decideTycoonCare(state, id, 'escalate', 'reassessment', sid)
    state = decideTycoonCare(state, id, 'improved', 'reassessment', sid)
    expect(state.activeShift!.tasks[0].careProgress!.steps).toContain('reassessment')
  })
  it('archives discharge and admits a unique patient in the same room without extra rewards', () => {
    const state = start(), task = state.activeShift!.tasks[0], sid = state.activeShift!.id
    const completed = complete(state, task.id)
    const next = dischargeTycoonPatient(completed, task.id, sid)
    expect(next.money).toBe(completed.money)
    expect(next.activeShift!.tasks[0].room).toBe(task.room)
    expect(next.activeShift!.tasks[0].id).not.toBe(task.id)
    expect(next.activeShift!.simulation!.archived).toHaveLength(1)
    expect(next.activeShift!.tasks).toHaveLength(3)
    expect(dischargeTycoonPatient(next, task.id, sid)).toBe(next)
    expect(advanceTycoonCare(next, task.id, 'documentation', sid)).toBe(next)
    expect(summarizeTycoonShift(next.activeShift!, next).completedTasks).toBe(1)
  })
  it('finishes on timeout once, preserves its review after reload, and rejects stale events', () => {
    const state = start(), id = state.activeShift!.id
    const end = advanceTycoonShiftTime(state, 100)
    expect(end.activeShift!.status).toBe('finished')
    expect(end.activeShift!.shiftMinute).toBe(24)
    expect(end.completedShifts).toHaveLength(1)
    const restored = JSON.parse(JSON.stringify(end)) as TycoonGameState
    expect(finishTycoonShiftNow(restored)).toBe(restored)
    expect(advanceTycoonShiftTime(restored, 1)).toBe(restored)
    const next = startTycoonShiftForUnit(restored, 'fundamentals-clinic', { simulation: true })
    expect(assessTycoonPatient(next, next.activeShift!.tasks[0].id, 'focused-assessment', id)).toBe(next)
  })
  it('awards the shift objective once and unlocks room/staff progression', () => {
    let state = start()
    const initialIds = state.activeShift!.tasks.map((task) => task.id), sid = state.activeShift!.id
    for (const id of initialIds) state = dischargeTycoonPatient(complete(state, id), id, sid)
    const end = finishTycoonShiftNow(state)
    expect(end.activeShift!.payoutSummary!.objectiveMet).toBe(true)
    expect(end.money).toBe(state.money + 150)
    expect(finishTycoonShiftNow(end)).toBe(end)
    expect(upgradeRequirement(end, 'extra-bed')).toBeNull()
    expect(upgradeRequirement(end, 'simulation-room')).not.toBeNull()
    const bought = purchaseTycoonUpgradeById(end, 'extra-bed')
    expect(bought.money).toBe(end.money - 300)
    const next = startTycoonShiftForUnit(bought, 'fundamentals-clinic', { simulation: true })
    expect(next.activeShift!.tasks).toHaveLength(4)
    expect(upgradeRequirement({ ...next, completedShifts: [] }, 'extra-bed')).toBeNull()
  })
  it('applies equipment benefits and keeps historical earnings fixed after upgrades', () => {
    const state = start(), task = state.activeShift!.tasks[1]
    const upgraded = { ...state, upgrades: { 'ehr-station': 1, 'med-safety-scanner': 1, 'simulation-room': 1 } }
    const end = complete(upgraded, task.id)
    expect(end.activeShift!.shiftMinute).toBe(2.5)
    expect(end.money).toBe(state.money + 195)
    expect(end.xp).toBe(49)
    const changed = { ...end, upgrades: { 'med-safety-scanner': 2, 'simulation-room': 3 } }
    expect(summarizeTycoonShift(end.activeShift!, changed).moneyEarned).toBe(195)
    expect(summarizeTycoonShift(end.activeShift!, changed).xpEarned).toBe(49)
    expect(purchaseTycoonUpgradeById(state, 'extra-bed')).toBe(state)
  })
  it('leaves a room vacant when the finite admission queue is exhausted', () => {
    let state = start()
    const sid = state.activeShift!.id
    for (let i = 0; i < 3; i++) {
      const id = state.activeShift!.tasks[0].id
      state = dischargeTycoonPatient(complete(state, id), id, sid)
    }
    expect(state.activeShift!.simulation!.admitted).toBe(5)
    expect(state.activeShift!.tasks[0].simulation!.discharged).toBe(true)
    expect(dischargeTycoonPatient(state, state.activeShift!.tasks[0].id, sid)).toBe(state)
  })
})
