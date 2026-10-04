import { projectGround, type GroundPoint } from './tycoon-care-presentation'
import { clearSegment, findWardPath, isWardWalkable } from './tycoon-navigation'

/** Presentation spacing keeps registered feet on walkable floor; job positions stay authoritative. */
export function spaceWardActor(point: GroundPoint, occupied: readonly GroundPoint[], rooms: number): GroundPoint {
  const clearance = (candidate: GroundPoint) => {
    const at = projectGround(candidate)
    return Math.min(...occupied.map((other) => { const b = projectGround(other); return Math.hypot(at.x - b.x, at.y - b.y) }))
  }
  if (clearance(point) >= 38) return point
  let best = point, score = clearance(point)
  for (const radius of [0.4, 0.6, 0.8]) {
    for (const [u, v] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, -1], [-1, 1]]) {
      const candidate = { u: point.u + u * radius, v: point.v + v * radius }
      if (!isWardWalkable(candidate, rooms)) continue
      const gap = clearance(candidate)
      if (gap >= 38) return candidate
      if (gap > score) { best = candidate; score = gap }
    }
  }
  return best
}
export const cameraBlend = (deltaMs: number) => 1 - Math.exp(-Math.max(0, Math.min(deltaMs, 50)) / 120)

/** A visual companion follows a collision-safe path instead of snapping to a separation offset. */
export class WardActorPresentation {
  private position: GroundPoint | null = null
  private route: GroundPoint[] = []
  private repathMs = 0
  strideDistance = 0
  moving = false
  update(goal: GroundPoint, rooms: number, deltaMs: number, paused: boolean) {
    this.moving = false
    if (!this.position) this.position = { ...goal }
    if (paused || !Number.isFinite(deltaMs) || deltaMs <= 0) return { ...this.position }
    if (Math.hypot(this.position.u - goal.u, this.position.v - goal.v) < 0.0001) return { ...this.position }
    this.repathMs -= Math.min(deltaMs, 50)
    if (clearSegment(this.position, goal, rooms)) this.route = [goal]
    else if (!this.route.length || this.repathMs <= 0) { this.route = findWardPath(this.position, goal, rooms) ?? []; this.repathMs = 150 }
    const route = this.route
    let budget = 245 * Math.min(deltaMs, 50) / 1000
    for (const next of route ?? []) {
      const a = projectGround(this.position), b = projectGround(next), span = Math.hypot(b.x - a.x, b.y - a.y)
      const t = span ? Math.min(1, budget / span) : 1
      this.position = { u: this.position.u + (next.u - this.position.u) * t, v: this.position.v + (next.v - this.position.v) * t }
      this.strideDistance += span * t
      this.moving ||= span * t > 0.0001
      budget -= span * t
      if (t === 1) this.route = this.route.slice(1)
      if (t < 1 || budget <= 0) break
    }
    return { ...this.position }
  }
}
