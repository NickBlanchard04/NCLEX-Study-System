import type Phaser from 'phaser'

/** Static decoration is rasterized once, then uses Phaser's sprite batch each frame. */
export function cachedSurface(scene:Phaser.Scene,key:string,width:number,height:number,paint:(ctx:CanvasRenderingContext2D)=>void) {
  if(!scene.textures.exists(key)) {
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(width));canvas.height=Math.max(1,Math.ceil(height))
    paint(canvas.getContext('2d')!);scene.textures.addCanvas(key,canvas)
  }
  return scene.add.image(0,0,key).setOrigin(0)
}
/** Phaser queues a full display-list sort even when setDepth repeats the current value. */
export function setDepthIfChanged<T extends {depth:number;setDepth(depth:number):unknown}>(object:T,depth:number):T {
  if(object.depth!==depth) object.setDepth(depth)
  return object
}
// Ambient actors are movement, not UI: present them on every available frame.
export const WARD_RENDER_BUDGET = {uiMs:100,routeMs:50,ambientMs:0} as const
