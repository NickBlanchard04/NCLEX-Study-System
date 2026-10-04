import { describe, expect, it } from 'vitest'
import { GROUND_PROFILES } from '../tycoon-grounding'
import { HOSPITAL_MAP, PATIENT_ROOM } from '../tycoon-map-config'

describe('grounded art registration contract',()=>{
  it('requires contact profiles for furniture added to the map kit',()=>{
    const props=[...Object.values(PATIENT_ROOM.props),...Object.values(HOSPITAL_MAP.decor),...HOSPITAL_MAP.linenCabinets,HOSPITAL_MAP.station.prop]
    for(const prop of props) {
      if(prop.asset.startsWith('door-')) continue // Architectural baselines have their own registration.
      expect(GROUND_PROFILES[prop.asset],prop.asset).toBeDefined()
    }
  })
  it('keeps support contacts finite and inside the registered visible bounds',()=>{
    for(const [key,profile] of Object.entries(GROUND_PROFILES)) {
      expect(profile.contacts.length,key).toBeGreaterThanOrEqual(3)
      for(const point of profile.contacts) for(const coordinate of point) {
        expect(Number.isFinite(coordinate),key).toBe(true)
        expect(coordinate,key).toBeGreaterThanOrEqual(0)
        expect(coordinate,key).toBeLessThanOrEqual(1)
      }
    }
    expect(GROUND_PROFILES['patient-bed-overlay']).toBeUndefined() // Occupied bed owns its single shared shadow.
  })
})
