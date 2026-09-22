import { describe, expect, it } from 'vitest'
import { createInitialTycoonState, finishTycoonShiftNow, reviewTycoonEquipment, startTycoonShiftForUnit } from '../tycoon-engine'

describe('equipment review', () => {
  it('persists once per patient without rewarding or completing a care task', () => {
    const start = startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic')
    const shift = start.activeShift!, task = shift.tasks[0]
    const reviewed = reviewTycoonEquipment(start, task.id, shift.id)
    expect(reviewed.activeShift?.equipmentReviewedTaskIds).toEqual([task.id])
    expect(reviewed.money).toBe(start.money)
    expect(reviewed.activeShift?.tasks[0].status).toBe('available')
    expect(reviewTycoonEquipment(reviewed, task.id, shift.id)).toBe(reviewed)
    expect(reviewTycoonEquipment(start, task.id, 'old-shift')).toBe(start)
    expect(reviewTycoonEquipment(start, 'unknown', shift.id)).toBe(start)
    const finished = finishTycoonShiftNow(reviewed)
    expect(reviewTycoonEquipment(finished, shift.tasks[1].id, shift.id)).toBe(finished)
  })
})
