import type Phaser from 'phaser'

// Two footfalls per loop; cadence follows distance traveled rather than display FPS.
export const WALK_CYCLE_DISTANCE = 76
export const WALK_FRAME_COUNT = 16
export const walkFrame = (distance: number) => Math.floor(Math.max(0, Number.isFinite(distance)?distance:0) / (WALK_CYCLE_DISTANCE / WALK_FRAME_COUNT)) % WALK_FRAME_COUNT
export type NursePivots = Record<string, { pivotX: number; pivotY: number }>

/** Use intact authored poses. Never bend, stretch, or slice the shoes to invent a gait. */
export function applyNurseFrame(sprite: Phaser.GameObjects.Sprite, frame: string, pivots: NursePivots) {
  if (sprite.texture.key !== 'nurse-03') sprite.setTexture('nurse-03', frame)
  else if (sprite.frame.name !== frame) sprite.setFrame(frame)
  const pivot = pivots[frame]
  sprite.setOrigin(pivot.pivotX, pivot.pivotY)
}
