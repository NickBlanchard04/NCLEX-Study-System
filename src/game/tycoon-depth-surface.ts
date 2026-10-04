import Phaser from 'phaser'
import type { ScreenPoint } from './tycoon-care-presentation'
import { surfaceDepthAtX } from './tycoon-depth-order'
import { architectureFrame, cachedArchitectureFrame } from './tycoon-architecture-atlas'

class SortedSurface extends Phaser.GameObjects.Image {
  slices:Phaser.GameObjects.Image[]=[]
  setAlpha(value=1) {
    if(this.alpha===value)return this
    super.setAlpha(value)
    this.slices?.forEach(slice=>slice.setAlpha(value))
    return this
  }
  setY(value=0) {
    const change=value-this.y
    super.setY(value)
    this.slices?.forEach(slice=>slice.setY(slice.y+change))
    return this
  }
}

/** Cached columns share one texture/batch, but interleave with characters at
 * their local ground depth. Keep a root Image for alpha/metadata compatibility. */
export function depthSortedSurface(scene:Phaser.Scene,key:string,left:number,top:number,a:ScreenPoint,b:ScreenPoint,bias=0) {
  const cached=cachedArchitectureFrame(scene,key)
  const source=cached?scene.textures.getFrame(cached.key,cached.frame):scene.textures.get(key).getSourceImage()
  const width=source.width,height=source.height
  const atlas=architectureFrame(scene,key)
  const root=new SortedSurface(scene,left,top,atlas.key,atlas.frame).setOrigin(0)
  scene.add.existing(root)
  for(let x=0;x<width;) {
    // All surfaces share world-column boundaries. Independent texture grids
    // let a neighboring wall column sort over part of a door jamb.
    const column=Math.floor((left+x+.001)/16)
    const span=Math.min((column+1)*16-(left+x),width-x)
    const slice=x===0?root:scene.add.image(left,top,atlas.key,atlas.frame).setOrigin(0)
    slice.setCrop(x,0,span,height).setDepth(surfaceDepthAtX(a,b,(column+.5)*16,bias))
    slice.setData('wardCullBounds',{left:left+x,top,width:span,height})
    if(slice!==root)root.slices.push(slice)
    x+=span
  }
  // Destroy peer columns when the root is removed during a ward rebuild.
  root.once(Phaser.GameObjects.Events.DESTROY,()=>root.slices.forEach(slice=>{if(slice.scene)slice.destroy()}))
  return root
}
