import { describe, expect, it } from 'vitest'
import { advanceTycoonCare, assessTycoonPatient, CARE_STEPS, nextCareStep } from '../tycoon-care'
import { createInitialTycoonState, purchaseTycoonUpgradeById, startTycoonShiftForUnit } from '../tycoon-engine'

const start = () => startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic', { roomIds: ['Room 101', 'Room 102', 'Room 103'] })
describe('bedside care workflow', () => {
  it('requires the full sequence and awards the task exactly once after documentation', () => {
    let state = start()
    const shift = state.activeShift!, task = shift.tasks[0], money = state.money
    expect(advanceTycoonCare(state, task.id, 'documentation', shift.id)).toBe(state)
    state = assessTycoonPatient(state, task.id, task.correctActionId, shift.id)
    expect(state.money).toBe(money)
    expect(nextCareStep(state.activeShift!.tasks[0])).toBe('monitor')
    expect(assessTycoonPatient(state, task.id, task.correctActionId, shift.id)).toBe(state)
    expect(advanceTycoonCare(state, task.id, 'care', shift.id)).toBe(state)
    for (const step of CARE_STEPS.slice(1)) {
      const old = state
      state = advanceTycoonCare(state, task.id, step, shift.id)
      expect(state).not.toBe(old)
      expect(advanceTycoonCare(state, task.id, step, shift.id)).toBe(state)
      if (step !== 'documentation') { expect(state.money).toBe(money); expect(state.activeShift!.tasks[0].status).not.toBe('completed') }
    }
    expect(state.money).toBe(money + task.rewardMoney)
    expect(state.activeShift!.tasks[0].status).toBe('completed')
    expect(state.activeShift!.equipmentReviewedTaskIds).toContain(task.id)
    expect(state.activeShift!.events.filter((event) => event.type === 'reward')).toHaveLength(1)
  })
  it('restores stage progress and rejects actions from a stale or finished shift', () => {
    let state = start()
    const shift = state.activeShift!, task = shift.tasks[0]
    state = assessTycoonPatient(state, task.id, task.correctActionId, shift.id)
    state = advanceTycoonCare(state, task.id, 'monitor', shift.id)
    state = JSON.parse(JSON.stringify(state))
    expect(nextCareStep(state.activeShift!.tasks[0])).toBe('safety')
    expect(advanceTycoonCare(state, task.id, 'safety', 'old-shift')).toBe(state)
    expect(assessTycoonPatient(state, task.id, task.correctActionId, 'old-shift')).toBe(state)
    const finished = { ...state, activeShift: { ...state.activeShift!, status: 'finished' as const } }
    expect(advanceTycoonCare(finished, task.id, 'safety', shift.id)).toBe(finished)
  })
  it('preserves unsafe-choice consequences and handles legacy completed patients', () => {
    const state = start(), shift = state.activeShift!, task = shift.tasks[0]
    expect(assessTycoonPatient(state, task.id, 'not-an-action', shift.id)).toBe(state)
    const failed = assessTycoonPatient(state, task.id, task.actions.find((action) => action.id !== task.correctActionId)!.id, shift.id)
    expect(failed.activeShift!.tasks[0].status).toBe('failed')
    expect(nextCareStep(failed.activeShift!.tasks[0])).toBeNull()
    expect(nextCareStep({ ...task, status: 'completed' })).toBeNull()
  })
  it('allows mid-shift purchases with affordability and maximum-level guards', () => {
    const state = start()
    const purchased = purchaseTycoonUpgradeById(state, 'staff-training')
    expect(purchased.activeShift!.id).toBe(state.activeShift!.id)
    expect(purchased.activeShift!.status).toBe('running')
    expect(purchased.upgrades['staff-training']).toBe(1)
    expect(purchased.money).toBe(state.money - 240)
    expect(purchaseTycoonUpgradeById({ ...state, money: 0 }, 'staff-training').upgrades).toEqual({})
    const maxed = { ...state, upgrades: { 'extra-bed': 3 } }
    expect(purchaseTycoonUpgradeById(maxed, 'extra-bed')).toBe(maxed)
  })
})
