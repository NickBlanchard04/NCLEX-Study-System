import { rubberPattern } from './tycoon-rubber-material'
import type Phaser from 'phaser'
import { HOSPITAL_MAP, rectCorners } from './tycoon-map-config'
import { projectGround, type GroundPoint } from './tycoon-care-presentation'
import { bakeWardDaylight, WARD_FLOOR_REPEAT } from './tycoon-ward-lighting'

/** Shared world-space material: all floors sample the same tile origin and scale. */
export function fillWarmWardFloor(ctx: CanvasRenderingContext2D, scene: Phaser.Scene) {
  const art = scene.textures.get('concept-warm-floor').getSourceImage()
  if (!(art instanceof HTMLImageElement || art instanceof HTMLCanvasElement)) return
  ctx.save()
  ctx.transform(72, 44, -72, 44, 600, 80)
  const pattern = ctx.createPattern(art, 'repeat')!
  pattern.setTransform(new DOMMatrix().scale(WARD_FLOOR_REPEAT))
  ctx.fillStyle = pattern
  const bounds = HOSPITAL_MAP.building
  ctx.fillRect(bounds.minU, bounds.minV, bounds.maxU-bounds.minU, bounds.maxV-bounds.minV)
  bakeWardDaylight(ctx, bounds)
  ctx.restore()
}

/** Thin texture strips follow the wall baseline, allowing correct foreground occlusion. */
export function drawRegisteredWall(scene: Phaser.Scene, key: string, entry: {width:number;height:number;footprint?:{baseLine:[number,number][]}}, from: GroundPoint, to: GroundPoint) {
  const line=entry.footprint?.baseLine
  if(!line) return
  const a=projectGround(from), b=projectGround(to)
  const sx=(b.x-a.x)/(line[1][0]-line[0][0]), sy=(b.y-a.y)/(line[1][1]-line[0][1])
  const start=Math.max(0,Math.min(line[0][0],line[1][0])-8)
  const end=Math.min(entry.width,Math.max(line[0][0],line[1][0])+8)
  const step=Math.max(1,Math.floor(24/Math.abs(sx)))
  for(let x=start;x<end;x+=step) {
    const width=Math.min(step,end-x)
    const t=Math.max(0,Math.min(1,(x+width/2-line[0][0])/(line[1][0]-line[0][0])))
    scene.add.image(a.x-line[0][0]*sx,a.y-line[0][1]*sy,key).setOrigin(0).setScale(sx,sy)
      .setCrop(x,0,width,entry.height).setDepth(a.y+(b.y-a.y)*t-.5)
  }
}

/** Bake the union once: overlapping corridor rectangles must not double tint or grid. */
export function drawCorridorFloor(scene: Phaser.Scene) {
  const points=HOSPITAL_MAP.corridors.flatMap(c=>rectCorners(c).map(projectGround))
  const left=Math.floor(Math.min(...points.map(p=>p.x))), top=Math.floor(Math.min(...points.map(p=>p.y)))
  const key='compact-continuous-corridor-warm-ward'
  if(!scene.textures.exists(key)) {
    const canvas=document.createElement('canvas')
    canvas.width=Math.ceil(Math.max(...points.map(p=>p.x))-left)+1
    canvas.height=Math.ceil(Math.max(...points.map(p=>p.y))-top)+1
    const ctx=canvas.getContext('2d')!
    ctx.translate(-left,-top);ctx.beginPath()
    for(const c of HOSPITAL_MAP.corridors) {
      rectCorners(c).map(projectGround).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()
    }
    ctx.clip();ctx.fillStyle=rubberPattern(ctx);ctx.fillRect(left,top,canvas.width,canvas.height)
    // One continuous material covers every corridor, aligned to all six rooms.
    fillWarmWardFloor(ctx, scene)
    scene.textures.addCanvas(key,canvas)
  }
  scene.add.image(left,top,key).setOrigin(0).setDepth(-4).setTint(0xe5e3e6)
}
