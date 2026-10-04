import type { ScreenPoint } from './tycoon-care-presentation'

export const OAK_DOOR_TEXTURE = 'patient-oak-door-detail-v1'
/** Measured against the original 1254px ChatGPT elevation. Separate samples
 * allow the leaf to swing while the frame remains joined to the wall opening. */
const samples = {
  leaf: {x:369,y:78,width:522,height:1110},
  leftJamb: {x:306,y:78,width:58,height:1117},
  rightJamb: {x:898,y:78,width:48,height:1117},
  lintel: {x:306,y:20,width:640,height:54},
} as const

function sample(ctx:CanvasRenderingContext2D, art:CanvasImageSource, crop:{x:number;y:number;width:number;height:number}, a:ScreenPoint,b:ScreenPoint,low:number,high:number) {
  ctx.save()
  ctx.transform((b.x-a.x)/crop.width,(b.y-a.y)/crop.width,0,(high-low)/crop.height,a.x,a.y-high)
  ctx.drawImage(art,crop.x,crop.y,crop.width,crop.height,0,0,crop.width,crop.height)
  ctx.restore()
}

export function paintOakDoorLeaf(ctx:CanvasRenderingContext2D, art:CanvasImageSource,a:ScreenPoint,b:ScreenPoint) {
  sample(ctx,art,samples.leaf,a,b,0,156)
}

export function paintOakDoorFrame(ctx:CanvasRenderingContext2D, art:CanvasImageSource,a:ScreenPoint,b:ScreenPoint,number:string) {
  // Jambs stay vertical and sit outside the clear opening, in both orientations.
  sample(ctx,art,samples.leftJamb,{x:a.x-7,y:a.y},{x:a.x,y:a.y},0,162)
  sample(ctx,art,samples.rightJamb,{x:b.x,y:b.y},{x:b.x+7,y:b.y},0,162)
  sample(ctx,art,samples.lintel,a,b,156,164)
  ctx.strokeStyle='#e6e7df';ctx.lineWidth=2
  ctx.beginPath();ctx.moveTo(a.x,a.y+1);ctx.lineTo(b.x,b.y+1);ctx.stroke()
  // Small wall plaque sits beyond the jamb, matching reference #1's navy/oak sign.
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),direction=dx<0?-1:1
  const x=a.x-dx/length*30,y=a.y-dy/length*30-104
  ctx.save();ctx.translate(x,y);ctx.transform(direction,dy/Math.abs(dx),0,1,0,0)
  ctx.fillStyle='#b99767';ctx.fillRect(-18,-14,36,27)
  ctx.fillStyle='#344b60';ctx.fillRect(-17,-13,34,22)
  // Reverse the text transform so numerals remain readable on either wall plane.
  ctx.scale(direction,1)
  ctx.fillStyle='#f5f3eb';ctx.font='600 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.fillText(number,0,-2)
  ctx.restore()
}
