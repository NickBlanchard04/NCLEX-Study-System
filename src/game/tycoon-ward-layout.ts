import type { GroundPoint } from './tycoon-care-presentation'

// World-space dimensions shared by the rendered rooms and collision grid.
export const WARD_ROOM = { minU: 3.7, maxU: 8.1, minV: -1, maxV: 2.8 } as const
export const ROOM_GAP = 1.1
export const ROOM_SPACING = WARD_ROOM.maxU - WARD_ROOM.minU + ROOM_GAP
export const ROOM_DOOR = { minU: 5.75, maxU: 7.05 } as const
export const CORRIDOR = { minU: 0, minV: WARD_ROOM.maxV, maxV: 5.6 } as const
export const STATION_POSITION = { u: 2.4, v: 4.2 }
export const ROOM_PROPS = {
  bed: { u: 6.45, v: 0.62 },
  cabinet: { u: 5.15, v: 0.08 },
  monitor: { u: 5.11, v: -0.08 },
  iv: { u: 6.97, v: -0.08 },
  extraMonitor: { u: 4.63, v: -0.18 },
  scanner: { u: 7.35, v: 0.05 },
  plant: { u: 7.9, v: 5.15 },
} as const
export const ROOM_STOPS = {
  patient: { u: 6.4, v: 1.85 },
  equipment: { u: 4.85, v: 0.9 },
  safety: { u: 7.55, v: 1.85 },
} as const
export const ROOM_OBSTACLES = [
  { minU: 5.1, maxU: 7.43, minV: -0.3, maxV: 1.33 }, // Occupied bed, IV and scanner.
  { minU: 4.55, maxU: 5.55, minV: -0.48, maxV: 0.46 }, // Cabinet and monitors.
] as const
export const roomPoint = (index: number, point: GroundPoint): GroundPoint => ({ u: point.u + index * ROOM_SPACING, v: point.v })
export const wardEnd = (roomCount: number) => WARD_ROOM.maxU + 0.5 + Math.max(0, roomCount - 1) * ROOM_SPACING
