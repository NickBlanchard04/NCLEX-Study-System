import type { GroundPoint } from './tycoon-care-presentation'
import { HOSPITAL_MAP, PATIENT_ROOM, placeRoomPoint } from './tycoon-map-config'
import { referenceRoomLayout } from './tycoon-reference-room'

// Compatibility exports for existing jobs and saves; all values come from the map definition.
export const WARD_ROOM = PATIENT_ROOM.bounds
export const ROOM_DOOR = PATIENT_ROOM.door
export const ROOM_GAP = 1.1
export const ROOM_SPACING = PATIENT_ROOM.bounds.maxV - PATIENT_ROOM.bounds.minV
export const CORRIDOR = HOSPITAL_MAP.corridor
export const STATION_POSITION: GroundPoint = HOSPITAL_MAP.station.anchor
export const ROOM_PROPS = Object.fromEntries(Object.entries(PATIENT_ROOM.props).map(([key, prop]) => [key, prop.point])) as { [K in keyof typeof PATIENT_ROOM.props]: (typeof PATIENT_ROOM.props)[K]['point'] }
export const ROOM_STOPS = PATIENT_ROOM.anchors
// Equipment shares its supporting furniture's footprint; these are padded navigation envelopes.
export const ROOM_OBSTACLES = [PATIENT_ROOM.props.bed.footprint, PATIENT_ROOM.props.cabinet.footprint] as const
export const roomPoint = (index: number, point: GroundPoint): GroundPoint => {
  const room = HOSPITAL_MAP.rooms[index]
  if (!room) throw new RangeError(`Unknown hospital room index: ${index}`)
  const layout = referenceRoomLayout(room.entrance === 'minU')
  // Compatibility callers pass the canonical template point objects. Arbitrary
  // floor-click coordinates are never remapped by numerical coincidence.
  {
    if (point === ROOM_PROPS.bed) point = layout.bed
    else if (point === ROOM_PROPS.monitor) point = layout.monitor
    else if (point === ROOM_PROPS.cabinet) point = layout.cabinet
    else if (point === ROOM_PROPS.iv) point = layout.iv
    else if (point === ROOM_PROPS.extraMonitor) point = layout.extraMonitor
    else if (point === ROOM_PROPS.scanner) point = layout.scanner
    else if (point === ROOM_STOPS.patient) point = layout.patient
    else if (point === ROOM_STOPS.equipment) point = layout.equipment
    else if (point === ROOM_STOPS.safety) point = layout.safety
  }
  return placeRoomPoint(room, point)
}
export const wardEnd = (roomCount: number) => roomCount >= HOSPITAL_MAP.rooms.length ? CORRIDOR.maxU : WARD_ROOM.maxU + .5 + Math.max(0,...HOSPITAL_MAP.rooms.slice(0,Math.max(1,roomCount)).map(room => room.origin.u))
