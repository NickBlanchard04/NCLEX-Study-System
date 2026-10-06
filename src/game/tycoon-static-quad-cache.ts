import type Phaser from 'phaser'

type Context = Phaser.Renderer.WebGL.DrawingContext
type Matrix = Phaser.GameObjects.Components.TransformMatrix
type Render = (renderer: Phaser.Renderer.WebGL.WebGLRenderer, image: Phaser.GameObjects.Image, context: Context, parent?: Matrix) => void
type Options = Phaser.Types.Renderer.WebGL.RenderNodes.BatchHandlerQuadRenderOptions

/** Cache immutable wall UVs and material settings, then submit the same cropped
 * quad through Phaser's batcher. Keep every original strip and its exact depth:
 * camera motion changes only its affine projection, not wall texture/material
 * discovery. Canvas and unsupported/custom render configurations stay native. */
export function cacheStaticWallQuad(image: Phaser.GameObjects.Image, cropX: number, width: number, height: number) {
  if(typeof image.addRenderStep !== 'function') return
  // Local production-preview A/B checks; never change a live player's renderer.
  if(typeof location !== 'undefined' && ['127.0.0.1','localhost'].includes(location.hostname) && new URLSearchParams(location.search).has('nativeWalls')) return
  const target=image as Phaser.GameObjects.Image & {renderWebGL:Render}
  const original=target.renderWebGL
  const frame=image.frame, source=frame.source
  // Ask Phaser for UVs: its WebGL v-axis is inverted, including atlas crops.
  const crop=frame.setCropUVs({},cropX,0,width,height,false,false) as {x:number;width:number;height:number;u0:number;v0:number;u1:number;v1:number}
  cropX=crop.x;width=crop.width;height=crop.height
  const {u0,v0}=crop,uw=crop.u1-crop.u0,vh=crop.v1-crop.v0
  let options:Options | undefined
  let previousAlpha=-1,previousTint=-1,tint=0
  // Float32 matches Phaser's transform matrices and vertex buffers.
  const f=Math.fround
  const render:Render=function(renderer,src,context,parent) {
    const nodes=src.defaultRenderNodes as Record<string,Phaser.Renderer.WebGL.RenderNodes.RenderNode>
    const batch=nodes.BatchHandler as Phaser.Renderer.WebGL.RenderNodes.BatchHandlerQuad
    if(!context.camera || !source.glTexture || src.frame!==frame || source.resolution!==1 || parent || src.rotation || src.flipX || src.flipY || src.scrollFactorX!==1 || src.scrollFactorY!==1 ||
      src.originX!==0 || src.originY!==0 || src.mask || src.lighting || src.alphaTopLeft!==src.alphaBottomLeft || src.alphaTopLeft!==src.alphaTopRight || src.alphaTopLeft!==src.alphaBottomRight || src.tintTopLeft!==src.tintBottomLeft || src.tintTopLeft!==src.tintTopRight || src.tintTopLeft!==src.tintBottomRight || Object.keys(src.customRenderNodes).length || !batch?.batch) {
      original.call(src,renderer,src,context,parent);return
    }
    if(!options) {
      const submit=nodes.Submitter as Phaser.Renderer.WebGL.RenderNodes.SubmitterQuad & {_renderOptions?:Options}
      submit.setRenderOptions(src)
      if(!submit._renderOptions || submit._renderOptions.lighting) { original.call(src,renderer,src,context,parent);return }
      options={...submit._renderOptions}
    }
    const camera=context.camera,m=camera.getViewMatrix(!context.useCanvas).matrix
    const sx=f(src.scaleX),sy=f(src.scaleY),x=f(src.x),y=f(src.y)
    const a=f(m[0]*sx),b=f(m[1]*sx),c=f(m[2]*sy),d=f(m[3]*sy)
    const e=f(x*m[0]+y*m[2]+m[4]),g=f(x*m[1]+y*m[3]+m[5])
    let x0=f(cropX*a+e),y0=f(cropX*b+g),x1=f(cropX*a+height*c+e),y1=f(cropX*b+height*d+g)
    let x2=f((cropX+width)*a+e),y2=f((cropX+width)*b+g),x3=f((cropX+width)*a+height*c+e),y3=f((cropX+width)*b+height*d+g)
    if(src.willRoundVertices(camera,a===1 && b===0 && c===0 && d===1)) {
      x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1)
      x2=Math.round(x2);y2=Math.round(y2);x3=Math.round(x3);y3=Math.round(y3)
    }
    if(previousAlpha!==src.alpha || previousTint!==src.tintTopLeft) {
      previousAlpha=src.alpha;previousTint=src.tintTopLeft
      // Same integer encoding as Phaser's getTintAppendFloatAlpha.
      tint=((((src.alpha*255)|0)<<24)|(src.tintTopLeft&0xffffff))>>>0
    }
    camera.addToRenderList(src)
    batch.batch(context,source.glTexture,x0,y0,x1,y1,x2,y2,x3,y3,u0,v0,uw,vh,src.tintMode,tint,tint,tint,tint,options)
  }
  // Phaser 4 captures its initial renderer in the render-step list. Use the
  // supported step hook, rather than replacing a method the list no longer reads.
  image.addRenderStep(render as Phaser.Types.GameObjects.RenderWebGLStep,0)
}
