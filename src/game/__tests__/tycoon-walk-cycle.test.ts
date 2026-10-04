import { describe, expect, it, vi } from 'vitest'
import { WALK_CYCLE_DISTANCE, walkFrame, applyNurseFrame } from '../tycoon-walk-cycle'
import atlas from '../../../public/game-assets/hospital-prototype/rigged-nurse-atlas.json'
import pivots from '../../../public/game-assets/hospital-prototype/rigged-nurse-pivots.json'
import type Phaser from 'phaser'
import diagnostics from '../../../public/game-assets/hospital-prototype/rigged-nurse-diagnostics.json'

describe('intact nurse walking poses', () => {
  it('only selects frames supplied by the source atlas, including after a loop', () => {
    for (const direction of ['se', 'sw', 'nw', 'ne']) {
      for (let distance = 0; distance < WALK_CYCLE_DISTANCE * 3; distance++) {
        const frame = `${direction}-walk-${walkFrame(distance)}`
        expect(atlas.frames).toHaveProperty(frame)
        expect(pivots.frames).toHaveProperty(frame)
        expect(walkFrame(distance + WALK_CYCLE_DISTANCE)).toBe(walkFrame(distance))
      }
    }
  })
  it('uses the rigged texture and registered pivot without a leg-warp texture', () => {
    const sprite = { texture: { key: 'nurse-walk' }, frame: { name: 'se-idle-0' }, setTexture: vi.fn(), setFrame: vi.fn(), setOrigin: vi.fn() }
    applyNurseFrame(sprite as unknown as Phaser.GameObjects.Sprite, 'se-walk-0', pivots.frames)
    expect(sprite.setTexture).toHaveBeenCalledWith('nurse-03', 'se-walk-0')
    expect(sprite.setOrigin).toHaveBeenCalledWith(pivots.frames['se-walk-0'].pivotX, pivots.frames['se-walk-0'].pivotY)
  })
  it('keeps every complete pose inside the source rectangle with a fixed ground anchor', () => {
    expect(Object.keys(atlas.frames)).toHaveLength(140)
    for (const [name,entry] of Object.entries(atlas.frames)) {
      const crop=entry.spriteSourceSize
      expect(crop.x,name).toBeGreaterThan(0)
      expect(crop.y,name).toBeGreaterThan(0)
      expect(crop.x+crop.w,name).toBeLessThan(entry.sourceSize.w)
      expect(crop.y+crop.h,name).toBeLessThan(entry.sourceSize.h)
      expect(pivots.frames[name as keyof typeof pivots.frames]).toEqual(pivots.frames['se-walk-0'])
    }
  })
  it('alternates leading feet and lifts each swing foot during the passing poses', () => {
    const poses=diagnostics.filter(p=>p.direction==='se')
    expect(poses).toHaveLength(16)
    expect(poses[0].left[0]).toBeGreaterThan(poses[0].right[0])
    expect(poses[8].left[0]).toBeLessThan(poses[8].right[0])
    expect(poses[4].right[1]-poses[4].left[1]).toBeGreaterThan(.1)
    expect(poses[12].left[1]-poses[12].right[1]).toBeGreaterThan(.1)
  })
})
