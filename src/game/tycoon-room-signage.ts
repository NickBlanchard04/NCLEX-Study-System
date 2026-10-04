import type Phaser from 'phaser'
import { projectGround, type GroundPoint } from './tycoon-care-presentation'
import { cachedSurface } from './tycoon-render-cache'

/** Wall-plane artwork is baked once per room, with no per-frame drawing or text. */
export function drawWoodRoomNumber(scene: Phaser.Scene, number: string, point: GroundPoint, cutaway = false, wallLift = 168) {
  const at = projectGround(point)
  const width = cutaway ? 64 : 104, height = cutaway ? 18 : 50
  const slope = 44 / 72, lift = cutaway ? 20 : wallLift
  const top = -width * slope / 2 - lift - 4
  return cachedSurface(scene, `wood-room-${number}-${cutaway ? 'entry' : 'wall'}`, width + 12, height + width * slope + 12, ctx => {
    // Horizontal coordinates follow the room's u-axis; verticals remain upright.
    ctx.translate(4, 4)
    ctx.transform(1, slope, 0, 1, 0, 0)
    ctx.fillStyle = 'rgba(42,35,27,.22)'
    ctx.beginPath(); ctx.roundRect(3, 4, width, height, 3); ctx.fill()
    ctx.fillStyle = '#9b744c'
    ctx.beginPath(); ctx.roundRect(1, 2, width, height, 3); ctx.fill()
    const wood = ctx.createLinearGradient(0, 0, 0, height)
    wood.addColorStop(0, '#efd3a4'); wood.addColorStop(.5, '#d9b480'); wood.addColorStop(1, '#cba16a')
    ctx.fillStyle = wood
    ctx.beginPath(); ctx.roundRect(0, 0, width, height, 3); ctx.fill()
    ctx.strokeStyle = 'rgba(126,87,43,.16)'; ctx.lineWidth = .6
    for (let y = 3; y < height; y += 3) {
      ctx.beginPath(); ctx.moveTo(2, y); ctx.bezierCurveTo(width * .3, y - 1.5, width * .65, y + 1, width - 2, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,244,217,.65)'; ctx.strokeRect(1, 1, width - 2, height - 2)
    ctx.font = `700 ${cutaway ? 15 : 34}px Arial, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(68,45,26,.45)'; ctx.fillText(number, width / 2 + 1.2, height / 2 + 2)
    ctx.fillStyle = '#283039'; ctx.fillText(number, width / 2, height / 2)
    for (const x of [5, width - 5]) for (const y of cutaway ? [height / 2] : [7, height - 7]) {
      ctx.fillStyle = '#6d7171'; ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#d5d9d7'; ctx.fillRect(x - 1, y - .8, 1.7, .6)
    }
  // Above every wall strip beneath the plaque, still behind bedside furniture.
  }).setPosition(at.x - width / 2 - 4, at.y + top).setDepth(at.y + width * slope / 2 + 2)
}
