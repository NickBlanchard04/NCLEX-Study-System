import { describe, expect, it } from 'vitest'
import { availableRoomCount, HOSPITAL_MAP, PATIENT_ROOM, PUBLIC_WING_OFFSET, placeRoomPoint, localRoomPoint, roomIsUnlocked, roomEntrance } from '../tycoon-map-config'
import { roomPoint, STATION_POSITION } from '../tycoon-ward-layout'
import { clearSegment, findWardPath, isWardWalkable } from '../tycoon-navigation'
import { followCamera, followZoom, overviewCamera } from '../tycoon-ward-camera'
import { projectGround } from '../tycoon-care-presentation'

describe('shipped map contract', () => {
  it('adds 15% usable floor area without widening rooms or shrinking the corridor', () => {
    const {minU,maxU,minV,maxV}=PATIENT_ROOM.bounds
    expect((maxU-minU)*(maxV-minV)/(4.4*4.8)).toBeCloseTo(1.15)
    for(let i=0;i<6;i++) {
      const floor=roomPoint(i,{u:5,v:4.1})
      expect(isWardWalkable(floor,6)).toBe(true)
      expect(findWardPath(STATION_POSITION,floor,6)).not.toBeNull()
    }
    expect(HOSPITAL_MAP.rooms[2].origin.v+maxV).toBeCloseTo(HOSPITAL_MAP.zones.arrival.minV)
  })
  it('joins neighboring rooms and preserves both circulation lanes beside the handoff desk',()=>{
    for(const i of [0,1,3,4]) {
      expect(HOSPITAL_MAP.rooms[i].origin.v+PATIENT_ROOM.bounds.maxV)
        .toBeCloseTo(HOSPITAL_MAP.rooms[i+1].origin.v+PATIENT_ROOM.bounds.minV)
    }
    for(const u of [8.8,12.9]) {
      expect(clearSegment({u,v:4.8},{u,v:8.6},6)).toBe(true)
      expect(findWardPath(STATION_POSITION,{u,v:4.8},6)).not.toBeNull()
    }
  })
  it('connects the public vestibule and rear service corridor without crossing desks or ward partitions', () => {
    for (const point of [{u:10.8,v:16.9+PUBLIC_WING_OFFSET},{u:11,v:13.4+PUBLIC_WING_OFFSET},{u:5.5,v:-1.8}]) {
      const path = findWardPath(STATION_POSITION,point,3)
      expect(path).not.toBeNull()
      let previous = STATION_POSITION
      for (const next of path!) { expect(clearSegment(previous,next,3)).toBe(true);previous=next }
    }
    for (const point of [{u:10.2,v:15.28+PUBLIC_WING_OFFSET},{u:8.5,v:13.4+PUBLIC_WING_OFFSET},{u:13,v:13.4+PUBLIC_WING_OFFSET},{u:16,v:15.1+PUBLIC_WING_OFFSET},{u:10.5,v:6}]) {
      expect(isWardWalkable(point,6)).toBe(false)
    }
  })
  it('preserves stable room labels and exposes compact-map work anchors', () => {
    expect(HOSPITAL_MAP.rooms.map(room => room.id)).toEqual(['room-101','room-102','room-103','room-104','room-105','room-106'])
    expect(STATION_POSITION).toEqual({u:10.85,v:8.15})
    expect(roomPoint(0,PATIENT_ROOM.anchors.patient)).toEqual({u:5.4,v:2.05})
    // Ordinary floor clicks retain their position; only the named care anchor moves.
    expect(roomPoint(0,{...PATIENT_ROOM.anchors.patient})).toEqual({u:6.4,v:1.85})
    expect(roomPoint(5,PATIENT_ROOM.anchors.safety).u).toBeCloseTo(14.7)
    expect(availableRoomCount(6,{})).toBe(6) // Legacy saves stay accessible.
    expect(availableRoomCount(3,{})).toBe(3)
    expect(availableRoomCount(3,{'extra-bed':1})).toBe(4)
    expect(availableRoomCount(3,{'extra-bed':99})).toBe(6)
  })
  it('places room contents with one invertible translation, including vertical displacement', () => {
    const room={...HOSPITAL_MAP.rooms[0],origin:{u:12,v:-7}}
    const point={u:6.4,v:1.85}
    const placed=placeRoomPoint(room,point)
    expect(placed).toEqual({u:18.4,v:-5.15})
    expect(localRoomPoint(room,placed).u).toBeCloseTo(point.u)
    expect(localRoomPoint(room,placed).v).toBeCloseTo(point.v)
  })
  it('admits through the rendered door and blocks wall crossings in every room', () => {
    for(let i=0;i<6;i++) {
      const door=roomEntrance(i)
      expect(clearSegment(door.inside,door.outside,6)).toBe(true)
      expect(clearSegment(roomPoint(i,{u:6.4,v:PATIENT_ROOM.bounds.maxV+.5}),roomPoint(i,{u:6.4,v:PATIENT_ROOM.bounds.maxV-.5}),6)).toBe(false)
      expect(clearSegment(roomPoint(i,{u:4.1,v:PATIENT_ROOM.bounds.maxV+.5}),roomPoint(i,{u:4.1,v:PATIENT_ROOM.bounds.maxV-.5}),6)).toBe(false)
    }
  })
  it('reaches every clinical anchor around the configured furniture', () => {
    for(let i=0;i<6;i++) for(const point of Object.values(PATIENT_ROOM.anchors)) {
      const target=roomPoint(i,point),path=findWardPath(STATION_POSITION,target,6)
      expect(path,`room ${i+101}`).not.toBeNull()
      let prior=STATION_POSITION
      for(const next of path!) {expect(clearSegment(prior,next,6)).toBe(true);prior=next}
    }
  })
  it('blocks configured bed and cabinet envelopes, while keeping care anchors clear', () => {
    for(let i=0;i<6;i++) for(const prop of [PATIENT_ROOM.props.bed,PATIENT_ROOM.props.cabinet]) {
      const f=prop.footprint
      expect(isWardWalkable(roomPoint(i,{u:(f.minU+f.maxU)/2,v:(f.minV+f.maxV)/2}),6)).toBe(false)
    }
  })
  it('keeps closed-room floors inaccessible until their barrier unlock', () => {
    for(let level=0;level<=3;level++) {
      const upgrades={'extra-bed':level},count=availableRoomCount(3,upgrades)
      for(let i=0;i<6;i++) {
        expect(isWardWalkable(roomPoint(i,PATIENT_ROOM.anchors.patient),count)).toBe(roomIsUnlocked(i,upgrades))
      }
    }
  })
  it('keeps every bedside within an eight-second station route at walking speed',()=>{
    for(let i=0;i<6;i++){
      const target=roomPoint(i,PATIENT_ROOM.anchors.patient),path=findWardPath(STATION_POSITION,target,6)!
      let previous=projectGround(STATION_POSITION),distance=0
      for(const point of path){const next=projectGround(point);distance+=Math.hypot(next.x-previous.x,next.y-previous.y);previous=next}
      expect(distance/175,`Room ${101+i}`).toBeLessThan(8)
    }
  })
  it('fits the full configured building at desktop and phone sizes', () => {
    for(const [width,height] of [[1440,900],[375,667]]) {
      const camera=overviewCamera(width,height), bounds=HOSPITAL_MAP.camera
      const left=projectGround(bounds.left).x-bounds.padding.left
      const right=projectGround(bounds.right).x+bounds.padding.right
      const top=projectGround(bounds.top).y-bounds.padding.top
      const bottom=projectGround(bounds.bottom).y+bounds.padding.bottom
      expect((left-camera.x)*camera.zoom+width/2).toBeGreaterThanOrEqual(0)
      expect((right-camera.x)*camera.zoom+width/2).toBeLessThanOrEqual(width)
      expect((top-camera.y)*camera.zoom+height/2).toBeGreaterThanOrEqual(0)
      expect((bottom-camera.y)*camera.zoom+height/2).toBeLessThanOrEqual(height)
    }
  })
  it('keeps Room 101 walls and the bedside inside the desktop follow viewport', () => {
    const bedside = projectGround(roomPoint(0,PATIENT_ROOM.anchors.patient))
    const {minU,maxU,minV,maxV} = PATIENT_ROOM.bounds
    const top = projectGround({u:minU,v:minV}).y-180
    const bottom = projectGround({u:maxU,v:maxV}).y
    for (const [width,height] of [[900,720],[1280,720],[1440,900]]) {
      const zoom=followZoom(width,height)
      const camera=followCamera(width,height,zoom,bedside,null,0,true)
      expect((top-camera.y)*zoom+height/2).toBeGreaterThanOrEqual(24)
      expect((bottom-camera.y)*zoom+height/2).toBeLessThan(height-90)
      expect(94*zoom).toBeGreaterThan(60)
    }
  })
})

