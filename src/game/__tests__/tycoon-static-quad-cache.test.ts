import { afterEach, expect, it, vi } from 'vitest'
import type Phaser from 'phaser'
import { cacheStaticWallQuad } from '../tycoon-static-quad-cache'

afterEach(()=>vi.unstubAllGlobals())
function fixture() {
  vi.stubGlobal('location',{hostname:'test.invalid',search:''})
  const batch=vi.fn(),native=vi.fn(),add=vi.fn()
  const matrix=new Float32Array([1,0,0,1,-20,-30])
  const context={camera:{getViewMatrix:()=>({matrix}),addToRenderList:add},useCanvas:false}
  const image={x:100,y:200,scaleX:1,scaleY:1,rotation:0,flipX:false,flipY:false,scrollFactorX:1,scrollFactorY:1,
    originX:0,originY:0,alpha:1,tintMode:0,tintTopLeft:0xffffff,tintBottomLeft:0xffffff,tintTopRight:0xffffff,tintBottomRight:0xffffff,
    frame:{cutX:16,cutY:32,source:{width:2048,height:2048,resolution:1,glTexture:{}},
      setCropUVs:(_crop:object,x:number,_y:number,width:number,height:number)=>({x,width,height,u0:(16+x)/2048,v0:1-32/2048,u1:(16+x+width)/2048,v1:1-(32+height)/2048})},customRenderNodes:{},
    defaultRenderNodes:{BatchHandler:{batch},Submitter:{setRenderOptions:vi.fn(),_renderOptions:{multiTexturing:true,lighting:null,smoothPixelArt:null}}},
    willRoundVertices:()=>false,renderWebGL:native,addRenderStep:(render:unknown)=>{image.renderWebGL=render as (...args:unknown[])=>void}} as unknown as Phaser.GameObjects.Image & {renderWebGL: (...args:unknown[])=>void}
  cacheStaticWallQuad(image,8,16,100)
  const render=()=>image.renderWebGL({},image,context)
  return {image,context,matrix,batch,native,add,render}
}
it('retains crop UVs and depth order while camera scroll, zoom, wall height, and alpha change',()=>{
  const {image,matrix,batch,native,add,render}=fixture()
  render()
  expect(batch.mock.calls[0].slice(2,10)).toEqual([88,170,88,270,104,170,104,270])
  expect(batch.mock.calls[0].slice(10,14)).toEqual([24/2048,1-32/2048,16/2048,-100/2048])
  matrix.set([.5,0,0,.5,-10,-15]);image.y=220;image.alpha=.35
  render()
  expect(batch.mock.calls[1].slice(2,10)).toEqual([44,95,44,145,52,95,52,145])
  expect(batch.mock.calls[1][15]>>>0).toBe(0x59ffffff)
  expect(add).toHaveBeenNthCalledWith(2,image)
  expect(native).not.toHaveBeenCalled()
})
it('uses the native renderer for unsupported transforms or textured lighting',()=>{
  const {image,native,render,batch}=fixture()
  image.flipX=true;render()
  expect(native).toHaveBeenCalledTimes(1);expect(batch).not.toHaveBeenCalled()
  image.flipX=false
  const nodes=image.defaultRenderNodes as {Submitter:{_renderOptions:{lighting:unknown}}}
  nodes.Submitter._renderOptions.lighting={normalGLTexture:{}};render()
  expect(native).toHaveBeenCalledTimes(2)
})
