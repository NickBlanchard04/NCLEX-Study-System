import type Phaser from 'phaser'
import { HOSPITAL_MAP, rectCorners } from './tycoon-map-config'
import { projectGround, type GroundPoint, type ScreenPoint } from './tycoon-care-presentation'
import { depthSortedSurface } from './tycoon-depth-surface'
import { cachedArchitectureFrame } from './tycoon-architecture-atlas'

/** Static architectural faces are cached textures, rather than dozens of cropped
 * sprites per wall. Only the near-side walls are cut down for play visibility. */
export function buildingWall(scene: Phaser.Scene, id: string, from: GroundPoint, to: GroundPoint, height = 140, windows = false) {
  const a = projectGround(from), b = projectGround(to)
  const left = Math.floor(Math.min(a.x,b.x)-10), top = Math.floor(Math.min(a.y,b.y)-height-8)
  const key = `building-studio-v6-${id}-${height}-${windows}`
  if (!scene.textures.exists(key) && !cachedArchitectureFrame(scene,key)) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(Math.abs(a.x-b.x))+22
    canvas.height = Math.ceil(Math.abs(a.y-b.y))+height+20
    const c = canvas.getContext('2d')!
    c.translate(-left,-top)
    const face = (low:number, high:number, color:string, inset=0) => {
      const dx=b.x-a.x,dy=b.y-a.y
      c.beginPath();c.moveTo(a.x+dx*inset,a.y+dy*inset-low)
      c.lineTo(b.x-dx*inset,b.y-dy*inset-low);c.lineTo(b.x-dx*inset,b.y-dy*inset-high)
      c.lineTo(a.x+dx*inset,a.y+dy*inset-high);c.closePath();c.fillStyle=color;c.fill()
    }
    face(0,height,from.u===to.u?'#d1c9b8':'#e4ddcb')
    c.save()
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(b.x,b.y-height);c.lineTo(a.x,a.y-height);c.closePath();c.clip()
    const light=c.createLinearGradient(0,top,0,top+canvas.height)
    light.addColorStop(0,'rgba(255,250,233,.27)');light.addColorStop(.65,'rgba(111,99,77,.03)');light.addColorStop(1,'rgba(73,63,48,.16)')
    c.fillStyle=light;c.fillRect(left,top,canvas.width,canvas.height)
    for(let x=left;x<left+canvas.width;x+=5) for(let y=top;y<top+canvas.height;y+=5) {
      c.fillStyle=((x*17+y*31)&8)?'rgba(255,248,226,.035)':'rgba(82,75,60,.025)';c.fillRect(x,y,2,1)
    }
    c.restore()
    face(0,12,'#8f938e');face(12,42,'#344c5c');face(42,46,'#b4b7af')
    face(height-6,height,'#f2ecdf')
    if(windows) {
      face(57,height-21,'#aa9170',.12)
      face(62,height-26,'#e9e6da',.14)
      face(66,height-30,'#99b5bc',.16)
      face(70,height-34,'#c3d3cf',.18)
      const x=(a.x+b.x)/2,y=(a.y+b.y)/2
      c.strokeStyle='#f3f0e5';c.lineWidth=5;c.beginPath();c.moveTo(x,y-64);c.lineTo(x,y-height+27);c.stroke()
      face(57,62,'#f5edda',.10)
    }
    c.strokeStyle='#b7b1a3';c.lineWidth=2;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(a.x,a.y-height);c.stroke()
    // The wall is a prism: its cap and end face have the same measured thickness.
    const offset=projectGround(from.u===to.u?{u:from.u+.12,v:from.v}:{u:from.u,v:from.v+.12})
    const ox=offset.x-a.x,oy=offset.y-a.y
    c.beginPath();c.moveTo(a.x,a.y-height);c.lineTo(b.x,b.y-height);c.lineTo(b.x+ox,b.y+oy-height);c.lineTo(a.x+ox,a.y+oy-height);c.closePath();c.fillStyle='#f4eee1';c.fill();c.strokeStyle='#b8b0a0';c.lineWidth=.6;c.stroke()
    c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x+ox,b.y+oy);c.lineTo(b.x+ox,b.y+oy-height);c.lineTo(b.x,b.y-height);c.closePath();c.fillStyle='#b9b1a0';c.fill()
    scene.textures.addCanvas(key,canvas)
  }
  return depthSortedSurface(scene,key,left,top,a,b,-1)
}

export function drawBuildingExterior(scene: Phaser.Scene) {
  const b=HOSPITAL_MAP.building
  const exterior={minU:b.minU-1.2,maxU:b.maxU+1.2,minV:b.minV-1.2,maxV:b.maxV+1.2}
  const points=rectCorners(exterior).map(projectGround)
  const left=Math.floor(Math.min(...points.map(p=>p.x))),top=Math.floor(Math.min(...points.map(p=>p.y)))
  const key='building-v5-exterior'
  if(!scene.textures.exists(key)) {
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(Math.max(...points.map(p=>p.x))-left)+1;canvas.height=Math.ceil(Math.max(...points.map(p=>p.y))-top)+1
    const c=canvas.getContext('2d')!;c.translate(-left,-top)
    const poly=(p:ScreenPoint[],color:string)=>{c.beginPath();p.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.fillStyle=color;c.fill()}
    poly(points,'#878d79')
    const pavement=rectCorners({minU:b.minU-.85,maxU:b.maxU+.85,minV:b.minV-.85,maxV:b.maxV+.85}).map(projectGround)
    poly(pavement,'#bbb9ab')
    c.save();c.beginPath();pavement.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.clip()
    c.strokeStyle='#a6a697';c.lineWidth=1
    for(let u=-2;u<24;u+=.65){const a=projectGround({u,v:-8}),z=projectGround({u,v:23});c.beginPath();c.moveTo(a.x,a.y);c.lineTo(z.x,z.y);c.stroke()}
    for(let v=-8;v<23;v+=.65){const a=projectGround({u:-2,v}),z=projectGround({u:24,v});c.beginPath();c.moveTo(a.x,a.y);c.lineTo(z.x,z.y);c.stroke()}
    c.restore()
    poly(rectCorners(b).map(projectGround).map(q=>({x:q.x+22,y:q.y+28})),'#797e70')
    scene.textures.addCanvas(key,canvas)
  }
  scene.add.image(left,top,key).setOrigin(0).setDepth(-2004)
  for(let u=b.minU;u<b.maxU;u+=3.6) buildingWall(scene,`rear-${u}`,{u,v:b.minV},{u:Math.min(u+3.6,b.maxU),v:b.minV},176,true)
  for(let v=b.minV;v<b.maxV;v+=3.8) buildingWall(scene,`side-${v}`,{u:b.minU,v},{u:b.minU,v:Math.min(v+3.8,b.maxV)},176,true)
  for(const [id,from,to] of [
    ['east-exterior',{u:b.maxU,v:b.minV},{u:b.maxU,v:b.maxV}],
    ['front-left',{u:b.minU,v:b.maxV},{u:9.6,v:b.maxV}],
    ['front-right',{u:12.2,v:b.maxV},{u:b.maxU,v:b.maxV}],
  ] as const) {
    buildingWall(scene,id,from,to,176,true).setAlpha(.28)
    buildingWall(scene,`${id}-dado`,from,to,66)
  }
}
