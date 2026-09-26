import { describe, expect, it, vi } from 'vitest'
import { tycoonStarterTasks } from '../../data/tycoon'
import { projectGround, type GroundPoint } from '../tycoon-care-presentation'
import { findWardPath, isWardWalkable, STATION_POSITION, TycoonWardController, unprojectGround, wardTargets, type WardState } from '../tycoon-ward'
import { CORRIDOR, ROOM_DOOR, ROOM_SPACING, WARD_ROOM, roomPoint } from '../tycoon-ward-layout'

const state = (count = 3): WardState => ({ shiftId: 'shift-1', tasks: tycoonStarterTasks.slice(0, count), selectedTaskId: tycoonStarterTasks[0].id, reviewedTaskIds: [], paused: false, reducedMotion: false })
const drive = (ward: TycoonWardController, frames = 2000) => {
  for (let i = 0; i < frames; i++) {
    ward.tick(16)
    expect(isWardWalkable(ward.snapshot().position, 6)).toBe(true)
  }
}
const samplePath = (start: GroundPoint, path: GroundPoint[]) => {
  const samples = [start]
  let previous = start
  for (const end of path) {
    const count = Math.max(1, Math.ceil(Math.hypot(end.u - previous.u, end.v - previous.v) / 0.04))
    for (let index = 1; index <= count; index++) {
      samples.push({ u: previous.u + (end.u - previous.u) * index / count, v: previous.v + (end.v - previous.v) * index / count })
    }
    previous = end
  }
  return samples
}

describe('playable ward', () => {
  it('routes through doors and around furniture to every patient and monitor, including legacy six-room saves', () => {
    const interact = vi.fn(), ward = new TycoonWardController(interact)
    ward.update(state(6))
    for (const target of [...wardTargets(state(6).tasks).slice(1), wardTargets(state(6).tasks)[0]]) {
      expect(ward.goTo(target.id)).toBe(true)
      drive(ward)
      expect(interact).toHaveBeenLastCalledWith(target)
      expect(ward.snapshot().position).toEqual(target.position)
    }
    expect(interact).toHaveBeenCalledTimes(19)
  })

  it('rejects beds, walls, station furniture and the outside of the ward', () => {
    for (const point of [{ u: 5.4, v: 1.2 }, { u: 6.97, v: -0.08 }, { u: 3.7, v: 2 }, { u: 4.5, v: 2.8 }, { u: 1, v: 3.5 }, { u: -10, v: 4 }]) {
      expect(isWardWalkable(point, 3)).toBe(false)
      expect(findWardPath(STATION_POSITION, point, 3)).toBeNull()
    }
  })

  it('reaches the added rear and right floor space in all six enlarged rooms', () => {
    for (let room = 0; room < 6; room++) {
      const rear = roomPoint(room, { u: 6.4, v: -0.6 })
      const right = roomPoint(room, { u: 7.7, v: 0.8 })
      for (const [start, end] of [[STATION_POSITION, rear], [rear, right], [right, STATION_POSITION]]) {
        expect(isWardWalkable(end, 6)).toBe(true)
        const path = findWardPath(start, end, 6)
        expect(path).not.toBeNull()
        expect(path!.at(-1)).toEqual(end)
        expect(samplePath(start, path!).every((point) => isWardWalkable(point, 6))).toBe(true)
      }
    }
  })

  it('keeps the room gaps and side walls outside the walkable floor', () => {
    for (let room = 0; room < 6; room++) {
      const blocked = [
        roomPoint(room, { u: WARD_ROOM.minU, v: 1.7 }),
        roomPoint(room, { u: WARD_ROOM.maxU, v: 1.7 }),
      ]
      if (room < 5) blocked.push(roomPoint(room, { u: (WARD_ROOM.maxU + WARD_ROOM.minU + ROOM_SPACING) / 2, v: 1.7 }))
      for (const point of blocked) {
        expect(isWardWalkable(point, 6)).toBe(false)
        expect(findWardPath(STATION_POSITION, point, 6)).toBeNull()
      }
    }
  })

  it('uses the corridor and both doorways when travelling between neighboring rooms', () => {
    for (let room = 0; room < 5; room++) {
      const start = roomPoint(room, { u: 7.7, v: 0.8 })
      const end = roomPoint(room + 1, { u: 4.1, v: -0.6 })
      const path = findWardPath(start, end, 6)
      expect(path).not.toBeNull()
      const samples = samplePath(start, path!)
      expect(samples.filter((point) => !isWardWalkable(point, 6))).toEqual([])
      expect(samples.some((point) => point.v >= CORRIDOR.minV + 0.22)).toBe(true)
      for (const crossedRoom of [room, room + 1]) {
        const doorway = samples.filter((point) => point.v > WARD_ROOM.maxV - 0.15 && point.v < WARD_ROOM.maxV + 0.15
          && point.u > WARD_ROOM.minU + crossedRoom * ROOM_SPACING && point.u < WARD_ROOM.maxU + crossedRoom * ROOM_SPACING)
        expect(doorway.length).toBeGreaterThan(0)
        expect(doorway.every((point) => point.u >= ROOM_DOOR.minU + crossedRoom * ROOM_SPACING
          && point.u <= ROOM_DOOR.maxU + crossedRoom * ROOM_SPACING)).toBe(true)
      }
    }
  })

  it('moves in screen directions, normalizes diagonals and cancels a route on manual input', () => {
    const ward = new TycoonWardController(vi.fn())
    ward.update(state())
    expect(ward.goTo(`patient:${state().tasks[0].id}`)).toBe(true)
    const from = ward.snapshot().screenPosition
    ward.tick(16, { x: 1, y: 0 })
    const to = ward.snapshot().screenPosition
    expect(to.x).toBeGreaterThan(from.x)
    expect(to.y).toBeCloseTo(from.y)
    expect(ward.snapshot().path).toHaveLength(0)
    const diagonal = new TycoonWardController(vi.fn())
    diagonal.update(state()); diagonal.tick(16, { x: 1, y: 1 })
    const d = diagonal.snapshot().screenPosition
    expect(Math.hypot(d.x - from.x, d.y - from.y)).toBeCloseTo(to.x - from.x)
  })

  it('blocks held movement at obstacles, including after a long frame stall', () => {
    const ward = new TycoonWardController(vi.fn())
    ward.update(state())
    for (let i = 0; i < 300; i++) {
      ward.tick(5000, { x: -1, y: -1 })
      expect(isWardWalkable(ward.snapshot().position, 3)).toBe(true)
    }
  })

  it('pauses navigation and interaction for dialogs and hidden tabs, then resumes without a jump', () => {
    const interact = vi.fn(), ward = new TycoonWardController(interact)
    ward.update(state()); ward.goTo(`patient:${state().tasks[0].id}`); ward.tick(16)
    const before = ward.snapshot().position
    ward.update({ ...state(), paused: true }); ward.tick(10000, { x: 1, y: 1 }); ward.interact()
    expect(ward.snapshot().position).toEqual(before); expect(interact).not.toHaveBeenCalled()
    ward.update(state()); ward.setHidden(true); ward.tick(10000)
    expect(ward.snapshot().position).toEqual(before)
    ward.setHidden(false); ward.tick(10000)
    expect(Math.hypot(ward.snapshot().position.u - before.u, ward.snapshot().position.v - before.v)).toBeLessThan(0.2)
  })

  it('keeps reduced-motion movement functional and gives no remote interaction', () => {
    const interact = vi.fn(), ward = new TycoonWardController(interact)
    ward.update({ ...state(), reducedMotion: true }); ward.tick(16, { x: 1, y: 0 })
    expect(ward.snapshot().frame).toContain('idle')
    ward.moveTo({ u: 4, v: 4.5 }); drive(ward); ward.interact()
    expect(interact).not.toHaveBeenCalled()
    ward.goTo(`patient:${state().tasks[0].id}`); drive(ward)
    expect(interact).toHaveBeenCalledTimes(1)
  })

  it('resets location and pending interactions when a new shift starts', () => {
    const interact = vi.fn(), ward = new TycoonWardController(interact)
    ward.update(state()); ward.goTo(`patient:${state().tasks[0].id}`); ward.tick(50)
    ward.update({ ...state(), shiftId: 'shift-2' }); drive(ward)
    expect(ward.snapshot().position).toEqual(STATION_POSITION)
    expect(interact).not.toHaveBeenCalled()
    expect(unprojectGround(projectGround({ u: 6, v: 3 }))).toEqual({ u: 6, v: 3 })
  })

  it('queues the next destination through the bedside animation and pauses it with the shop', () => {
    const interact = vi.fn(), ward = new TycoonWardController(interact)
    const initial = state(), task = initial.tasks[0]
    ward.update(initial); ward.goTo(`patient:${task.id}`); drive(ward)
    interact.mockClear()
    const cared: WardState = { ...initial, tasks: initial.tasks.map((item) => item.id === task.id
      ? { ...item, careProgress: { assessmentActionId: 'assess', steps: ['assessment', 'monitor', 'safety', 'care'] } } : item) }
    ward.update(cared)
    expect(ward.status().caring).toBe(true)
    expect(ward.goTo('station')).toBe(true)
    ward.update({ ...cared, paused: true }); drive(ward, 200)
    expect(ward.status().caring).toBe(true)
    expect(interact).not.toHaveBeenCalled()
    ward.update(cared); drive(ward)
    expect(ward.status().caring).toBe(false)
    expect(ward.snapshot().position).toEqual(STATION_POSITION)
    expect(interact).toHaveBeenCalledExactlyOnceWith(ward.targets()[0])
  })
})
