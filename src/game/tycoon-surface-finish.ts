import { cachedSurface } from './tycoon-render-cache'
import { PATIENT_ROOM } from './tycoon-map-config'
import { roomPoint } from './tycoon-ward-layout'
import Phaser from 'phaser'
import { projectGround, type GroundPoint } from './tycoon-care-presentation'

/** Floor details are baked once as scene graphics, never rebuilt during movement. */
export function floorInlay(scene: Phaser.Scene, a: GroundPoint, b: GroundPoint, color: number) {
  const corners = [a, { u: b.u, v: a.v }, b, { u: a.u, v: b.v }].map(projectGround)
  scene.add.graphics().setDepth(-1).lineStyle(2, color, .5).strokePoints(corners.map(p => new Phaser.Math.Vector2(p.x,p.y)), true)
}
export function wallFinish(scene: Phaser.Scene, from: GroundPoint, to: GroundPoint, reference = false) {
  const a=projectGround(from),b=projectGround(to)
  const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/32))
  const dx=(b.x-a.x)/count,dy=(b.y-a.y)/count
  const left=Math.min(0,dx)-4,top=Math.min(0,dy)-24
  const key=`low-wall-${reference ? 'cream' : 'blue'}-${dx.toFixed(3)}-${dy.toFixed(3)}`
  for(let i=0;i<count;i++) {
    cachedSurface(scene,key,Math.abs(dx)+8,Math.abs(dy)+28,ctx=>{
      ctx.translate(-left,-top)
      ctx.fillStyle=reference ? '#d3c7af' : '#7a93a7';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(dx,dy);ctx.lineTo(dx,dy-20);ctx.lineTo(0,-20);ctx.closePath();ctx.fill()
      const line=(y:number,color:string,width:number)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(dx,dy+y);ctx.stroke()}
      line(-3,reference ? '#334b60' : 'rgba(66,91,104,.65)',4);line(-14,'rgba(212,222,220,.6)',1);line(-20,reference ? '#efe7d5' : '#f2f3ee',6)
    }).setPosition(a.x+dx*i+left,a.y+dy*i+top).setDepth(a.y+dy*(i+.5))
  }
  for(const p of [a,b]) cachedSurface(scene,'low-wall-post',8,26,ctx=>{
    ctx.fillStyle='#cbd5d2';ctx.fillRect(1,1,6,24);ctx.fillStyle='#f5f2e7';ctx.fillRect(0,0,8,3)
  }).setPosition(p.x-4,p.y-25).setDepth(p.y+.1)
  // Floor contact remains beneath all furniture and people.
  const sx=b.x-a.x,sy=b.y-a.y,l=Math.min(a.x,b.x)-4,t=Math.min(a.y,b.y)-1
  cachedSurface(scene,`wall-contact-${sx.toFixed(2)}-${sy.toFixed(2)}`,Math.abs(sx)+12,Math.abs(sy)+10,ctx=>{
    ctx.strokeStyle='rgba(52,76,80,.1)';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(a.x-l+2,a.y-t+3);ctx.lineTo(b.x-l+2,b.y-t+3);ctx.stroke()
  }).setPosition(l,t).setDepth(-.4)
}

export function roomFinish(scene: Phaser.Scene, index: number) {
  const p = (u: number, v: number) => roomPoint(index, { u, v })
  const { inlay, door, bounds } = PATIENT_ROOM
  floorInlay(scene,p(inlay.minU,inlay.minV),p(inlay.maxU,inlay.maxV),0x748e8d)
  const a=projectGround(p(door.minU,bounds.maxV)),b=projectGround(p(door.maxU,bounds.maxV))
  scene.add.graphics().setDepth(0).lineStyle(7,0xa6aaa1).lineBetween(a.x,a.y,b.x,b.y).lineStyle(2,0xe8e4d4).lineBetween(a.x,a.y-2,b.x,b.y-2)
  // Gathered privacy curtain stays against the rear corner, outside the bedside route.
  const c=projectGround(roomPoint(index,PATIENT_ROOM.curtain))
  const g=scene.add.graphics().setDepth(c.y+2)
  g.lineStyle(3,0x879994).lineBetween(c.x-25,c.y-107,c.x+5,c.y-89)
  for(let n=0;n<7;n++) g.fillStyle(n%2?0x8cafac:0xc0d5ce).fillRect(c.x-24+n*4,c.y-102+n*2,4,67)
}
/** A compact stationary contact shadow grounds the actor without inventing moving footprints. */
export function actorContact(scene: Phaser.Scene) {
  const g=scene.add.graphics()
  g.fillStyle(0x39332b,.10).fillEllipse(9,5,36,12)
  g.fillStyle(0x39332b,.18).fillEllipse(1,1,23,8)
  g.fillStyle(0x39332b,.24).fillEllipse(0,0,16,4)
  const group=scene.add.container(0,0,[g]).setDepth(-.4)
  return { update(x:number,y:number) { group.setPosition(x,y+1) } }
}
