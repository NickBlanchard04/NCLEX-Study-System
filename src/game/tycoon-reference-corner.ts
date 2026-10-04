import type Phaser from 'phaser'
import { projectGround } from './tycoon-care-presentation'
import { WARD_ROOM, roomPoint } from './tycoon-ward-layout'

/** Remap measured wall baselines once, keeping verticals upright and feet on
 * the physical room edges. Runtime sprites sort by their actual ground slice. */
export function drawReferenceCorner(scene: Phaser.Scene, index = 0) {
  const image = scene.textures.get('reference-room-corner').getSourceImage()
  if (!(image instanceof HTMLImageElement || image instanceof HTMLCanvasElement)) throw new Error('Reference corner artwork unavailable')
  const corner = projectGround(roomPoint(index, { u: WARD_ROOM.minU, v: WARD_ROOM.minV }))
  const key = 'reference-101-corner-calibrated'
  const left = -321, top = -220, width = 696, height = 530, vertical = .46
  const sxLeft = (WARD_ROOM.maxV - WARD_ROOM.minV) * 72 / 667
  const sxRight = (WARD_ROOM.maxU - WARD_ROOM.minU) * 72 / 642
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')!
    // Sample into whole destination columns. Fractional destination strips
    // leave partially covered pixels and make opaque walls look transparent.
    for (let x = 0; x < width; x++) {
      const screenDx = left + x, scale = screenDx < 0 ? sxLeft : sxRight
      const dx = screenDx / scale, sourceX = 780 + dx
      if (sourceX < 0 || sourceX >= 1536) continue
      const base = 430 + Math.abs(dx) * (dx < 0 ? 375 / 667 : 388 / 642)
      const groundY = Math.abs(dx * scale) * 44 / 72
      ctx.drawImage(image, sourceX, 0, Math.min(1 / scale, 1536 - sourceX), 1024, x, groundY - base * vertical - top, 1, 1024 * vertical)
    }
    scene.textures.addCanvas(key, canvas)
  }
  // The kit is static art, not a flattened map: the bed, actors and interaction
  // states remain independent. Narrow slices retain foreground wall occlusion.
  for (let x = 0; x < width; x += 20) {
    const dx = left + x + 10
    const furnitureDepth = dx > 10 && dx < 155 ? 82 : 0
    scene.add.image(corner.x + left, corner.y + top, key).setOrigin(0)
      .setCrop(x, 0, Math.min(20, width - x), height)
      .setTint(0xf5f2eb).setDepth(corner.y + Math.max(Math.abs(dx) * 44 / 72, furnitureDepth) - .5)
  }
  // The monitor is also a separately tintable/clickable state layer, registered
  // to the same baked texture as its mounting so its position cannot drift.
  return scene.add.image(corner.x + left, corner.y + top, key).setOrigin(0)
    .setCrop(235, 138, 42, 68).setDepth(corner.y + 110).setData('referenceMonitor', true)
}
