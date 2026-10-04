import type Phaser from 'phaser'
import { projectGround, type GroundPoint } from './tycoon-care-presentation'

/** Asset coordinates are normalized to the opaque visible bounds, not the PNG canvas. */
interface GroundProfile {
  contacts: readonly (readonly [number,number])[]
  base: 'feet' | 'plinth'
  bakedShadow: boolean
}
export const WARD_ART_STANDARD = {
  projection: {horizontal:72,vertical:44}, light: {castX:10,castY:6},
  palette: {shadow:'#263d40',ambientTint:0xf5f2eb},
  // Ground contact is independent of transparent padding and the visible sprite top.
  nurseScale:94 / 185,
} as const
const feet=(contacts:GroundProfile['contacts'],bakedShadow=false):GroundProfile=>({contacts,base:'feet',bakedShadow})
const plinth=(contacts:GroundProfile['contacts'],bakedShadow=false):GroundProfile=>({contacts,base:'plinth',bakedShadow})
export const GROUND_PROFILES:Record<string,GroundProfile>={
  'elevator-core':plinth([[.05,.75],[.47,.86],[.95,.95],[.60,.77]],true),
  'stair-core':plinth([[.10,.9],[.35,.99],[.95,.65],[.68,.5]],true),
  'reference-bed-table':feet([[.06,.60],[.52,.998],[.966,.89],[.81,.69]],true),
  'reference-bed-table-empty':feet([[.06,.60],[.52,.998],[.966,.89],[.81,.69]],true),
  'reference-station':plinth([[.015,.434],[.583,.999],[.983,.526]],true),
  'concept-bed-occupied':feet([[.05,.54],[.65,.99],[.97,.79],[.41,.35]]),
  'bed-empty':feet([[.07,.63],[.57,.98],[.91,.84],[.46,.48]],true),
  'equipment-medication-cart':feet([[.10,.84],[.53,.99],[.83,.89],[.42,.73]],true),
  'furniture-bedside-cabinet':feet([[.05,.77],[.56,.99],[.96,.84],[.47,.63]]),
  'furniture-waiting-sofa':feet([[.09,.71],[.76,.98],[.94,.85],[.27,.58]],true),
  'furniture-visitor-chair':feet([[.14,.78],[.6,.99],[.88,.85],[.39,.65]],true),
  'linen-cabinet':feet([[.04,.83],[.83,.99],[.98,.89],[.19,.73]],true),
  'dispatch-counter':plinth([[.04,.75],[.75,.99],[.97,.87],[.25,.64]],true),
  'reception-desk':plinth([[.03,.7],[.62,.99],[.97,.78],[.4,.5]],true),
  'station-rear':plinth([[.04,.74],[.38,.99],[.98,.7],[.63,.48]],true),
  'station-front':plinth([[.05,.75],[.62,.99],[.94,.76],[.41,.5]],true),
  'staff-kitchenette':plinth([[.03,.64],[.72,.99],[.98,.86],[.28,.52]],true),
  'washroom-fixtures':plinth([[.13,.86],[.63,.98],[.89,.82],[.4,.7]],true),
  'decor-potted-plant':plinth([[.35,.95],[.55,.99],[.7,.93],[.5,.88]],true),
  'equipment-monitor':feet([[.15,.93],[.47,.99],[.88,.91],[.54,.83]],true),
  'equipment-iv-pole':feet([[.12,.92],[.49,.99],[.86,.92],[.51,.84]],true),
  'sanitizer-stand':plinth([[.1,.94],[.5,.99],[.9,.94],[.5,.88]],true),
  'waste-bin':plinth([[.18,.91],[.56,.99],[.87,.91],[.5,.83]],true),
  'renovation-barrier':feet([[.08,.71],[.23,.79],[.82,.99],[.97,.92]],true),
}
interface Registration {width:number;height:number;visibleBounds:{x?:number;y?:number;width:number;height?:number};groundOrigin:{x:number;y:number}}
/** One cached ground stamp per asset, shared at every display size. Never attached to image layers. */
export function objectGrounding(scene:Phaser.Scene,key:string,entry:Registration,point:GroundPoint,width:number) {
  const profile=GROUND_PROFILES[key]
  if(!profile) return null // Layered beds own their grounding; unknown art requires registration.
  const texture=`ground-contact-ivory-v2-${key}`
  if(!scene.textures.exists(texture)) {
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192
    const ctx=canvas.getContext('2d')!, bounds=entry.visibleBounds
    // A short, faint reflection belongs to the polished floor beneath the object.
    // Bake it with the existing contact stamp, preserving one draw per prop.
    const source=scene.textures.get(key).getSourceImage()
    if(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
      const reflection=document.createElement('canvas');reflection.width=256;reflection.height=192
      const r=reflection.getContext('2d')!, scale=100/bounds.width
      r.save();r.translate(128,130);r.scale(scale,-scale*.22)
      r.globalAlpha=.09;r.drawImage(source,-entry.groundOrigin.x*entry.width,-entry.groundOrigin.y*entry.height)
      r.restore();r.globalCompositeOperation='destination-in'
      const fade=r.createLinearGradient(0,127,0,170)
      fade.addColorStop(0,'rgba(255,255,255,1)');fade.addColorStop(1,'rgba(255,255,255,0)')
      r.fillStyle=fade;r.fillRect(0,127,256,65)
      r.clearRect(0,0,256,127)
      ctx.drawImage(reflection,0,0)
    }
    const contacts=profile.contacts.map(([u,v])=>({
      x:128+((bounds.x??0)+u*bounds.width-entry.groundOrigin.x*entry.width)/bounds.width*100,
      y:128+((bounds.y??0)+v*(bounds.height??entry.height)-entry.groundOrigin.y*entry.height)/bounds.width*100,
    }))
    const outline=(dx:number,dy:number)=>{ctx.beginPath();contacts.forEach((p,i)=>i?ctx.lineTo(p.x+dx,p.y+dy):ctx.moveTo(p.x+dx,p.y+dy));ctx.closePath()}
    // Existing baked cast shadows are preserved; add only restrained local contact.
    if(!profile.bakedShadow) {
      ctx.fillStyle='rgba(38,61,64,.075)';ctx.shadowBlur=5;ctx.shadowColor='rgba(38,61,64,.12)'
      outline(WARD_ART_STANDARD.light.castX,WARD_ART_STANDARD.light.castY);ctx.fill();ctx.shadowBlur=0
    }
    ctx.fillStyle=profile.bakedShadow?'rgba(38,61,64,.045)':'rgba(38,61,64,.09)'
    outline(0,0);ctx.fill()
    for(let i=0;i<contacts.length;i++) {
      const p=contacts[i]
      if(profile.base==='plinth') {
        const q=contacts[(i+1)%contacts.length];ctx.strokeStyle='rgba(38,61,64,.17)';ctx.lineWidth=1.4
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()
      } else {
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,4)
        g.addColorStop(0,'rgba(30,46,47,.28)');g.addColorStop(1,'rgba(30,46,47,0)')
        ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p.x,p.y,4,2.1,0,0,Math.PI*2);ctx.fill()
      }
    }
    scene.textures.addCanvas(texture,canvas)
  }
  const at=projectGround(point)
  return scene.add.image(at.x,at.y,texture).setOrigin(.5,128/192).setScale(width/100).setDepth(-.45)
}
