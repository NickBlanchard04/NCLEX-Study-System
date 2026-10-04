import {afterEach,expect,it,vi} from 'vitest'
import type Phaser from 'phaser'
import {architectureFrame,cachedArchitectureFrame,flushArchitectureAtlas} from '../tycoon-architecture-atlas'

afterEach(()=>vi.unstubAllGlobals())
function setup(){
  const draws:unknown[][]=[],uploads=vi.fn(),textures=new Map<string,unknown>()
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:(...args:unknown[])=>draws.push(args)})})})
  const source=(key:string,width:number,height:number)=>{const image={width,height};textures.set(key,{getSourceImage:()=>image});return image}
  const scene={textures:{
    get:(key:string)=>textures.get(key),exists:(key:string)=>textures.has(key),remove:(key:string)=>textures.delete(key),
    create:(key:string)=>{const frames=new Map();const texture={key,source:[{update:uploads}],add:(name:string,_source:number,x:number,y:number,w:number,h:number)=>frames.set(name,{x,y,w,h}),frames};textures.set(key,texture);return texture},
  }} as unknown as Phaser.Scene
  return {scene,source,draws,uploads,textures}
}
it('copies the complete source at native resolution and reuses it without another upload',()=>{
  const {scene,source,draws,uploads}=setup(),original=source('wall',450,330)
  const entry=architectureFrame(scene,'wall')
  expect(draws).toEqual([[original,2,2]]) // No downsampling or changed crop.
  expect(architectureFrame(scene,'wall')).toEqual(entry)
  flushArchitectureAtlas(scene);flushArchitectureAtlas(scene)
  expect(uploads).toHaveBeenCalledTimes(1)
})
it('releases source textures but retains atlas frames across ward rebuilds',()=>{
  const {scene,source,textures}=setup();source('door',150,220);source('patient-bed',900,900)
  const entry=architectureFrame(scene,'door');flushArchitectureAtlas(scene)
  expect(textures.has('door')).toBe(false)
  expect(textures.has('patient-bed')).toBe(true)
  expect(cachedArchitectureFrame(scene,'door')).toEqual(entry)
  expect(architectureFrame(scene,'door')).toEqual(entry)
})
it('starts a fresh page when a row would overflow and retains oversized sources',()=>{
  const {scene,source,draws,textures}=setup();source('wall-a',1800,1500);source('wall-b',1800,800);source('very-long-wall',2400,200)
  const a=architectureFrame(scene,'wall-a'),b=architectureFrame(scene,'wall-b')
  expect(a.key).not.toEqual(b.key)
  expect(draws.map(d=>d.slice(1))).toEqual([[2,2],[2,2]])
  expect(architectureFrame(scene,'very-long-wall')).toEqual({key:'very-long-wall',frame:'__BASE'})
  flushArchitectureAtlas(scene);expect(textures.has('very-long-wall')).toBe(true)
})
