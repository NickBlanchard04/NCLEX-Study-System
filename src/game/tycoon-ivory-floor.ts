import { HOSPITAL_MAP, PATIENT_ROOM_DEPTH, type GroundRect } from './tycoon-map-config'
import type { GroundPoint } from './tycoon-care-presentation'
import { bakeWardDaylight } from './tycoon-ward-lighting'

export const IVORY_FLOOR_TILE_SIZE = 1.25
let grain: HTMLCanvasElement | undefined

/** Option 1: fine-speckled ivory vinyl. All rooms sample one world tile grid. */
export function bakeIvoryFloor(ctx: CanvasRenderingContext2D, bounds: GroundRect, origin: GroundPoint = {u:0,v:0}) {
  if (!grain) {
    grain = document.createElement('canvas'); grain.width = grain.height = 512
    const g = grain.getContext('2d')!
    g.fillStyle = '#e7dcc4'; g.fillRect(0,0,512,512)
    let seed = 1971
    const random = () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
    for(let i=0;i<5200;i++) {
      g.fillStyle = i%3 ? 'rgba(150,124,85,.09)' : 'rgba(255,253,239,.32)'
      g.beginPath();g.ellipse(random()*512,random()*512,.4+random()*1.2,.3+random()*.7,0,0,Math.PI*2);g.fill()
    }
  }
  ctx.save()
  ctx.translate(-origin.u,-origin.v)
  const b={minU:bounds.minU+origin.u,maxU:bounds.maxU+origin.u,minV:bounds.minV+origin.v,maxV:bounds.maxV+origin.v}
  const pattern=ctx.createPattern(grain,'repeat')!
  pattern.setTransform(new DOMMatrix().scale(IVORY_FLOOR_TILE_SIZE/512))
  ctx.fillStyle=pattern;ctx.fillRect(b.minU,b.minV,b.maxU-b.minU,b.maxV-b.minV)
  const step=IVORY_FLOOR_TILE_SIZE
  for(let u=Math.floor(b.minU/step)*step;u<b.maxU;u+=step) for(let v=Math.floor(b.minV/step)*step;v<b.maxV;v+=step) {
    if((Math.round(u/step)+Math.round(v/step))%2===0) {ctx.fillStyle='rgba(255,250,231,.035)';ctx.fillRect(u,v,step,step)}
    ctx.lineWidth=.008;ctx.strokeStyle='rgba(120,105,82,.15)';ctx.strokeRect(u,v,step,step)
    ctx.lineWidth=.005;ctx.strokeStyle='rgba(255,255,246,.32)';ctx.strokeRect(u+.011,v+.011,step-.022,step-.022)
  }
  bakeWardDaylight(ctx,b)
  const glow=(u:number,v:number,rx:number,ry:number,alpha:number)=>{
    ctx.save();ctx.translate(u,v);ctx.scale(rx,ry)
    const light=ctx.createRadialGradient(0,0,0,0,0,1)
    light.addColorStop(0,`rgba(255,255,248,${alpha})`)
    light.addColorStop(.45,`rgba(255,253,236,${alpha*.65})`)
    light.addColorStop(1,'rgba(255,253,236,0)')
    ctx.fillStyle=light;ctx.fillRect(-1,-1,2,2);ctx.restore()
  }
  const pane=(u:number,v:number,width:number)=>{
    ctx.save()
    const reflection=ctx.createLinearGradient(u,0,u+width,0)
    reflection.addColorStop(0,'rgba(255,255,255,0)')
    reflection.addColorStop(.18,'rgba(255,255,253,.62)')
    reflection.addColorStop(.7,'rgba(255,255,253,.5)')
    reflection.addColorStop(1,'rgba(255,255,253,0)')
    ctx.fillStyle=reflection;ctx.shadowColor='rgba(255,255,248,.3)';ctx.shadowBlur=7
    ctx.fillRect(u,v,width,.32);ctx.restore()
  }
  // Soft window reflections enter from the outer walls; ceiling glimmer continues
  // through the hallway. These lights are baked once, never animated or blurred per frame.
  for(let row=0;row<3;row++) {
    const v=row*PATIENT_ROOM_DEPTH+.7
    for(const u of [4.8,16.2]) {
      glow(u,v+1,2.6,.8,.36)
      glow(u+.35,v+2.4,1.8,.3,.24)
    }
    for(const u of [3.85,14.6]) {
      pane(u,v+1.75,2.8);pane(u+.15,v+2.28,2.5)
    }
    glow(10.7,v+2.7,.48,1.7,.27)
    pane(9.2,v+2.4,2.1)
  }
  const lobby=HOSPITAL_MAP.zones.arrival.minV
  glow(5,lobby+1.7,2.2,.8,.3);glow(11,lobby+1.4,.5,1.5,.26)
  ctx.restore()
}
