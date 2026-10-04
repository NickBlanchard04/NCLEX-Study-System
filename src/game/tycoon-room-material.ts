import { rubberPattern } from './tycoon-rubber-material'
import { PATIENT_ROOM } from './tycoon-map-config'
import { WARD_ROOM } from './tycoon-ward-layout'
import { bakeWardDaylight, WARD_FLOOR_REPEAT } from './tycoon-ward-lighting'

/** Baked once per palette; world-space tiles share the collision floor's projection. */
export function createRoomMaterial(color: number, artwork?: CanvasImageSource, origin = { u: 0, v: 0 }) {
  const { minU, maxU, minV, maxV } = WARD_ROOM
  const left = (minU - maxV) * 72, top = (minU + minV) * 44
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((maxU - minV) * 72 - left) + 2
  canvas.height = Math.ceil((maxU + maxV) * 44 - top) + 2
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(72, 44, -72, 44, -left + 1, -top + 1)
  ctx.beginPath(); ctx.rect(minU, minV, maxU - minU, maxV - minV); ctx.clip()
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
  ctx.fillRect(minU, minV, maxU - minU, maxV - minV)
  const pattern=artwork ? ctx.createPattern(artwork, 'repeat')! : rubberPattern(ctx)
  pattern.setTransform(new DOMMatrix().translate(-origin.u, -origin.v).scale(artwork ? WARD_FLOOR_REPEAT : 2/256))
  ctx.fillStyle=pattern;ctx.fillRect(minU,minV,maxU-minU,maxV-minV)
  bakeWardDaylight(ctx, WARD_ROOM, origin)
  let seed = 419
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  for (let u = minU; !artwork && u < maxU; u += 2) for (let v = minV; v < maxV; v += 2) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(255,255,255,.025)' : 'rgba(83,77,65,.015)'
    ctx.fillRect(u, v, 2, 2)
    ctx.strokeStyle = 'rgba(91,83,72,.10)'; ctx.lineWidth = 0.009
    ctx.strokeRect(u, v, 2, 2)
  }
  for (let i = 0; i < 6000; i++) {
    const u = minU + random() * (maxU - minU), v = minV + random() * (maxV - minV)
    ctx.fillStyle = i % 3 ? 'rgba(83,77,65,.035)' : 'rgba(255,255,255,.10)'
    ctx.fillRect(u, v, 0.006 + random() * 0.013, 0.004 + random() * 0.009)
  }
  const edge = (axis: 'u' | 'v') => {
    const gradient = axis === 'u' ? ctx.createLinearGradient(minU, 0, minU + 0.38, 0) : ctx.createLinearGradient(0, minV, 0, minV + 0.38)
    gradient.addColorStop(0, 'rgba(56,48,39,.27)'); gradient.addColorStop(1, 'rgba(56,48,39,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(minU, minV, axis === 'u' ? 0.38 : maxU - minU, axis === 'v' ? 0.38 : maxV - minV)
  }
  edge('u'); edge('v')
  // Restrained traffic polish links the doorway to the bedside; baked into the material.
  const door=(PATIENT_ROOM.door.minU+PATIENT_ROOM.door.maxU)/2
  const traffic=ctx.createRadialGradient(door,2.5,.04,door,2.5,.8)
  traffic.addColorStop(0,'rgba(231,223,198,.2)');traffic.addColorStop(1,'rgba(231,223,198,0)')
  ctx.fillStyle=traffic;ctx.fillRect(door-.8,1.7,1.6,1.1)
  // Two subtle caster sweep marks follow the bed approach, not random floor scratches.
  ctx.lineWidth=.014;ctx.strokeStyle='rgba(68,84,78,.10)'
  for(const u of [5.85,7.15]) {ctx.beginPath();ctx.ellipse(u,1.48,.14,.08,-.4,0,Math.PI*1.1);ctx.stroke()}
  ctx.strokeStyle='rgba(66,86,82,.12)';ctx.lineWidth=.025
  ctx.beginPath();ctx.moveTo(minU+.06,maxV-.06);ctx.lineTo(PATIENT_ROOM.door.minU,maxV-.06)
  ctx.moveTo(PATIENT_ROOM.door.maxU,maxV-.06);ctx.lineTo(maxU-.06,maxV-.06);ctx.lineTo(maxU-.06,minV+.06);ctx.stroke()
  return { canvas, x: 600 + left - 1, y: 80 + top - 1 }
}
