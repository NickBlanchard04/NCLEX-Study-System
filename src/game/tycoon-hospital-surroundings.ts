import { fillWarmWardFloor } from './tycoon-map-surfaces'
import { createAmbientActors } from './tycoon-ambient-actors'
import { HOSPITAL_MAP, PATIENT_ROOM, rectCorners } from './tycoon-map-config'
import Phaser from 'phaser'
import { projectGround, type GroundPoint, type ScreenPoint } from './tycoon-care-presentation'
import { roomPoint } from './tycoon-ward-layout'
import { buildingWall, drawBuildingExterior } from './tycoon-building-shell'
import { drawDoorFrame, drawDoorPanel } from './tycoon-room-architecture'

interface SurroundingsOptions {
  scene: Phaser.Scene; rooms: number; upgrades: Record<string,number>
  prop(key:string,point:GroundPoint,width:number): Phaser.GameObjects.Image
  polygon(points:ScreenPoint[],fill:number,alpha?:number,depth?:number): Phaser.GameObjects.Graphics
  text(text:string,point:GroundPoint,color?:string,size?:number): Phaser.GameObjects.Text
  wall(key:string,from:GroundPoint,to:GroundPoint):void
  lowWall(from:GroundPoint,to:GroundPoint):void
  openShop:()=>void
  frames:Record<string,{pivotX:number;pivotY:number}>
}

/** Option 5: one building, two three-room neighborhoods and a shared care hub.
 * Structural edges, circulation and furnishings use the same ground coordinates.
 * The static floor material is baked once; gameplay actors remain separate. */
export function drawHospitalSurroundings(o:SurroundingsOptions) {
  const {scene,polygon}=o
  // Rebase the authored public/support furnishing kit onto the compact shell.
  const prop=o.prop
  const p=(u:number,v:number)=>({
    u:v <= -3.8 ? 2+u*17.8/22 : u < 3.7 ? 2+u*1.7/3.7 : u >=18.6 ? 18+(u-18.6)*1.8/3.4 : u>=14.2?u-.6:u,
    v:v>=15.8?HOSPITAL_MAP.zones.arrival.minV+(v-15.8)*4/5.2:v < -1?v+1.2:v,
  })
  const b=HOSPITAL_MAP.building
  const corners=rectCorners(b).map(projectGround)
  polygon(corners.map(at=>({x:at.x,y:at.y+14})),0x7b786e,1,-2002)
  const left=Math.floor(Math.min(...corners.map(at=>at.x))),top=Math.floor(Math.min(...corners.map(at=>at.y)))
  const key='neighborhood-building-v6-warm-floor'
  if(!scene.textures.exists(key)) {
    const canvas=document.createElement('canvas')
    canvas.width=Math.ceil(Math.max(...corners.map(at=>at.x))-left)+1
    canvas.height=Math.ceil(Math.max(...corners.map(at=>at.y))-top)+1
    const ctx=canvas.getContext('2d')!
    ctx.translate(-left,-top);ctx.beginPath()
    corners.forEach((at,i)=>i?ctx.lineTo(at.x,at.y):ctx.moveTo(at.x,at.y));ctx.closePath();ctx.clip()
    fillWarmWardFloor(ctx,scene)
    scene.textures.addCanvas(key,canvas)
  }
  // Rear service props can have negative projected Y; the foundation must
  // stay below the entire world, not just objects in the clinical rooms.
  scene.add.image(left,top,key).setOrigin(0).setDepth(-2000).setTint(0xf2e9d7)
  const plaque=(caption:string,u:number,v:number)=>{
    const at=projectGround(p(u,v))
    scene.add.text(at.x,at.y-36,caption,{fontFamily:'Google Sans Text, sans-serif',fontSize:'13px',color:'#253d50',backgroundColor:'#ead9ba',padding:{x:7,y:3}})
      .setOrigin(.5).setDepth(at.y+2)
  }
  drawBuildingExterior(scene)
  drawDoorFrame(scene,'main-entry',p(9.6,21),p(12.2,21),'ENTRY')
  plaque('MAIN ENTRANCE',10.8,21)
  const support=[
    {a:0,z:3.6,name:'MEDICATION'}, {a:3.6,z:7.1,name:'CLEAN UTILITY'},
    {a:7.1,z:10.7,name:'LINEN'}, {a:10.7,z:14.3,name:'TREATMENT'},
    {a:14.3,z:17.8,name:'DIRTY UTILITY'}, {a:17.8,z:22,name:'STAFF ROOM'},
  ]
  for(const room of support) {
    const mid=(room.a+room.z)/2
    if(room.a) buildingWall(scene,`support-side-${room.a}`,p(room.a,-6.5),p(room.a,-3.8),176)
    buildingWall(scene,`support-front-a-${room.a}`,p(room.a,-3.8),p(mid-.55,-3.8),176).setAlpha(.4)
    buildingWall(scene,`support-front-b-${room.a}`,p(mid+.55,-3.8),p(room.z,-3.8),176).setAlpha(.4)
    // Door jambs make the cutaway opening read as a room entrance.
    drawDoorFrame(scene,`support-${room.a}`,p(mid-.55,-3.8),p(mid+.55,-3.8),room.name.split(' ')[0].slice(0,5))
    drawDoorPanel(scene,`support-${room.a}`,p(mid-.55,-3.8),p(mid+.55,-3.8))
    plaque(room.name,mid,-3.8)
  }
  prop('dispatch-counter',p(1.8,-5.35),146)
  prop('equipment-medication-cart',p(2.7,-4.4),48)
  prop('linen-cabinet',p(4.9,-5.3),105);prop('equipment-medication-cart',p(6.3,-4.9),48)
  prop('linen-cabinet',p(8.2,-5.3),84);prop('linen-cabinet',p(9.5,-5.3),84)
  prop('bed-empty',p(12.35,-5.2),150);prop('equipment-monitor',p(11.45,-5.55),44)
  prop('dispatch-counter',p(16.1,-5.3),128);prop('waste-bin',p(17.1,-4.6),27)
  prop('staff-kitchenette',p(20,-5.3),142)
  prop('furniture-visitor-chair',p(19,-4.45),52)
  prop('furniture-bedside-cabinet',p(20.2,-4.25),46);prop('furniture-visitor-chair',p(21.3,-4.45),52)
  plaque('SERVICE',20.7,-2.6);prop('equipment-medication-cart',p(20.6,-2.5),50)
  // Window-side sitting alcoves stay outside clinical circulation.
  for(const u of [1.5,20.5]) {
    for(const v of HOSPITAL_MAP.rooms.slice(0,3).map(room=>1+room.origin.v)) {
      prop('furniture-visitor-chair',p(u-.5,v),58)
      prop('decor-potted-plant',p(u+.6,v+.6),42)
    }
  }
  // Window bays connect the clinical rooms to the outside wall.
  for(let row=0;row<3;row++) {
    const v=PATIENT_ROOM.bounds.minV+HOSPITAL_MAP.rooms[row].origin.v
    buildingWall(scene,`bay-left-${row}`,p(0,v),p(3.7,v),176)
    buildingWall(scene,`bay-right-${row}`,p(18.6,v),p(22,v),176)
  }
  // Family waiting, reception, visitor toilet and vertical circulation at the front.
  // Waiting and WC open sideways into reception, never into patient rooms.
  for(const [u,label] of [[6.2,'WAIT'],[14.2,'WC']] as const) {
    buildingWall(scene,`public-side-a-${u}`,p(u,15.8),p(u,16.7),176)
    buildingWall(scene,`public-side-b-${u}`,p(u,18.5),p(u,21),176)
    drawDoorFrame(scene,`public-side-${u}`,p(u,16.7),p(u,18.5),label)
    drawDoorPanel(scene,`public-side-${u}`,p(u,16.7),p(u,18.5))
  }
  buildingWall(scene,'public-core-side',p(17.8,15.8),p(17.8,21),176)
  const rear=(id:string,a:number,z:number)=>{
    buildingWall(scene,id,p(a,15.8),p(z,15.8),176).setAlpha(.35)
    buildingWall(scene,`${id}-dado`,p(a,15.8),p(z,15.8),66)
  }
  rear('public-wait-rear',0,6.2)
  rear('public-wc-rear',14.2,17.8)
  for(const [a,z,d0,d1,label] of [[6.2,14.2,9.6,12.2,'WARD'],[17.8,22,18.7,21.1,'LIFT']] as const) {
    rear(`public-rear-a-${a}`,a,d0)
    rear(`public-rear-b-${a}`,d1,z)
    drawDoorFrame(scene,`public-${a}`,p(d0,15.8),p(d1,15.8),label)
    if(label!=='WARD')drawDoorPanel(scene,`public-${a}`,p(d0,15.8),p(d1,15.8))
  }
  plaque('WARD ENTRY',10.9,15.8);prop('sanitizer-stand',p(12.3,16.1),18)
  prop('reception-desk',p(10.2,18.25),220);plaque('RECEPTION',10.2,19.1)
  prop('furniture-waiting-sofa',p(2,17.2),130);prop('furniture-waiting-sofa',p(4.7,17.2),130)
  prop('furniture-visitor-chair',p(1.3,19.4),58);prop('furniture-visitor-chair',p(4.8,19.4),58)
  prop('furniture-bedside-cabinet',p(3.1,19.8),53)
  prop('decor-potted-plant',p(.55,16.6),54);prop('decor-potted-plant',p(5.55,20.1),54)
  plaque('FAMILY WAITING',3.2,20.5)
  prop('furniture-visitor-chair',p(3.1,18.8),54)
  prop('decor-potted-plant',p(8,19.8),48)
  prop('decor-potted-plant',p(13.3,19.8),48)
  prop('washroom-fixtures',p(16,18),164);plaque('ACCESSIBLE WC',16,20.5)
  prop('elevator-core',p(18.7,19.6),150);prop('stair-core',p(20.2,19.6),180)
  plaque('LIFT / STAIRS',20,20.5)
  for(let i=0;i<HOSPITAL_MAP.rooms.length;i++) {
    const item=PATIENT_ROOM.props.sanitizer
    o.prop(item.asset,roomPoint(i,item.point),item.width)
  }
  return createAmbientActors(scene,o.prop,o.frames)
}
