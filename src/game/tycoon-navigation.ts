import type { GroundPoint } from './tycoon-care-presentation'
import { HOSPITAL_MAP, roomEntrance, type GroundRect } from './tycoon-map-config'
import { WARD_ROOM } from './tycoon-ward-layout'
import { referenceRoomLayout } from './tycoon-reference-room'

const distance = (a: GroundPoint, b: GroundPoint) => Math.hypot(a.u - b.u, a.v - b.v)
const inside = (p: GroundPoint, a: number, b: number, c: number, d: number) => p.u >= a && p.u <= b && p.v >= c && p.v <= d

/** One set of rectangles drives both walkability and exact segment boundary checks. */
function navigationGeometry(roomCount: number) {
  const floors = HOSPITAL_MAP.corridors.map(c => ({ minU:c.minU+.25,maxU:c.maxU-.25,minV:c.minV+.22,maxV:c.maxV-.25 }))
  const blocks: GroundRect[] = [
    {...HOSPITAL_MAP.station.footprint},
    ...HOSPITAL_MAP.publicObstacles,
  ]
  for(let i=0;i<Math.min(roomCount,HOSPITAL_MAP.rooms.length);i++) {
    const origin=HOSPITAL_MAP.rooms[i].origin
    const rect=(minU:number,maxU:number,minV:number,maxV:number) => ({minU:minU+origin.u,maxU:maxU+origin.u,minV:minV+origin.v,maxV:maxV+origin.v})
    floors.push(rect(WARD_ROOM.minU+.22,WARD_ROOM.maxU-.22,WARD_ROOM.minV+.22,WARD_ROOM.maxV-.22))
    const door=roomEntrance(i)
    floors.push(rect(door.u-.3,door.u+.3,door.minV+.18,door.maxV-.18))
    blocks.push(rect(door.leaf.minU,door.leaf.maxU,door.leaf.minV,door.leaf.maxV))
    for(const o of referenceRoomLayout(door.side === 'minU').obstacles) blocks.push(rect(o.minU,o.maxU,o.minV,o.maxV))
  }
  return {floors,blocks}
}
const geometryCache = new Map<number,ReturnType<typeof navigationGeometry>>()
const geometry = (rooms:number) => { let g=geometryCache.get(rooms);if(!g){g=navigationGeometry(rooms);geometryCache.set(rooms,g)}return g }
export function isWardWalkable(p: GroundPoint, roomCount: number): boolean {
  if(!Number.isFinite(p.u)||!Number.isFinite(p.v)) return false
  const g=geometry(roomCount), contains=(r:typeof g.floors[number])=>inside(p,r.minU,r.maxU,r.minV,r.maxV)
  return g.floors.some(contains)&&!g.blocks.some(contains)
}
const STEP = .2
const cellKey = (x:number,y:number) => `${x},${y}`
const boundaryCache = new Map<number,{u:number[];v:number[]}>()
function wardBoundaries(rooms:number) {
  let result=boundaryCache.get(rooms)
  if(!result){const g=geometry(rooms),all=[...g.floors,...g.blocks];result={u:all.flatMap(r=>[r.minU,r.maxU]),v:all.flatMap(r=>[r.minV,r.maxV])};boundaryCache.set(rooms,result)}
  return result
}
export function clearSegment(a: GroundPoint, b: GroundPoint, rooms: number) {
  // Split at every floor/obstacle edge: fixed-distance samples can miss a thin
  // blocked sliver when smoothing a route past the corner of a doorway.
  const boundaries = wardBoundaries(rooms)
  const cuts = [0, 1]
  for (const axis of ['u', 'v'] as const) {
    const delta = b[axis] - a[axis]
    if (!delta) continue
    for (const edge of boundaries[axis]) {
      const t = (edge - a[axis]) / delta
      if (t > 0 && t < 1) cuts.push(t)
    }
  }
  cuts.sort((x, y) => x - y)
  const walkableAt = (t: number) => isWardWalkable({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t }, rooms)
  for (let i = 0; i < cuts.length; i++) {
    if (!walkableAt(cuts[i]) || (i > 0 && !walkableAt((cuts[i - 1] + cuts[i]) / 2))) return false
  }
  return true
}

type WardCell = { x: number; y: number; point: GroundPoint; neighbors?: WardCell[] }
const navigationGrids = new Map<number, Map<string, WardCell>>()

export function findWardPath(start: GroundPoint, end: GroundPoint, rooms: number): GroundPoint[] | null {
  if (!isWardWalkable(start, rooms) || !isWardWalkable(end, rooms)) return null
  if (clearSegment(start, end, rooms)) return [{ ...end }]
  let grid = navigationGrids.get(rooms)
  if (!grid) {
    const byKey = new Map<string, WardCell>()
    const floors=geometry(rooms).floors
    const minU=Math.min(...floors.map(r=>r.minU)),maxU=Math.max(...floors.map(r=>r.maxU))
    const minV=Math.min(...floors.map(r=>r.minV)),maxV=Math.max(...floors.map(r=>r.maxV))
    for (let x = Math.floor(minU / STEP); x <= Math.ceil(maxU / STEP); x++) {
      for (let y = Math.ceil(minV / STEP); y <= Math.floor(maxV / STEP); y++) {
        const point = { u: x * STEP, v: y * STEP }
        if (isWardWalkable(point, rooms)) byKey.set(cellKey(x, y), { x, y, point })
      }
    }
    grid = byKey; navigationGrids.set(rooms, grid)
  }
  const byKey = grid
  const closest = (point: GroundPoint) => {
    let best: WardCell | undefined, bestDistance = 0.5
    const cx = Math.round(point.u / STEP), cy = Math.round(point.v / STEP)
    for (let x = cx - 3; x <= cx + 3; x++) for (let y = cy - 3; y <= cy + 3; y++) {
      const cell = byKey.get(cellKey(x, y))
      if (!cell) continue
      const span = distance(cell.point, point)
      if (span < bestDistance && clearSegment(point, cell.point, rooms)) { best = cell; bestDistance = span }
    }
    return best
  }
  const from = closest(start), to = closest(end)
  if (!from || !to) return null
  const open = [from]
  const firstKey = cellKey(from.x, from.y), endKey = cellKey(to.x, to.y)
  const parents = new Map<string, string | null>([[firstKey, null]])
  for (let head = 0; head < open.length; head++) {
    const current = open[head], key = cellKey(current.x, current.y)
    if (key === endKey) {
      const path: GroundPoint[] = [{ ...end }]
      for (let k: string | null = key; k !== null; k = parents.get(k) ?? null) path.unshift(byKey.get(k)!.point)
      // Remove redundant corners only when the whole segment is collision free.
      const smooth: GroundPoint[] = []
      let anchor = start
      for (let i = 0; i < path.length; i++) {
        if (i + 1 < path.length && clearSegment(anchor, path[i + 1], rooms)) continue
        smooth.push({ ...path[i] }); anchor = path[i]
      }
      return smooth
    }
    if (!current.neighbors) current.neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]].flatMap(([dx, dy]) => {
      const next = byKey.get(cellKey(current.x + dx, current.y + dy))
      return next && clearSegment(current.point, next.point, rooms) ? [next] : []
    })
    for (const next of current.neighbors) {
      const nextKey = cellKey(next.x, next.y)
      if (parents.has(nextKey)) continue
      parents.set(nextKey, key); open.push(next)
    }
  }
  return null
}

