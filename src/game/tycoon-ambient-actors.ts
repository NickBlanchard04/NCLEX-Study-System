import { applyNurseFrame, walkFrame } from './tycoon-walk-cycle'
import { setDepthIfChanged } from './tycoon-render-cache'
import type Phaser from 'phaser'
import { actorContact } from './tycoon-surface-finish'
import { HOSPITAL_MAP } from './tycoon-map-config'
import { projectGround, type GroundPoint } from './tycoon-care-presentation'
import { WARD_ART_STANDARD } from './tycoon-grounding'
export function createAmbientActors(scene: Phaser.Scene, prop: (key: string, point: GroundPoint, width: number) => Phaser.GameObjects.Image, frames: Record<string,{pivotX:number;pivotY:number}>) {
  const p = (u:number,v:number) => ({u,v})
  const decorProp = (key: keyof typeof HOSPITAL_MAP.decor) => { const item=HOSPITAL_MAP.decor[key];return prop(item.asset,item.point,item.width) }
  const receptionist=scene.add.sprite(0,0,'nurse-03','se-idle-0').setScale(WARD_ART_STANDARD.nurseScale).setTint(0xf5f2eb)
  const attendant=scene.add.sprite(0,0,'nurse-03','se-idle-0').setScale(WARD_ART_STANDARD.nurseScale).setTint(0xf5f2eb)
  const cart=decorProp('equipment-medication-cart-3')
  cart.setData('wardStatic',false)
  const cartShadow=cart.getData('contactShadow') as Phaser.GameObjects.Image | undefined
  cartShadow?.setData('wardStatic',false)
  const wheelSpokes=scene.add.graphics()
  const shadow=actorContact(scene)
  const receptionShadow=actorContact(scene)
  const receptionAt=projectGround(HOSPITAL_MAP.ambient.reception)
  receptionShadow.update(receptionAt.x,receptionAt.y)
  let lastElapsed=-1,lastReduced=false,lastWheelAngle=NaN,lastWheelX=NaN,lastWheelY=NaN
  const pose=(sprite: Phaser.GameObjects.Sprite,point:GroundPoint,frame:string)=>{
    const at=projectGround(point)
    applyNurseFrame(sprite,frame,frames);sprite.setPosition(at.x,at.y);setDepthIfChanged(sprite,at.y+1)
  }
  return (elapsed:number,reduced:boolean) => {
    if(elapsed===lastElapsed&&reduced===lastReduced)return
    lastElapsed=elapsed;lastReduced=reduced
    const cycle=reduced?0:(elapsed%16000)/1000
    const t=cycle<3?0:cycle<7?(cycle-3)/4:cycle<10?1:cycle<14?1-(cycle-10)/4:0
    const walking=cycle>=3&&cycle<7||cycle>=10&&cycle<14
    const point=p(HOSPITAL_MAP.ambient.cartStart.u+t*HOSPITAL_MAP.ambient.cartTravel,HOSPITAL_MAP.ambient.cartStart.v)
    const direction=cycle>=10?'nw':'se'
    pose(attendant,point,`${direction}-${walking?`push-${walkFrame(t*HOSPITAL_MAP.ambient.cartTravel*Math.hypot(72,44))}`:'care-0'}`)
    const at=projectGround(point)
    const side=direction==='se'?1:-1
    cart.setPosition(at.x+side*24,at.y+side*14);setDepthIfChanged(cart,at.y+side*14)
    cartShadow?.setPosition(cart.x,cart.y)
    setDepthIfChanged(wheelSpokes,cart.depth+.2)
    // Small hub spokes rotate with traveled distance; zero travel leaves them planted.
    const angle=t*HOSPITAL_MAP.ambient.cartTravel*Math.hypot(72,44)/3
    if(angle!==lastWheelAngle||cart.x!==lastWheelX||cart.y!==lastWheelY) {
    lastWheelAngle=angle;lastWheelX=cart.x;lastWheelY=cart.y
    wheelSpokes.clear().setPosition(cart.x,cart.y).lineStyle(.7,0x9dabad,.65)
    const frame=cart.frame, sourceWidth=frame.realWidth, sourceHeight=frame.realHeight
    for(const [x,y] of [[432,955],[680,1060],[834,988]]) {
      const xx=(x/1254*sourceWidth-cart.originX*sourceWidth)*cart.scaleX
      const yy=(y/1254*sourceHeight-cart.originY*sourceHeight)*cart.scaleY
      wheelSpokes.lineBetween(xx-Math.cos(angle)*1.5,yy-Math.sin(angle)*2,xx+Math.cos(angle)*1.5,yy+Math.sin(angle)*2)
    }
    }
    shadow.update(at.x,at.y)
    pose(receptionist,HOSPITAL_MAP.ambient.reception,`se-${reduced?'idle-0':`care-${Math.floor(elapsed/700)%2}`}`)
  }
}

