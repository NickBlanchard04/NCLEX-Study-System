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

/** Instance-specific furniture and approaches, shared by rendering and navigation. */
export const REFERENCE_ROOM_LAYOUT = {
  bed: { u: 5.35, v: .75 },
  monitor: { u: 3.95, v: .15 },
  patient: { u: 5.4, v: 2.05 },
  equipment: { u: 4.4, v: 1.65 },
  safety: { u: 6.85, v: 1.8 },
  obstacles: [
    { minU: 4.25, maxU: 6.58, minV: -.3, maxV: 1.33 },
    { minU: 4.55, maxU: 5.2, minV: -.78, maxV: -.22 },
    { minU: 5.15, maxU: 5.7, minV: -.78, maxV: -.5 },
    { minU: 6.8, maxU: 7.14, minV: -.25, maxV: .1 },
  ],
} as const
