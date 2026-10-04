import { describe, expect, it } from 'vitest'
import { careCompletions } from '../tycoon-care-feedback'
import { advanceTycoonCare, assessTycoonPatient, CARE_STEPS } from '../tycoon-care'
import { createInitialTycoonState, startTycoonShiftForUnit } from '../tycoon-engine'

describe('care completion feedback', () => {
  it('reports recorded stages and a single reward only after documentation', () => {
    let state = startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic')
    const task = state.activeShift!.tasks[0], shiftId = state.activeShift!.id
    let next = assessTycoonPatient(state, task.id, task.correctActionId, shiftId)
    expect(careCompletions(state, next)).toEqual([{ id: `${shiftId}:${task.id}:assessment`, taskId: task.id, step: 'assessment', reward: undefined }])
    state = next
    for (const step of CARE_STEPS.slice(1)) {
      next = advanceTycoonCare(state, task.id, step, shiftId)
      const feedback = careCompletions(state, next)
      expect(feedback).toHaveLength(1)
      expect(Boolean(feedback[0].reward)).toBe(step === 'documentation')
      expect(careCompletions(next, advanceTycoonCare(next, task.id, step, shiftId))).toEqual([])
      state = next
    }
  })
  it('does not replay completion during hydration, new shifts, or rejected actions', () => {
    const state = startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic')
    expect(careCompletions(state, JSON.parse(JSON.stringify(state)))).toEqual([])
    const next = startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic')
    expect(careCompletions(state, next)).toEqual([])
    const task = state.activeShift!.tasks[0]
    expect(careCompletions(state, assessTycoonPatient(state, task.id, 'invalid', state.activeShift!.id))).toEqual([])
  })
})
