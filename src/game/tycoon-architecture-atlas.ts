import type Phaser from 'phaser'

const PAGE_SIZE = 2048
interface Page { texture: Phaser.Textures.Texture; context:CanvasRenderingContext2D; x:number; y:number; rowHeight:number; dirty:boolean }
interface Entry { key:string; frame:string }
const stores=new WeakMap<Phaser.Scene,{pages:Page[];entries:Map<string,Entry>}>()
export function cachedArchitectureFrame(scene:Phaser.Scene,key:string) {return stores.get(scene)?.entries.get(key)}

/** Lossless copies of cached architectural canvases share GPU texture pages.
 * Depth-sorted columns and their original alpha/crop geometry remain intact. */
export function architectureFrame(scene:Phaser.Scene,key:string):Entry {
  let store=stores.get(scene)
  if(!store){store={pages:[],entries:new Map()};stores.set(scene,store)}
  const existing=store.entries.get(key);if(existing)return existing
  const source=scene.textures.get(key).getSourceImage() as HTMLCanvasElement
  if(source.width+4>PAGE_SIZE||source.height+4>PAGE_SIZE)return {key,frame:'__BASE'}
  let page=store.pages.at(-1)
  if(page&&page.x+source.width+4>PAGE_SIZE){page.x=2;page.y+=page.rowHeight;page.rowHeight=0}
  if(!page||page.y+source.height+2>PAGE_SIZE){
    const textureKey=`ward-architecture-page-${store.pages.length}`
    const canvas=document.createElement('canvas');canvas.width=PAGE_SIZE;canvas.height=PAGE_SIZE
    // A plain Texture avoids CanvasTexture's unused full-page CPU pixel readback.
    const texture=scene.textures.create(textureKey,canvas)!
    texture.add('__BASE',0,0,0,PAGE_SIZE,PAGE_SIZE)
    page={texture,context:canvas.getContext('2d')!,x:2,y:2,rowHeight:0,dirty:false};store.pages.push(page)
  }
  page.context.drawImage(source,page.x,page.y)
  page.texture.add(key,0,page.x,page.y,source.width,source.height)
  const result={key:page.texture.key,frame:key};store.entries.set(key,result)
  page.x+=source.width+4;page.rowHeight=Math.max(page.rowHeight,source.height+4);page.dirty=true
  return result
}

/** Upload once after construction, never while walking or animating. */
export function flushArchitectureAtlas(scene:Phaser.Scene) {
  const store=stores.get(scene)
  for(const page of store?.pages??[])if(page.dirty){page.texture.source[0].update();page.dirty=false}
  // Every wall now references the shared atlas; drop duplicate source GPU/CPU textures.
  for(const key of store?.entries.keys()??[])if(scene.textures.exists(key))scene.textures.remove(key)
}
