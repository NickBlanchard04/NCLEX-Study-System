import { describe,expect,it } from 'vitest'
import { surfaceDepthAtX } from '../tycoon-depth-order'

describe('architectural baseline sorting',()=>{
  it('keeps a hall actor in front of a long wall at its own column',()=>{
    const a={x:100,y:200},b={x:300,y:322}
    const local=surfaceDepthAtX(a,b,130,-1)
    expect(local).toBeCloseTo(217.3)
    expect(local).toBeLessThan(230) // hall actor
    expect(Math.max(a.y,b.y)-1).toBeGreaterThan(230) // old incorrect sort
    expect(local).toBeGreaterThan(210) // inside actor is correctly behind
  })
  it('has identical depths when endpoints are reversed and clamps jamb overhang',()=>{
    const a={x:100,y:300},b={x:300,y:180}
    for(const x of [90,140,220,315])expect(surfaceDepthAtX(a,b,x)).toBe(surfaceDepthAtX(b,a,x))
  })
})
