import type Phaser from 'phaser'
import { OAK_DOOR_TEXTURE, paintOakDoorLeaf, paintOakDoorFrame } from './tycoon-oak-door'
import { buildingWall } from './tycoon-building-shell'
import { HOSPITAL_MAP, PATIENT_ROOM, placeRoomPoint, roomEntrance } from './tycoon-map-config'
import { projectGround, type GroundPoint } from './tycoon-care-presentation'
import { cachedSurface } from './tycoon-render-cache'
import { depthSortedSurface } from './tycoon-depth-surface'
import { cachedArchitectureFrame } from './tycoon-architecture-atlas'

const WALL_HEIGHT=176

/** All four edges exist at full height. Near-wall upper sections are separate
 * presentation layers so bedside visibility never changes collision geometry. */
export function drawClinicalArchitecture(scene:Phaser.Scene,index:number,closed:boolean) {
  const room=HOSPITAL_MAP.rooms[index],b=PATIENT_ROOM.bounds,door=roomEntrance(index)
  const p=(u:number,v:number)=>placeRoomPoint(room,{u,v})
  const wall=(id:string,from:GroundPoint,to:GroundPoint,near=false)=>{
    const face=buildingWall(scene,`clinical-${index}-${id}`,from,to,WALL_HEIGHT)
      .setData('clinicalRoom',index).setData('upperWall',near)
    if(near) {
      face.setAlpha(.32)
      buildingWall(scene,`clinical-${index}-${id}-dado`,from,to,66)
    }
    // Ambient occlusion follows the physical baseline, rather than the sprite box.
    const a=projectGround(from),z=projectGround(to)
    const shadow=scene.add.graphics().setDepth(-2.7).fillStyle(0x665a45,.15)
    shadow.beginPath().moveTo(a.x,a.y).lineTo(z.x,z.y).lineTo(z.x+10,z.y+7).lineTo(a.x+10,a.y+7).closePath().fillPath()
    return face
  }
  // The next room's head wall is this room's foot partition. Draw it once:
  // overlapping translucent faces produce dark seams and clipping at joins.
  wall('head',p(b.minU,b.minV),p(b.maxU,b.minV))
  // The last row closes the ward; intermediate foot walls are the next head wall.
  if(index%3===2) wall('foot',p(b.minU,b.maxV),p(b.maxU,b.maxV),true)
  for(const side of ['minU','maxU'] as const) {
    const u=b[side],near=side==='maxU'
    if(side===door.side) {
      wall(`${side}-head`,p(u,b.minV),p(u,door.minV),near)
      wall(`${side}-foot`,p(u,door.maxV),p(u,b.maxV),near)
      // A full lintel spans the real opening, not a painted gap in a low wall.
      const lintel=buildingWall(scene,`clinical-${index}-lintel`,door.from,door.to,30)
      lintel.setY(lintel.y-(WALL_HEIGHT-30))
    } else wall(side,p(u,b.minV),p(u,b.maxV),near)
  }
  // Solid corner piers preserve the architectural silhouette in cutaway view.
  for(const u of [b.minU,b.maxU]) for(const v of (index%3===2?[b.minV,b.maxV]:[b.minV])) {
    buildingWall(scene,`clinical-${index}-corner-${u}-${v}`,p(u,v),p(u+.10,v),WALL_HEIGHT)
  }
  const leafFrom=closed?door.from:door.to
  const leafTo=closed?door.to:p(door.u+door.inward*1.1,door.maxV)
  const leaf=drawDoorPanel(scene,`clinical-${index}-${closed?'closed':'open'}`,leafFrom,leafTo)
  const frame=drawDoorFrame(scene,index,door.from,door.to,room.label.replace('Room ',''))
  const hitA=projectGround(leafFrom),hitB=projectGround(leafTo)
  // Door input wins over nearby bedside target circles without changing the
  // render depth of its woodwork or the nurse passing through the opening.
  const hit=scene.add.zone((hitA.x+hitB.x)/2,(hitA.y+hitB.y)/2-78,Math.abs(hitA.x-hitB.x)+12,Math.abs(hitA.y-hitB.y)+168)
    .setDepth(1301).setInteractive({useHandCursor:true}).setData('roomDoorHit',index)
  // Door metadata also makes the rendered four-wall / one-door contract inspectable.
  frame.setData('roomDoor',index).setData('closed',closed)
  return {frame,leaf,hit}
}

function doorSurface(scene:Phaser.Scene,id:string,from:GroundPoint,to:GroundPoint,height:number,paint:(c:CanvasRenderingContext2D,a:{x:number;y:number},b:{x:number;y:number})=>void,margin=12) {
  const a=projectGround(from),b=projectGround(to),left=Math.min(a.x,b.x)-margin,top=Math.min(a.y,b.y)-height-12
  const key=`studio-door-${id}`
  if(cachedArchitectureFrame(scene,key))return depthSortedSurface(scene,key,left,top,a,b,3)
  const cached=cachedSurface(scene,key,Math.abs(a.x-b.x)+margin*2+2,Math.abs(a.y-b.y)+height+28,c=>{
    c.translate(-left,-top);paint(c,a,b)
  })
  cached.destroy()
  return depthSortedSurface(scene,key,left,top,a,b,3)
}

export function drawDoorPanel(scene:Phaser.Scene,id:string,from:GroundPoint,to:GroundPoint) {
  return doorSurface(scene,id,from,to,156,(c,a,b)=>{
    if(id.startsWith('clinical-')) {
      const art=scene.textures.get(OAK_DOOR_TEXTURE).getSourceImage()
      if(art instanceof HTMLImageElement || art instanceof HTMLCanvasElement) {paintOakDoorLeaf(c,art,a,b);return}
    }
    const plane=(start:number,end:number,low:number,high:number,color:string)=>{
      const at=(t:number,h:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t-h})
      const pts=[at(start,low),at(end,low),at(end,high),at(start,high)]
      c.beginPath();pts.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.fillStyle=color;c.fill()
    }
    plane(0,1,0,156,'#886645');plane(.025,.975,3,153,'#c5a577')
    for(let t=.04;t<.97;t+=.035)plane(t,t+.005,5,151,Math.round(t*100)%2?'rgba(93,64,33,.13)':'rgba(255,234,195,.17)')
    plane(.13,.65,86,139,'#806d55');plane(.16,.62,90,135,'#dbdfd4');plane(.19,.59,93,132,'#789498');plane(.20,.57,108,130,'#a5bab8')
    plane(.04,.96,18,34,'#8c9190');plane(.04,.96,21,31,'#bdc1bc')
    const t=.83,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-73
    c.fillStyle='#636d70';c.fillRect(x-3,y-10,6,19);c.strokeStyle='#e0e4de';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+9,y+2);c.stroke()
  })
}

export function drawDoorFrame(scene:Phaser.Scene,index:number|string,from:GroundPoint,to:GroundPoint,number:string) {
  return doorSurface(scene,`frame-${index}`,from,to,WALL_HEIGHT,(c,a,b)=>{
    if(typeof index==='number') {
      const art=scene.textures.get(OAK_DOOR_TEXTURE).getSourceImage()
      if(art instanceof HTMLImageElement || art instanceof HTMLCanvasElement) {paintOakDoorFrame(c,art,a,b,number);return}
    }
    c.strokeStyle='#887657';c.lineWidth=13;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x,a.y-160);c.lineTo(b.x,b.y-160);c.lineTo(b.x,b.y);c.stroke()
    c.strokeStyle='#ead8b8';c.lineWidth=8;c.stroke()
    c.strokeStyle='#faf1dd';c.lineWidth=1;c.stroke()
    const start=a.x<b.x?a:b,end=a.x<b.x?b:a,width=end.x-start.x
    c.save();c.translate(start.x,start.y-175);c.transform(1,(end.y-start.y)/width,0,1,0,0)
    c.fillStyle='#6f6049';c.fillRect(0,0,width,28);c.fillStyle='#dfc7a0';c.fillRect(3,2,width-6,23)
    c.fillStyle='#263944';c.font='700 20px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(number,width/2,14)
    c.restore()
    c.strokeStyle='#b6bcb5';c.lineWidth=4;c.beginPath();c.moveTo(a.x,a.y+2);c.lineTo(b.x,b.y+2);c.stroke()
  },typeof index==='number'?48:12)
}
