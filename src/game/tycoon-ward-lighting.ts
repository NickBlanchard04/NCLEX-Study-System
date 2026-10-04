import type { GroundPoint } from './tycoon-care-presentation'

/** One art-space scale and light direction for rooms, corridors and shared areas. */
export const WARD_FLOOR_REPEAT = 3 / 1254

/** Static illumination is baked with the floor, never recomputed during movement.
 * Local room textures sample the same world light field as the surrounding floor. */
export function bakeWardDaylight(ctx: CanvasRenderingContext2D, bounds: {minU:number;maxU:number;minV:number;maxV:number}, origin: GroundPoint = {u:0,v:0}) {
  const light = ctx.createLinearGradient(-5.5-origin.u,-3.8-origin.v,22-origin.u,18-origin.v)
  light.addColorStop(0,'rgba(255,249,231,.15)')
  light.addColorStop(.45,'rgba(255,249,231,.045)')
  light.addColorStop(1,'rgba(63,53,42,.085)')
  ctx.fillStyle=light
  ctx.fillRect(bounds.minU,bounds.minV,bounds.maxU-bounds.minU,bounds.maxV-bounds.minV)
}
