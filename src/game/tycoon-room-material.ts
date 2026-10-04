import { bakeIvoryFloor } from './tycoon-ivory-floor'
import { WARD_ROOM } from './tycoon-ward-layout'

/** Baked once per palette; world-space tiles share the collision floor's projection. */
export function createRoomMaterial(origin = { u: 0, v: 0 }) {
  const { minU, maxU, minV, maxV } = WARD_ROOM
  const left = (minU - maxV) * 72, top = (minU + minV) * 44
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((maxU - minV) * 72 - left) + 2
  canvas.height = Math.ceil((maxU + maxV) * 44 - top) + 2
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(72, 44, -72, 44, -left + 1, -top + 1)
  ctx.beginPath(); ctx.rect(minU, minV, maxU - minU, maxV - minV); ctx.clip()
  bakeIvoryFloor(ctx, WARD_ROOM, origin)
  const edge = (axis: 'u' | 'v') => {
    const gradient = axis === 'u' ? ctx.createLinearGradient(minU, 0, minU + 0.38, 0) : ctx.createLinearGradient(0, minV, 0, minV + 0.38)
    gradient.addColorStop(0, 'rgba(56,48,39,.27)'); gradient.addColorStop(1, 'rgba(56,48,39,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(minU, minV, axis === 'u' ? 0.38 : maxU - minU, axis === 'v' ? 0.38 : maxV - minV)
  }
  edge('u'); edge('v')
  return { canvas, x: 600 + left - 1, y: 80 + top - 1 }
}
