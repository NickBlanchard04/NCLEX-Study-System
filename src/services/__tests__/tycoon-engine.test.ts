import { describe, expect, it } from 'vitest'
import type { TycoonGameState } from '../../app/types'
import { tycoonStarterTasks } from '../../data/tycoon'
import {
  advanceTycoonShiftTime,
  completeTycoonTaskWithAction,
  createInitialTycoonState,
  finishTycoonShiftNow,
  getBestTycoonTask,
  selectTycoonTaskById,
  startTycoonShiftForUnit,
} from '../tycoon-engine'

const startShift = () => startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic')

const taskForRoom = (state: TycoonGameState, room: string) => {
  const task = state.activeShift?.tasks.find((item) => item.room === room)
  if (!task) throw new Error(`Expected a task for ${room}`)
  return task
}

describe('tycoon shift integration', () => {
  it('starts only an unlocked unit and keeps the source state and starter tasks independent', () => {
    const initial = createInitialTycoonState()
    const initialCopy = structuredClone(initial)

    expect(startTycoonShiftForUnit(initial, 'icu-prep')).toBe(initial)

    const started = startTycoonShiftForUnit(initial, 'fundamentals-clinic')
    const priority = getBestTycoonTask(started.activeShift)

    expect(started.activeShift?.status).toBe('running')
    expect(started.activeShift?.tasks).toHaveLength(6)
    expect(started.activeShift?.shiftMinute).toBe(0)
    expect(priority?.room).toBe('Room 101')
    expect(started.selectedTaskId).toBe(priority?.id)
    expect(initial).toEqual(initialCopy)

    const startedTask = taskForRoom(started, 'Room 101')
    expect(startedTask).not.toBe(tycoonStarterTasks[0])
    expect(startedTask.actions[0]).not.toBe(tycoonStarterTasks[0].actions[0])
    expect(startedTask.unsafePenalty).not.toBe(tycoonStarterTasks[0].unsafePenalty)
  })

  it('starts and restarts a one-room prototype without resetting earned progress or carrying care events over', () => {
    const initial = createInitialTycoonState()
    const started = startTycoonShiftForUnit(initial, 'fundamentals-clinic', { roomIds: ['Room 101'] })
    const task = taskForRoom(started, 'Room 101')
    const completed = completeTycoonTaskWithAction(started, task.id, task.correctActionId, started.activeShift!.id)
    const restarted = startTycoonShiftForUnit(completed, 'fundamentals-clinic', { roomIds: ['Room 101'] })

    expect(started.activeShift?.tasks).toHaveLength(1)
    expect(started.selectedTaskId).toBe(task.id)
    expect(started.activeShift?.shiftMinute).toBe(0)
    expect(restarted.activeShift?.id).not.toBe(started.activeShift?.id)
    expect(restarted.activeShift?.tasks).toHaveLength(1)
    expect(taskForRoom(restarted, 'Room 101').status).toBe('available')
    expect(restarted.activeShift?.events.map((event) => event.type)).toEqual(['shift'])
    expect(restarted.activeShift?.shiftMinute).toBe(0)
    expect(restarted.money).toBe(completed.money)
    expect(restarted.xp).toBe(completed.xp)
    expect(startTycoonShiftForUnit(initial, 'fundamentals-clinic', { roomIds: [] })).toBe(initial)
    expect(startTycoonShiftForUnit(initial, 'fundamentals-clinic', { roomIds: ['Room 999'] })).toBe(initial)
  })

  it('rejects an action captured from a previous shift even though the new shift reuses task ids', () => {
    const first = startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic', { roomIds: ['Room 101'] })
    const task = taskForRoom(first, 'Room 101')
    const next = startTycoonShiftForUnit(first, 'fundamentals-clinic', { roomIds: ['Room 101'] })

    expect(completeTycoonTaskWithAction(next, task.id, task.correctActionId, first.activeShift!.id)).toBe(next)
    expect(completeTycoonTaskWithAction(next, task.id, 'delegate-vitals', first.activeShift!.id)).toBe(next)

    const completed = completeTycoonTaskWithAction(next, task.id, task.correctActionId, next.activeShift!.id)
    expect(taskForRoom(completed, 'Room 101').status).toBe('completed')
    expect(completed.money).toBe(next.money + task.rewardMoney)
    expect(completed.xp).toBe(next.xp + task.rewardXp)
    expect(completed.activeShift?.shiftMinute).toBe(task.timeCost)
  })

  it('does not mutate the clock, rewards, or events when duplicate or invalid assessments arrive', () => {
    const started = startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic', { roomIds: ['Room 101'] })
    const task = taskForRoom(started, 'Room 101')
    const shiftId = started.activeShift!.id
    expect(completeTycoonTaskWithAction(started, task.id, 'missing-action', shiftId)).toBe(started)
    expect(completeTycoonTaskWithAction(started, 'missing-task', task.correctActionId, shiftId)).toBe(started)

    const completed = completeTycoonTaskWithAction(started, task.id, task.correctActionId, shiftId)
    const resumed = JSON.parse(JSON.stringify(completed)) as TycoonGameState
    expect(completeTycoonTaskWithAction(resumed, task.id, task.correctActionId, shiftId)).toBe(resumed)
    expect(completeTycoonTaskWithAction(resumed, task.id, 'delegate-vitals', shiftId)).toBe(resumed)
    expect(resumed.activeShift?.events.filter((event) => event.type === 'reward')).toHaveLength(1)
    expect(resumed.money).toBe(started.money + task.rewardMoney)
    expect(resumed.xp).toBe(started.xp + task.rewardXp)
    expect(resumed.activeShift?.shiftMinute).toBe(task.timeCost)

    const failed = completeTycoonTaskWithAction(started, task.id, 'delegate-vitals', shiftId)
    expect(completeTycoonTaskWithAction(failed, task.id, 'delegate-vitals', shiftId)).toBe(failed)
    expect(completeTycoonTaskWithAction(failed, task.id, task.correctActionId, shiftId)).toBe(failed)
    expect(failed.activeShift?.events.filter((event) => event.type === 'reward')).toHaveLength(0)
  })

  it('selects a room without advancing time or changing the priority or previous selection', () => {
    const started = startShift()
    const originalSelection = started.selectedTaskId
    const target = taskForRoom(started, 'Room 105')
    const selected = selectTycoonTaskById(started, target.id)

    expect(selected.selectedTaskId).toBe(target.id)
    expect(selected.activeShift).toBe(started.activeShift)
    expect(selected.money).toBe(started.money)
    expect(selected.xp).toBe(started.xp)
    expect(getBestTycoonTask(selected.activeShift)?.room).toBe('Room 101')
    expect(started.selectedTaskId).toBe(originalSelection)
  })

  it('ignores unavailable selections and repeated shift completion', () => {
    const started = startTycoonShiftForUnit(createInitialTycoonState(), 'fundamentals-clinic', { roomIds: ['Room 101'] })
    expect(selectTycoonTaskById(started, started.selectedTaskId!)).toBe(started)
    expect(selectTycoonTaskById(started, 'fund-task-digoxin-check')).toBe(started)
    const finished = finishTycoonShiftNow(started)
    expect(finishTycoonShiftNow(finished)).toBe(finished)
    expect(selectTycoonTaskById(finished, started.selectedTaskId!)).toBe(finished)
    expect(finished.completedShifts).toHaveLength(1)
    expect(finished.activeShift?.events.filter((event) => event.title === 'Shift complete')).toHaveLength(1)
    expect(finished.money).toBe(started.money)
    expect(finished.xp).toBe(started.xp)
    expect(finished.activeShift?.shiftMinute).toBe(started.activeShift?.shiftMinute)
  })

  it('awards safe care once, advances the selection, and leaves the prior state unchanged', () => {
    const started = startShift()
    const before = structuredClone(started)
    const task = taskForRoom(started, 'Room 101')
    const completed = completeTycoonTaskWithAction(started, task.id, 'assess-first')

    expect(taskForRoom(completed, 'Room 101').status).toBe('completed')
    expect(completed.money).toBe(620)
    expect(completed.xp).toBe(15)
    expect(completed.patientSafety).toBe(91)
    expect(completed.activeShift?.shiftMinute).toBe(18)
    expect(completed.selectedTaskId).toBe(taskForRoom(completed, 'Room 102').id)
    expect(
      completed.activeShift?.events.find(
        (event) => event.type === 'reward' && event.taskId === task.id,
      )?.message,
    ).toContain('Assessment comes before routine work')
    expect(completeTycoonTaskWithAction(completed, task.id, 'assess-first')).toBe(completed)
    expect(started).toEqual(before)
  })

  it('fails an unsafe critical action, records useful feedback, and prevents further rewards for that task', () => {
    const started = startShift()
    const before = structuredClone(started)
    const task = taskForRoom(started, 'Room 101')
    const failed = completeTycoonTaskWithAction(started, task.id, 'delegate-vitals')

    expect(taskForRoom(failed, 'Room 101').status).toBe('failed')
    expect(failed.money).toBe(350)
    expect(failed.patientSafety).toBe(76)
    expect(failed.xp).toBe(0)
    expect(failed.activeShift?.shiftMinute).toBe(9)
    expect(failed.selectedTaskId).toBe(task.id)
    expect(
      failed.activeShift?.events.find(
        (event) => event.type === 'penalty' && event.taskId === task.id,
      )?.message,
    ).toContain('Delegate vitals was not the safest move')
    expect(getBestTycoonTask(failed.activeShift)?.room).toBe('Room 102')
    expect(completeTycoonTaskWithAction(failed, task.id, 'assess-first')).toBe(failed)
    expect(started).toEqual(before)
  })

  it('allows a deteriorating noncritical patient to recover through the safe action', () => {
    const started = startShift()
    const task = taskForRoom(started, 'Room 102')
    const deteriorating = completeTycoonTaskWithAction(started, task.id, 'delegate-vitals')
    const recovered = completeTycoonTaskWithAction(deteriorating, task.id, 'double-check-meds')

    expect(taskForRoom(deteriorating, 'Room 102').status).toBe('deteriorating')
    expect(taskForRoom(recovered, 'Room 102').status).toBe('completed')
    expect(recovered.money).toBe(500)
    expect(recovered.xp).toBe(20)
    expect(recovered.patientSafety).toBe(80)
    expect(
      recovered.activeShift?.events
        .filter((event) => event.taskId === task.id)
        .map((event) => event.type),
    ).toEqual(['reward', 'penalty'])
  })

  it('keeps action feedback discoverable when delayed care also creates deterioration events', () => {
    const delayed = advanceTycoonShiftTime(startShift(), 60)
    const task = taskForRoom(delayed, 'Room 102')
    const completed = completeTycoonTaskWithAction(delayed, task.id, 'double-check-meds')

    expect(completed.activeShift?.events[0].type).toBe('deterioration')
    expect(taskForRoom(completed, 'Room 101').status).toBe('deteriorating')
    expect(
      completed.activeShift?.events.find(
        (event) => event.type === 'reward' && event.taskId === task.id,
      )?.message,
    ).toContain('Medication error prevented')
    expect(taskForRoom(delayed, 'Room 101').status).toBe('available')
    expect(delayed.activeShift?.shiftMinute).toBe(60)
  })

  it('automatically advances past a deadline with one safety penalty and no tick-event spam', () => {
    const started = startShift()
    const task = taskForRoom(started, 'Room 101')
    let running = started

    for (let minute = 0; minute < task.deadlineMinute; minute += 1) {
      running = advanceTycoonShiftTime(running, 1, { recordEvent: false })
    }

    expect(taskForRoom(running, 'Room 101').status).toBe('available')
    expect(running.patientSafety).toBe(started.patientSafety)
    expect(running.activeShift?.events).toEqual(started.activeShift?.events)

    const overdue = advanceTycoonShiftTime(running, 1, { recordEvent: false })
    const later = advanceTycoonShiftTime(overdue, 5, { recordEvent: false })

    expect(taskForRoom(overdue, 'Room 101').status).toBe('deteriorating')
    expect(overdue.patientSafety).toBe(started.patientSafety - task.unsafePenalty.patientSafety)
    expect(later.patientSafety).toBe(overdue.patientSafety)
    expect(later.activeShift?.shiftMinute).toBe(task.deadlineMinute + 6)
    expect(later.activeShift?.events).toHaveLength(2)
    expect(later.activeShift?.events[0]).toMatchObject({
      type: 'deterioration',
      taskId: task.id,
      minute: task.deadlineMinute + 1,
    })
    expect(later.activeShift?.events.some((event) => event.title === 'Time advanced')).toBe(false)
    expect(started.activeShift?.shiftMinute).toBe(0)
    expect(task.status).toBe('available')
  })

  it('keeps task time additive between automatic advances and still logs manual advances', () => {
    const started = startShift()
    const task = taskForRoom(started, 'Room 101')
    const ticked = advanceTycoonShiftTime(started, 8, { recordEvent: false })
    const completed = completeTycoonTaskWithAction(ticked, task.id, task.correctActionId)
    const tickedAgain = advanceTycoonShiftTime(completed, 2, { recordEvent: false })
    const manual = advanceTycoonShiftTime(tickedAgain, 5)

    expect(completed.activeShift?.shiftMinute).toBe(8 + task.timeCost)
    expect(tickedAgain.activeShift?.shiftMinute).toBe(10 + task.timeCost)
    expect(tickedAgain.activeShift?.events.map((event) => event.type)).toEqual(['reward', 'shift'])
    expect(manual.activeShift?.shiftMinute).toBe(15 + task.timeCost)
    expect(manual.activeShift?.events[0]).toMatchObject({
      type: 'shift',
      title: 'Time advanced',
      message: '5 minutes passed on the unit.',
    })
  })

  it('ignores invalid time advances and leaves stopped or missing shifts untouched', () => {
    const initial = createInitialTycoonState()
    const running = startShift()
    const finished = finishTycoonShiftNow(running)

    for (const minutes of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1]) {
      expect(advanceTycoonShiftTime(running, minutes)).toBe(running)
      expect(advanceTycoonShiftTime(running, minutes, { recordEvent: false })).toBe(running)
    }
    expect(advanceTycoonShiftTime(initial, 1)).toBe(initial)
    expect(advanceTycoonShiftTime(finished, 1)).toBe(finished)
    expect(advanceTycoonShiftTime(finished, 1, { recordEvent: false })).toBe(finished)
  })

  it('resumes serialized progress and preserves completed shift history when starting the next shift', () => {
    let running = startShift()
    const firstTask = taskForRoom(running, 'Room 101')
    running = completeTycoonTaskWithAction(running, firstTask.id, firstTask.correctActionId)
    running = JSON.parse(JSON.stringify(running)) as TycoonGameState

    expect(running.selectedTaskId).toBe(taskForRoom(running, 'Room 102').id)
    expect(getBestTycoonTask(running.activeShift)?.room).toBe('Room 102')

    for (const task of running.activeShift!.tasks) {
      if (task.status !== 'completed') {
        running = completeTycoonTaskWithAction(running, task.id, task.correctActionId)
      }
    }
    const beforeFinish = structuredClone(running)
    const finished = finishTycoonShiftNow(running)

    expect(finished.activeShift?.status).toBe('finished')
    expect(finished.activeShift?.payoutSummary).toMatchObject({
      completedTasks: 6,
      mistakes: 0,
      moneyEarned: 660,
      xpEarned: 76,
      safetyScore: 100,
    })
    expect(finished.money).toBe(running.money)
    expect(finished.xp).toBe(running.xp)
    expect(finished.selectedTaskId).toBeNull()
    expect(completeTycoonTaskWithAction(finished, firstTask.id, firstTask.correctActionId)).toBe(
      finished,
    )
    expect(running).toEqual(beforeFinish)

    const finishedCopy = structuredClone(finished)
    const next = startTycoonShiftForUnit(finished, 'fundamentals-clinic')

    expect(next.activeShift?.id).not.toBe(finished.activeShift?.id)
    expect(next.activeShift?.status).toBe('running')
    expect(next.activeShift?.tasks.every((task) => task.status === 'available')).toBe(true)
    expect(next.completedShifts).toHaveLength(1)
    expect(next.completedShifts[0]).toEqual(finished.activeShift)
    expect(next.money).toBe(finished.money)
    expect(next.xp).toBe(finished.xp)
    expect(finished).toEqual(finishedCopy)
  })
})
