import { walkFrame } from '../tycoon-walk-cycle'
import { HOSPITAL_MAP, localRoomPoint, roomEntrance } from '../tycoon-map-config'
import { describe, expect, it, vi } from 'vitest'
import { tycoonStarterTasks } from '../../data/tycoon'
import { projectGround, type GroundPoint } from '../tycoon-care-presentation'
import { findWardPath, isWardWalkable, STATION_POSITION, TycoonWardController, unprojectGround, wardTargets, type WardState } from '../tycoon-ward'
import { WARD_ROOM, roomPoint } from '../tycoon-ward-layout'

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
  it('keeps destination guidance through pause and clears it on arrival or manual steering', () => {
    const ward = new TycoonWardController(vi.fn()), initial = state()
    ward.update(initial)
    const id = `patient:${initial.tasks[0].id}`
    expect(ward.goTo(id)).toBe(true)
    expect(ward.snapshot().destination?.id).toBe(id)
    ward.update({ ...initial, paused: true })
    ward.tick(1000)
    expect(ward.snapshot().destination?.id).toBe(id)
    ward.update(initial)
    drive(ward)
    expect(ward.snapshot().destination).toBeNull()
    expect(ward.snapshot().path).toHaveLength(0)
    expect(ward.goTo('station')).toBe(true)
    ward.tick(16, { x: 1, y: 0 })
    expect(ward.snapshot().destination).toBeNull()
    expect(ward.snapshot().path).toHaveLength(0)
  })

  it('opens purchased empty rooms without allowing travel into still locked rooms', () => {
    const ward = new TycoonWardController(vi.fn()), initial = { ...state(3), upgrades: {} }
    ward.update(initial)
    const fourth = roomPoint(3, { u: 6.4, v: 1.85 })
    expect(ward.moveTo(fourth)).toBe(false)
    ward.update({ ...initial, upgrades: { 'extra-bed': 1 } })
    expect(ward.moveTo(fourth)).toBe(true)
    expect(ward.moveTo(roomPoint(4, { u: 6.4, v: 1.85 }))).toBe(false)
  })

  it('keeps subsequent routes safe when a caller edits a returned path and the ward size changes', () => {
    const end = roomPoint(0, { u: 6.4, v: -0.6 })
    const first = findWardPath(STATION_POSITION, end, 3)!
    expect(first.length).toBeGreaterThan(1)
    for (const point of first) { point.u = -100; point.v = -100 }
    for (const rooms of [1, 6, 3]) {
      const path = findWardPath(STATION_POSITION, end, rooms)!
      expect(path.at(-1)).toEqual(end)
      expect(samplePath(STATION_POSITION, path).every((point) => isWardWalkable(point, rooms))).toBe(true)
    }
  })

  it('cancels routes to discharged identities and preserves nurse position during admission turnover', () => {
    const interact = vi.fn(), ward = new TycoonWardController(interact), initial = state()
    ward.update(initial)
    ward.goTo(`patient:${initial.tasks[0].id}`)
    ward.tick(16)
    const position = ward.snapshot().position
    const replacement = { ...initial.tasks[0], id: 'new-admission', patientName: 'New Patient' }
    ward.update({ ...initial, tasks: [replacement, ...initial.tasks.slice(1)] })
    expect(ward.snapshot().position).toEqual(position)
    expect(ward.snapshot().path).toHaveLength(0)
    expect(ward.goTo(`patient:${initial.tasks[0].id}`)).toBe(false)
    expect(ward.goTo('patient:new-admission')).toBe(true)
    drive(ward)
    expect(interact).toHaveBeenCalledTimes(1)
    expect(interact.mock.calls[0][0].taskId).toBe('new-admission')
    expect(wardTargets([{ ...replacement, simulation: { scenario: 'chest', variant: 0, admittedMinute: 0, condition: 'stable', attempted: [], discharged: true } }])).toHaveLength(1)
  })
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
    for (const point of [{ u: 5.4, v: 1.2 }, { u: 6.97, v: -0.08 }, { u: 3.7, v: 2 }, { u: 4.5, v: 3.8 }, { u: 10.85, v: 6.65 }, { u: -10, v: 4 }]) {
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
        roomPoint(room, { u: WARD_ROOM.minU, v: .25 }),
        roomPoint(room, { u: WARD_ROOM.maxU, v: .25 }),
      ]
      blocked.push(roomPoint(room, { u: 4.1, v: WARD_ROOM.maxV }))
      for (const point of blocked) {
        expect(isWardWalkable(point, 6)).toBe(false)
        expect(findWardPath(STATION_POSITION, point, 6)).toBeNull()
      }
    }
  })

  it('uses the corridor and both doorways when travelling between neighboring rooms', () => {
    for (let room = 0; room < 5; room++) {
      const start = roomPoint(room, { u: 7.7, v: 0.8 })
      const end = roomPoint(room + 1, { u: 4.1, v: 0.5 })
      const path = findWardPath(start, end, 6)
      expect(path).not.toBeNull()
      const samples = samplePath(start, path!)
      expect(samples.filter((point) => !isWardWalkable(point, 6))).toEqual([])
      const spine=HOSPITAL_MAP.corridors[0]
      expect(samples.some(point=>point.u>spine.minU+.25&&point.u<spine.maxU-.25)).toBe(true)
      for (const crossedRoom of [room, room + 1]) {
        const door=roomEntrance(crossedRoom)
        const doorway = samples.map(point => localRoomPoint(HOSPITAL_MAP.rooms[crossedRoom],point)).filter(point=>Math.abs(point.u-door.u)<.15&&point.v>WARD_ROOM.minV&&point.v<WARD_ROOM.maxV)
        expect(doorway.length).toBeGreaterThan(0)
        expect(doorway.every(point=>point.v>=door.minV&&point.v<=door.maxV)).toBe(true)
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

  describe('distance driven movement', () => {
    it('travels the same distance with the same stride at 30, 60, 120 and 144 Hz',()=>{
      const poses=[30,60,120,144].map(hz=>{
        const ward=new TycoonWardController(vi.fn());ward.update(state())
        for(let i=0;i<hz;i++)ward.tick(1000/hz,{x:-1,y:0})
        return ward.snapshot()
      })
      for(const pose of poses) {
        expect(pose.strideDistance).toBeCloseTo(poses[0].strideDistance,5)
        expect(pose.screenPosition.y).toBeCloseTo(poses[0].screenPosition.y,5)
        expect(pose.frame).toBe(poses[0].frame)
      }
    })
  it('eases in, coasts to a short stop, and freezes the stride while idle or paused', () => {
    const ward = new TycoonWardController(vi.fn()); ward.update(state())
    ward.tick(16, { x: 1, y: 0 }); const first = ward.snapshot()
    for (let i = 0; i < 12; i++) ward.tick(16, { x: 1, y: 0 })
    expect(ward.snapshot().speed).toBeGreaterThan(first.speed)
    const from = ward.snapshot().screenPosition
    ward.tick(16); expect(ward.snapshot().moving).toBe(true)
    for (let i = 0; i < 20; i++) ward.tick(16)
    const stopped = ward.snapshot()
    expect(stopped.speed).toBe(0)
    expect(stopped.screenPosition.x - from.x).toBeLessThan(12)
    for (let i = 0; i < 20; i++) ward.tick(16)
    expect(ward.snapshot().strideDistance).toBe(stopped.strideDistance)
    ward.update({ ...state(), paused: true }); ward.tick(5000, {x: 1, y: 0})
    expect(ward.snapshot().strideDistance).toBe(stopped.strideDistance)
  })
  it('changes walk frames from traveled distance, preserves phase on turns, and faces the bedside on arrival', () => {
    const ward = new TycoonWardController(vi.fn()); ward.update(state())
    for (let i = 0; i < 10; i++) ward.tick(16, {x: 1, y: 0})
    const stride = ward.snapshot().strideDistance
    expect(ward.snapshot().frame).toContain(`walk-${walkFrame(stride)}`)
    for (let i = 0; i < 3; i++) ward.tick(16, {x: 1, y: i % 2 ? 0.001 : -0.001})
    expect(ward.snapshot().direction).toBe('se')
    ward.goTo(`patient:${state().tasks[0].id}`); drive(ward)
    expect(ward.snapshot().direction).toBe('ne')
    const stationary = ward.snapshot().strideDistance; drive(ward, 10)
    expect(ward.snapshot().strideDistance).toBe(stationary)
    ward.goTo('station'); drive(ward)
    expect(ward.snapshot().direction).toBe('ne')
  })
})
