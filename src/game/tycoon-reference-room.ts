/** Shared Package 01 ward kit: pivots measured from opaque artwork bounds. */
export const REFERENCE_ROOM_ART = {
  bedTable: {
    width: 1536, height: 1024,
    visibleBounds: { x: 234, y: 50, width: 1050, height: 828 },
    groundOrigin: { x: 670 / 1536, y: 695 / 1024 },
  },
  station: {
    width: 1536, height: 1024,
    visibleBounds: { x: 73, y: 193, width: 1391, height: 746 },
    groundOrigin: { x: 780 / 1536, y: 740 / 1024 },
  },
  wall: {
    width: 1254, height: 1254,
    visibleBounds: { x: 78, y: 169, width: 1098, height: 999 },
    groundOrigin: { x: 623 / 1254, y: 897 / 1254 },
    footprint: { baseLine: [[100, 635], [1146, 1160]] as [number, number][] },
  },
  bed: {
    width: 1374, height: 1145,
    visibleBounds: { x: 159, y: 96, width: 1054, height: 973 },
    groundOrigin: { x: 700 / 1374, y: 780 / 1145 },
  },
} as const

/** Keep the opposite bank's equipment clear of its left-hand doorway. */
export function referenceRoomLayout(leftDoor: boolean) {
  if (!leftDoor) return REFERENCE_ROOM_LAYOUT
  return {
    ...REFERENCE_ROOM_LAYOUT,
    monitor: { u: 4.1, v: 2.7 }, extraMonitor: { u: 4.1, v: 3.15 },
    iv: { u: 4.1, v: 3.65 }, scanner: { u: 4.1, v: 4.05 },
    equipment: { u: 5.05, v: 2.7 }, safety: { u: 5.05, v: 3.9 },
    obstacles: [REFERENCE_ROOM_LAYOUT.obstacles[0], REFERENCE_ROOM_LAYOUT.obstacles[1],
      { minU: 3.8, maxU: 4.45, minV: 2.4, maxV: 4.35 }],
  }
}

/** Instance-specific furniture and approaches, shared by rendering and navigation. */
export const REFERENCE_ROOM_LAYOUT = {
  bed: { u: 5.05, v: .05 },
  cabinet: { u: 4.1, v: .5 },
  monitor: { u: 4.1, v: 1.45 },
  iv: { u: 4.1, v: 2.55 },
  extraMonitor: { u: 4.1, v: 2.05 },
  scanner: { u: 4.1, v: 3.45 },
  patient: { u: 5.9, v: 1.1 },
  equipment: { u: 5.05, v: 1.6 },
  safety: { u: 5.3, v: 2.5 },
  obstacles: [
    { minU: 3.95, maxU: 6.28, minV: -1, maxV: .63 },
    { minU: 3.8, maxU: 4.45, minV: .2, maxV: .8 },
    { minU: 3.8, maxU: 4.45, minV: 1.1, maxV: 2.9 },
    { minU: 3.8, maxU: 4.45, minV: 3.1, maxV: 3.8 },
  ],
} as const



