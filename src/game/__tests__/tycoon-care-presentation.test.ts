import { describe, expect, it } from 'vitest'
import { CARE_ROUTE, ROOM_BOUNDS, TycoonCarePresentation, type HospitalBridgeState } from '../tycoon-care-presentation'

const available: HospitalBridgeState = {
  shiftId: 'shift-1', taskId: 'room-101', taskStatus: 'available', paused: false,
  reducedMotion: false, selected: false,
}
const complete = { ...available, taskStatus: 'completed' }
const advance = (care: TycoonCarePresentation, ticks = 100) => {
  for (let tick = 0; tick < ticks; tick += 1) care.tick(100)
}

describe('Room 101 care presentation', () => {
  it('waits for authoritative completion and feedback dismissal, then spawns exactly once', () => {
    const care = new TycoonCarePresentation()
    care.update(available)
    advance(care)
    expect(care.snapshot().nurseCount).toBe(0)
    care.update({ ...complete, paused: true })
    advance(care)
    expect(care.snapshot()).toMatchObject({ phase: 'waiting', nurseCount: 0, spawnCount: 0 })
    care.update(complete)
    expect(care.snapshot()).toMatchObject({ phase: 'walking', nurseCount: 1, spawnCount: 1 })
    for (let tick = 0; tick < 120; tick += 1) { care.update(complete); care.tick(100) }
    expect(care.snapshot()).toMatchObject({ phase: 'completed', nurseCount: 1, spawnCount: 1, position: CARE_ROUTE.at(-1) })
  })

  it('pauses both walking frames and care progress, including hidden documents', () => {
    const care = new TycoonCarePresentation()
    care.update(available)
    care.update(complete)
    care.tick(100)
    const walking = care.snapshot()
    care.update({ ...complete, paused: true })
    advance(care)
    expect(care.snapshot()).toEqual(walking)
    care.update(complete)
    care.setHidden(true)
    advance(care)
    expect(care.snapshot()).toEqual(walking)
    care.setHidden(false)
    while (care.snapshot().phase === 'walking') care.tick(100)
    care.tick(100)
    const caring = care.snapshot()
    care.update({ ...complete, paused: true })
    advance(care)
    expect(care.snapshot()).toEqual(caring)
    care.update(complete)
    advance(care)
    expect(care.snapshot().phase).toBe('completed')
  })

  it('restores completed care statically without replaying a spawn or route', () => {
    const care = new TycoonCarePresentation()
    care.update(complete)
    advance(care)
    expect(care.snapshot()).toMatchObject({ phase: 'completed', spawnCount: 0, nurseCount: 1 })
  })

  it('supports reduced motion after feedback without replay or animation', () => {
    const care = new TycoonCarePresentation()
    care.update(available)
    care.update({ ...complete, paused: true, reducedMotion: true })
    expect(care.snapshot().nurseCount).toBe(0)
    care.update({ ...complete, reducedMotion: true })
    expect(care.snapshot()).toMatchObject({ phase: 'completed', spawnCount: 1, frame: 'ne-idle-0' })
    care.update({ ...complete, reducedMotion: false })
    expect(care.snapshot().phase).toBe('completed')
  })

  it('takes the hallway and doorway, faces each leg correctly, and stops outside the bed', () => {
    const care = new TycoonCarePresentation()
    care.update(available)
    care.update(complete)
    const directions = new Set<string>()
    while (care.snapshot().phase === 'walking') {
      care.tick(100)
      const { position, direction } = care.snapshot()
      directions.add(direction)
      if (position.v < ROOM_BOUNDS.maxV) expect(position.u).toBeCloseTo(5.7)
      expect(position.v).toBeGreaterThanOrEqual(2.1)
    }
    expect([...directions]).toEqual(['se', 'ne'])
    expect(care.snapshot().position).toEqual(CARE_ROUTE.at(-1))
  })

  it('resets the visual for a new shift and ignores unsuccessful assessment statuses', () => {
    const care = new TycoonCarePresentation()
    care.update(available)
    care.update({ ...available, taskStatus: 'failed' })
    advance(care)
    expect(care.snapshot().nurseCount).toBe(0)
    care.update({ ...available, shiftId: 'shift-2' })
    care.update({ ...complete, shiftId: 'shift-2' })
    expect(care.snapshot()).toMatchObject({ phase: 'walking', spawnCount: 1 })
  })

  it('retains a completion transition during loading and does not catch up a stalled frame', () => {
    const care = new TycoonCarePresentation()
    care.update(available)
    care.update({ ...complete, paused: true })
    care.update(complete)
    care.tick(60_000)
    expect(care.snapshot()).toMatchObject({ phase: 'walking', routeLeg: 1, spawnCount: 1 })
    expect(care.snapshot().position.u).toBeLessThan(2)
  })
})
