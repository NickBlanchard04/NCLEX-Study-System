import { describe, expect, it } from 'vitest'
import { cameraBlend, spaceWardActor, WardActorPresentation } from '../tycoon-ward-polish'
import { isWardWalkable } from '../tycoon-ward'
import { projectGround } from '../tycoon-care-presentation'
import { STATION_POSITION, ROOM_STOPS, roomPoint } from '../tycoon-ward-layout'
describe('ward presentation spacing', () => {
  it('separates three staff at the station without putting feet inside scenery', () => {
    const occupied = [STATION_POSITION]
    for (let i = 0; i < 2; i++) {
      const position = spaceWardActor(STATION_POSITION, occupied, 3)
      expect(isWardWalkable(position, 3)).toBe(true)
      const at = projectGround(position)
      for (const other of occupied) { const b = projectGround(other); expect(Math.hypot(at.x - b.x, at.y - b.y)).toBeGreaterThanOrEqual(38) }
      occupied.push(position)
    }
  })
  it('preserves free walking anchors and never spaces staff into a bed or wall', () => {
    for (let room = 0; room < 6; room++) {
      for (const stop of Object.values(ROOM_STOPS)) {
        const position = roomPoint(room, stop)
        expect(spaceWardActor(position, [], 6)).toBe(position)
        expect(isWardWalkable(spaceWardActor(position, [position], 6), 6)).toBe(true)
      }
    }
  })
  it('smooths camera movement consistently across frame rates and stops at zero delta', () => {
    expect(cameraBlend(0)).toBe(0)
    expect(1 - (1 - cameraBlend(10)) ** 4).toBeCloseTo(cameraBlend(40))
    expect(cameraBlend(1000)).toBe(cameraBlend(50))
  })
})

describe('gradual staff yielding', () => {
  it('takes bounded steps around room geometry and freezes without jumping during pause', () => {
    const actor = new WardActorPresentation(), goal = roomPoint(0, ROOM_STOPS.patient)
    let previous = actor.update(STATION_POSITION, 3, 0, false)
    for (let i = 0; i < 500; i++) {
      const next = actor.update(goal, 3, 16, false), a = projectGround(previous), b = projectGround(next)
      expect(isWardWalkable(next, 3)).toBe(true)
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(3.921)
      previous = next
    }
    expect(previous).toEqual(goal)
    expect(actor.update(STATION_POSITION, 3, 5000, true)).toEqual(goal)
    const next = actor.update(STATION_POSITION, 3, 5000, false)
    expect(Math.hypot(projectGround(next).x - projectGround(goal).x, projectGround(next).y - projectGround(goal).y)).toBeLessThanOrEqual(12.251)
  })
})
