import { describe, expect, it } from 'vitest'
import { advanceTycoonCare, assessTycoonPatient, decideTycoonCare, nextCareStep } from '../tycoon-care'
import { advanceTycoonShiftTime, createInitialTycoonState, dischargeTycoonPatient, finishTycoonShiftNow, getBestTycoonTask, startTycoonShiftForUnit } from '../tycoon-engine'
import { advanceShiftLoop, careNoteDraft, patientResponse, respondToCall, shiftPhase } from '../tycoon-shift-loop'
import { tycoonScenarios } from '../../data/tycoon-scenarios'

const start = (upgrades = {}) => startTycoonShiftForUnit({ ...createInitialTycoonState(), upgrades }, 'fundamentals-clinic', { simulation: true, paced: true })
describe('paced bedside shifts', () => {
  it('combines identity, monitor, and safety with assessment except the medication verification', () => {
    const state = start(), sid = state.activeShift!.id
    for (const task of state.activeShift!.tasks) {
      const result = assessTycoonPatient(state, task.id, task.correctActionId, sid)
      const updated = result.activeShift!.tasks.find((item) => item.id === task.id)!
      expect(updated.careProgress!.steps).toEqual(task.simulation!.scenario === 'medication' ? ['assessment', 'monitor'] : ['assessment', 'monitor', 'safety'])
      expect(nextCareStep(updated)).toBe(task.simulation!.scenario === 'medication' ? 'safety' : 'care')
      expect(result.activeShift!.equipmentReviewedTaskIds).toContain(task.id)
      expect(result.money).toBe(state.money)
    }
  })
  it('makes the scanner combine medication verification without awarding early rewards', () => {
    const state = start({ 'med-safety-scanner': 1 }), task = state.activeShift!.tasks[1]
    const result = assessTycoonPatient(state, task.id, task.correctActionId, state.activeShift!.id)
    expect(result.activeShift!.tasks[1].simulation!.scannerUsed).toBe(true)
    expect(nextCareStep(result.activeShift!.tasks[1])).toBe('care')
    expect(result.money).toBe(state.money)
  })
  it('introduces the comfort call after initial assessment and one complication later', () => {
    let state = start()
    const task = state.activeShift!.tasks[0]
    expect(shiftPhase(state.activeShift!)).toBe('Opening rounds')
    expect(state.activeShift!.loop!.calls).toHaveLength(0)
    state = assessTycoonPatient(state, task.id, task.correctActionId, state.activeShift!.id)
    expect(state.activeShift!.loop!.calls).toHaveLength(1)
    const complication = advanceTycoonShiftTime(state, 3)
    expect(complication.activeShift!.loop!.calls).toHaveLength(2)
    const call = complication.activeShift!.loop!.calls.find((call) => call.kind === 'change')!
    expect(getBestTycoonTask(complication.activeShift)!.id).toBe(call.taskId)
    expect(patientResponse(complication.activeShift!.tasks.find((task) => task.id === call.taskId)!).expression).toBe('Distressed')
    expect(shiftPhase(complication.activeShift!)).toBe('Respond & recover')
    expect(advanceShiftLoop(complication)).toBe(complication)
  })
  it('delegates only comfort work and reports completion once after a game-clock interval', () => {
    const state = advanceTycoonShiftTime(start({ 'staff-training': 1 }), 3), sid = state.activeShift!.id
    const comfort = state.activeShift!.loop!.calls.find((call) => call.kind === 'comfort')!, change = state.activeShift!.loop!.calls.find((call) => call.kind === 'change')!
    expect(respondToCall(state, change.id, 'delegate', sid)).toBe(state)
    expect(respondToCall({ ...state, upgrades: {} }, comfort.id, 'delegate', sid).activeShift).toBe(state.activeShift)
    const assigned = respondToCall(state, comfort.id, 'delegate', sid)
    expect(respondToCall(assigned, comfort.id, 'delegate', sid)).toBe(assigned)
    const restored = JSON.parse(JSON.stringify(assigned)) as typeof state
    const completed = advanceTycoonShiftTime(restored, 0.5)
    expect(completed.activeShift!.loop!.calls.find((call) => call.id === comfort.id)!.answeredBy).toBe('staff')
    expect(completed.activeShift!.events.filter((event) => event.title === 'Support request completed')).toHaveLength(1)
    expect(advanceTycoonShiftTime(completed, 0.5).activeShift!.events.filter((event) => event.title === 'Support request completed')).toHaveLength(1)
    expect(completed.money).toBe(state.money)
  })
  it('defers once without extending a deadline, penalizes delay once, and allows later attendance', () => {
    let state = advanceTycoonShiftTime(start(), 3)
    const sid = state.activeShift!.id
    const call = state.activeShift!.loop!.calls.find((call) => call.kind === 'change')!
    state = respondToCall(state, call.id, 'defer', sid)
    expect(respondToCall(state, call.id, 'defer', sid)).toBe(state)
    expect(state.activeShift!.loop!.calls.find((item) => item.id === call.id)!.dueMinute).toBe(call.dueMinute)
    const late = advanceTycoonShiftTime(state, 3.5)
    expect(late.activeShift!.loop!.calls.find((item) => item.id === call.id)!.status).toBe('missed')
    const later = advanceTycoonShiftTime(late, 0.1)
    expect(later.patientSafety).toBe(late.patientSafety)
    const answered = respondToCall(later, call.id, 'attend', sid)
    expect(answered.activeShift!.loop!.calls.find((item) => item.id === call.id)!.status).toBe('answered')
    expect(answered.activeShift!.tasks.find((task) => task.id === call.taskId)!.simulation!.condition).toBe('worsening')
    expect(respondToCall(answered, call.id, 'attend', sid)).toBe(answered)
    expect(respondToCall(answered, call.id, 'attend', 'old-shift')).toBe(answered)
  })
  it('drafts only recorded care and changes patient expression with the actual response', () => {
    let state = start(), task = state.activeShift!.tasks[0]
    const sid = state.activeShift!.id
    expect(careNoteDraft(task)).toContain('Care: Not yet completed.')
    expect(patientResponse(task).expression).toBe('Concerned')
    state = assessTycoonPatient(state, task.id, task.correctActionId, sid)
    state = decideTycoonCare(state, task.id, tycoonScenarios.chest.intervention, 'care', sid)
    state = advanceTycoonCare(state, task.id, 'care', sid)
    expect(patientResponse(state.activeShift!.tasks[0]).expression).toBe('Settling')
    state = decideTycoonCare(state, task.id, 'improved', 'reassessment', sid)
    task = state.activeShift!.tasks[0]
    expect(patientResponse(task).expression).toBe('Relieved')
    expect(careNoteDraft(task)).toContain('Stay with the patient')
    expect(careNoteDraft(task)).not.toContain('Not yet completed.')
    state = advanceTycoonCare(state, task.id, 'documentation', sid)
    state = dischargeTycoonPatient(state, task.id, sid)
    expect(state.activeShift!.tasks[0].simulation!.workflow).toBe('bedside')
  })
  it('reviews missed work and recommends support after a deferred comfort request', () => {
    let state = advanceTycoonShiftTime(start(), 1)
    state = respondToCall(state, state.activeShift!.loop!.calls[0].id, 'defer', state.activeShift!.id)
    const review = finishTycoonShiftNow(state).activeShift!.payoutSummary!
    expect(review.recommendedUpgrade).toBe('Support Nurse')
    expect(review.highlights).toHaveLength(3)
    expect(review.delays!.length).toBeGreaterThan(0)
    expect(review.recommendation).toContain('delegate comfort requests')
  })
})
