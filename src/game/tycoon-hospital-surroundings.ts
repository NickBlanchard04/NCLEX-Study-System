import { HOSPITAL_MAP, PATIENT_ROOM, PATIENT_ROOM_DEPTH, rectCorners } from './tycoon-map-config'
import type Phaser from 'phaser'
import { projectGround, type GroundPoint, type ScreenPoint } from './tycoon-care-presentation'
import { roomPoint } from './tycoon-ward-layout'
import { buildingWall } from './tycoon-building-shell'
import { wardCanvasPointer } from './tycoon-pointer'

interface SurroundingsOptions {
  scene: Phaser.Scene; rooms: number; upgrades: Record<string,number>
  prop(key:string,point:GroundPoint,width:number): Phaser.GameObjects.Image
  polygon(points:ScreenPoint[],fill:number,alpha?:number,depth?:number): Phaser.GameObjects.Graphics
  text(text:string,point:GroundPoint,color?:string,size?:number): Phaser.GameObjects.Text
  wall(key:string,from:GroundPoint,to:GroundPoint):void
  lowWall(from:GroundPoint,to:GroundPoint):void
  openShop:()=>void
  goTo:(id:string)=>void
  frames:Record<string,{pivotX:number;pivotY:number}>
}

/** Only the ward is revealed. Bake its soft boundary once, without live blur. */
export function drawHospitalSurroundings(o:SurroundingsOptions) {
  const {scene}=o
  scene.cameras.main.setBackgroundColor('#050609')
  const floors=[...HOSPITAL_MAP.corridors,...HOSPITAL_MAP.rooms.map(room=>({
    minU:room.origin.u+PATIENT_ROOM.bounds.minU,maxU:room.origin.u+PATIENT_ROOM.bounds.maxU,
    minV:room.origin.v+PATIENT_ROOM.bounds.minV,maxV:room.origin.v+PATIENT_ROOM.bounds.maxV,
  }))]
  const points=floors.flatMap(f=>rectCorners(f).map(projectGround))
  const left=Math.floor(Math.min(...points.map(p=>p.x)))-100,top=Math.floor(Math.min(...points.map(p=>p.y)))-100
  const key='patient-floor-v9-soft-boundary'
  if(!scene.textures.exists(key)) {
    const canvas=document.createElement('canvas')
    canvas.width=Math.ceil(Math.max(...points.map(p=>p.x))-left)+100
    canvas.height=Math.ceil(Math.max(...points.map(p=>p.y))-top)+100
    const ctx=canvas.getContext('2d')!
    ctx.translate(-left,-top);ctx.filter='blur(24px)';ctx.fillStyle='#35352f';ctx.beginPath()
    for(const floor of floors) {
      rectCorners(floor).map(projectGround).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()
    }
    ctx.fill();scene.textures.addCanvas(key,canvas)
  }
  scene.add.image(left,top,key).setOrigin(0).setDepth(-2002)
  const hall=HOSPITAL_MAP.corridors[0]
  for(const [id,v,near] of [['north',hall.minV,false],['south',hall.maxV,true]] as const) {
    buildingWall(scene,`hall-${id}`,{u:hall.minU,v},{u:hall.maxU,v},176).setAlpha(near?.32:1)
    if(near)buildingWall(scene,`hall-${id}-dado`,{u:hall.minU,v},{u:hall.maxU,v},66)
  }
  for(const side of ['minU','maxU'] as const) for(const [start,end] of [[hall.minV,-1],[PATIENT_ROOM.bounds.maxV+2*PATIENT_ROOM_DEPTH,hall.maxV]]) {
    buildingWall(scene,`hall-end-${side}-${start}`,{u:hall[side],v:start},{u:hall[side],v:end},176).setAlpha(side==='maxU'?.32:1)
  }
  for(const lift of HOSPITAL_MAP.elevators) {
    const at=projectGround(lift.point)
    o.prop('elevator-core',lift.point,220).setData('lockedElevator',lift.id)
      .setInteractive({useHandCursor:true,pixelPerfect:true}).on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(wardCanvasPointer(pointer,scene))o.goTo(lift.id)})
    scene.add.text(at.x,at.y-175,'2  ·  LOCKED',{fontFamily:'system-ui',fontSize:'14px',fontStyle:'bold',color:'#fff2d1',backgroundColor:'#25282d',padding:{x:9,y:5}})
      .setOrigin(.5).setDepth(at.y+2).setData('fixedSign',true)
  }
  for(let i=0;i<6;i++)o.prop('sanitizer-stand',roomPoint(i,PATIENT_ROOM.props.sanitizer.point),16)
  return ()=>{}
}
