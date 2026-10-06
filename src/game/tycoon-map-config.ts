import type { GroundPoint } from './tycoon-care-presentation'

export interface GroundRect { minU: number; maxU: number; minV: number; maxV: number }
export interface MapProp { asset: string; point: GroundPoint; width: number; footprint?: GroundRect }
export interface RoomPlacement {
  id: string
  label: string
  origin: GroundPoint
  orientation: 'standard'
  entrance: 'minU' | 'maxU'
  unlock: { upgrade: 'extra-bed'; level: number }
}

/** Grow usable floor area without enlarging furniture or narrowing the central hall. */
export const PATIENT_ROOM_AREA_SCALE = 1.15
export const PATIENT_ROOM_DEPTH = 4.8 * PATIENT_ROOM_AREA_SCALE
export const PUBLIC_WING_OFFSET = 3 * (PATIENT_ROOM_DEPTH - 4.8)
/** Local bedside anchors remain compatible with the shipped template and saves. */
export const PATIENT_ROOM = {
  bounds: { minU: 3.7, maxU: 8.1, minV: -1, maxV: -1 + PATIENT_ROOM_DEPTH },
  door: { minU: 5.75, maxU: 7.05 },
  props: {
    bed: { asset: 'bed-empty', point: { u: 6.45, v: .62 }, width: 200, footprint: { minU: 5.1, maxU: 7.43, minV: -.3, maxV: 1.33 } },
    cabinet: { asset: 'furniture-bedside-cabinet', point: { u: 4.4, v: -.3 }, width: 52, footprint: { minU: 3.98, maxU: 4.8, minV: -.65, maxV: .12 } },
    monitor: { asset: 'equipment-monitor', point: { u: 5.11, v: -.08 }, width: 65 },
    iv: { asset: 'equipment-iv-pole', point: { u: 6.97, v: -.08 }, width: 48 },
    extraMonitor: { asset: 'equipment-monitor', point: { u: 4.63, v: -.18 }, width: 50 },
    scanner: { asset: 'furniture-bedside-cabinet', point: { u: 7.35, v: .05 }, width: 42 },
    plant: { asset: 'decor-potted-plant', point: { u: 7.9, v: 5.15 }, width: 52 },
    sanitizer: { asset: 'sanitizer-stand', point: { u: 7.96, v: 2.15 }, width: 13 },
    waste: { asset: 'waste-bin', point: { u: 7.97, v: .7 }, width: 20 },
  } satisfies Record<string, MapProp>,
  anchors: { patient: { u: 6.4, v: 1.85 }, equipment: { u: 4.85, v: .9 }, safety: { u: 7.55, v: 1.85 } },
  curtain: { u: 7.98, v: -.65 },
  inlay: { minU: 3.88, maxU: 7.92, minV: -.8, maxV: 2.6 },
  barrier: { u: 6.4, v: 2.8 },
} as const
const rooms: readonly RoomPlacement[] = Array.from({ length: 6 }, (_, i) => ({
  id: `room-${101+i}`, label: `Room ${101+i}`, origin: { u: i < 3 ? 0 : 9.9, v: (i % 3) * PATIENT_ROOM_DEPTH },
  orientation: 'standard', entrance: i < 3 ? 'maxU' : 'minU', unlock: { upgrade: 'extra-bed', level: Math.max(0, i-2) },
}))
const end = 19.8
export const HOSPITAL_MAP = {
  id: 'patient-floor-v9', rooms, roomTemplate: PATIENT_ROOM,
  floor: 1,
  futureFloor: { number: 2, locked: true, rooms: ['ward', 'entry', 'wc', 'wait', 'medic', 'clean', 'linen', 'treat', 'dirty', 'staff'] },
  elevators: [
    { id: 'elevator-north', point: { u: 10.85, v: -1.8 }, approach: { u: 10.85, v: -.55 } },
    { id: 'elevator-south', point: { u: 10.85, v: 16.4 }, approach: { u: 10.85, v: 15.15 } },
  ],
  building: { minU: 2, maxU: 19.8, minV: -5.3, maxV: 17.4 + PUBLIC_WING_OFFSET },
  publicObstacles: [
    { minU: 9.55, maxU: 12.15, minV: -2.6, maxV: -1.2 },
    { minU: 9.55, maxU: 12.15, minV: 15.8, maxV: 17.2 },
  ],
  corridor: { id: 'main-corridor', minU: 0, maxU: end, minV: PATIENT_ROOM.bounds.maxV, maxV: 7.2 },
  corridors: [
    { id: 'clinical-spine', minU: 8.1, maxU: 13.6, minV: -2.6, maxV: 17.2 },
  ],
  zones: {
    support: { id: 'support', minU: 2, maxU: 19.8, minV: -5.3, maxV: -2.6 },
    supplies: { id: 'supplies', minU: 4.91, maxU: 7.75, minV: -5.3, maxV: -2.6 },
    arrival: { id: 'arrival', minU: 6.2, maxU: 13.6, minV: 13.4 + PUBLIC_WING_OFFSET, maxV: 17.4 + PUBLIC_WING_OFFSET },
    waiting: { id: 'waiting', minU: 2, maxU: 6.2, minV: 13.4 + PUBLIC_WING_OFFSET, maxV: 17.4 + PUBLIC_WING_OFFSET },
    washroom: { id: 'washroom', minU: 13.6, maxU: 17.2, minV: 13.4 + PUBLIC_WING_OFFSET, maxV: 17.4 + PUBLIC_WING_OFFSET },
    staff: { id: 'staff', minU: 16.4, maxU: 19.8, minV: -5.3, maxV: -2.6 },
    practice: { id: 'practice', minU: 10.7, maxU: 13.7, minV: -5.3, maxV: -2.6 },
  },
  station: {
    anchor: { u: 10.85, v: 8.15 },
    prop: { asset: 'reference-station', point: { u: 10.85, v: 6.65 }, width: 240 },
    footprint: { minU: 9.45, maxU: 12.25, minV: 5.55, maxV: 7.35 },
    parking: { support: { u: 12.9, v: 8.15 }, lab: { u: 9, v: 8.15 } },
  },
  upgrades: {
    ehr: { id: 'ehr-station', level: 1, prop: { asset: 'equipment-monitor', point: { u: 10.15, v: 6.25 }, width: 42 } },
    practice: { id: 'simulation-room', level: 1, bed: { asset: 'bed-empty', point: { u: 12, v: -3.8 }, width: 160 }, monitor: { asset: 'equipment-monitor', point: { u: 11.1, v: -4.3 }, width: 52 } },
    monitor: { id: 'vitals-monitor', level: 1, prop: PATIENT_ROOM.props.extraMonitor },
    scanner: { id: 'med-safety-scanner', level: 1, prop: PATIENT_ROOM.props.scanner },
  },
  linenCabinets: Array.from({length:3},(_,i) => ({asset:'linen-cabinet',point:{u:-2.3+i*1.3,v:.35},width:88})),
  ambient: { reception: {u:9.9,v:15.17 + PUBLIC_WING_OFFSET}, cartStart: {u:4.7,v:-1.8}, cartTravel: 3.2 },
  roomDecor: {
    'decor-potted-plant-1': { asset: 'decor-potted-plant', point: { u: 5.2, v: -2.65 }, width: 46 },
    'linen-cabinet-1': { asset: 'linen-cabinet', point: { u: 6.8, v: -2.65 }, width: 74 },
    'equipment-medication-cart-1': { asset: 'equipment-medication-cart', point: { u: 6.8, v: -2.65 }, width: 48 },
    'furniture-visitor-chair-1': { asset: 'furniture-visitor-chair', point: { u: 5.2, v: 7.4 }, width: 64 },
    'furniture-bedside-cabinet-1': { asset: 'furniture-bedside-cabinet', point: { u: 6.45, v: 7.6 }, width: 42 },
    'decor-potted-plant-2': { asset: 'decor-potted-plant', point: { u: 7.7, v: 7.4 }, width: 48 },
  },
  decor: {
    'furniture-waiting-sofa-1': { asset: 'furniture-waiting-sofa', point: { u: 2, v: 15.2 }, width: 185 },
    'furniture-waiting-sofa-2': { asset: 'furniture-waiting-sofa', point: { u: 5.1, v: 15.2 }, width: 185 },
    'furniture-visitor-chair-1': { asset: 'furniture-visitor-chair', point: { u: 1, v: 16.6 }, width: 65 },
    'furniture-bedside-cabinet-1': { asset: 'furniture-bedside-cabinet', point: { u: 3.6, v: 16.4 }, width: 58 },
    'decor-potted-plant-1': { asset: 'decor-potted-plant', point: { u: 3.6, v: 16.4 }, width: 28 },
    'decor-potted-plant-2': { asset: 'decor-potted-plant', point: { u: 7.4, v: 15.6 }, width: 58 },
    'decor-potted-plant-3': { asset: 'decor-potted-plant', point: { u: -.8, v: 14.8 }, width: 48 },
    'reception-desk-1': { asset: 'reception-desk', point: { u: -3.1, v: 11.45 }, width: 215 },
    'door-northwest-1': { asset: 'door-northwest', point: { u: -5.4, v: 12.8 }, width: 105 },
    'equipment-medication-cart-1': { asset: 'equipment-medication-cart', point: { u: 2.2, v: 1.8 }, width: 55 },
    'dispatch-counter-1': { asset: 'dispatch-counter', point: { u: 1.8, v: -0.3 }, width: 120 },
    'equipment-medication-cart-2': { asset: 'equipment-medication-cart', point: { u: 2.5, v: 0.6 }, width: 42 },
    'renovation-barrier-1': { asset: 'renovation-barrier', point: { u: -1.25, v: 4.1 }, width: 120 },
    'equipment-medication-cart-3': { asset: 'equipment-medication-cart', point: { u: 4.7, v: -1.8 }, width: 48 },
  },
  camera: {
    left: { u: 3.7, v: 17.2 }, right: { u: 18, v: -2.6 },
    top: { u: 3.7, v: -2.6 }, bottom: { u: 18, v: 17.2 },
    padding: { left: 140, right: 140, top: 220, bottom: 140 },
  },
} as const
export function roomIsUnlocked(index: number, upgrades: Readonly<Record<string,number>>) {
  const room = HOSPITAL_MAP.rooms[index]
  return Boolean(room && (upgrades[room.unlock.upgrade] ?? 0) >= room.unlock.level)
}
export function unlockedRoomCount(upgrades: Readonly<Record<string,number>>) {
  return HOSPITAL_MAP.rooms.filter((_, i) => roomIsUnlocked(i, upgrades)).length
}
export function availableRoomCount(taskCount: number, upgrades?: Readonly<Record<string,number>>) {
  return Math.min(HOSPITAL_MAP.rooms.length, Math.max(taskCount, upgrades ? unlockedRoomCount(upgrades) : 0))
}
export function placeRoomPoint(room: RoomPlacement, point: GroundPoint): GroundPoint {
  return { u: point.u + room.origin.u, v: point.v + room.origin.v }
}
export function localRoomPoint(room: RoomPlacement, point: GroundPoint): GroundPoint {
  return { u: point.u - room.origin.u, v: point.v - room.origin.v }
}
export function rectCorners(rect: GroundRect): GroundPoint[] {
  return [{u:rect.minU,v:rect.minV},{u:rect.maxU,v:rect.minV},{u:rect.maxU,v:rect.maxV},{u:rect.minU,v:rect.maxV}]
}

/** One doorway contract drives its wall opening, hinge, interaction and path. */
export function roomEntrance(index: number) {
  const room = HOSPITAL_MAP.rooms[index]
  const u = room.entrance === 'maxU' ? PATIENT_ROOM.bounds.maxU : PATIENT_ROOM.bounds.minU
  const minV = .85, maxV = 2.25, inward = room.entrance === 'maxU' ? -1 : 1
  const center = placeRoomPoint(room, {u, v:(minV+maxV)/2})
  return {
    side: room.entrance, u, minV, maxV, inward, center,
    from: placeRoomPoint(room,{u,v:minV}), to: placeRoomPoint(room,{u,v:maxV}),
    inside: placeRoomPoint(room,{u:u+inward*.4,v:(minV+maxV)/2}),
    outside: placeRoomPoint(room,{u:u-inward*.4,v:(minV+maxV)/2}),
    leaf: {minU:Math.min(u,u+inward*1.1),maxU:Math.max(u,u+inward*1.1),minV:maxV-.06,maxV:maxV+.06},
  }
}
