import {expect,it} from 'vitest'
import {cameraWorldBounds,cropIntersectsView} from '../tycoon-camera-culling'
it('uses the actual world rectangle for zoomed follow and overview cameras',()=>{
  expect(cameraWorldBounds({scrollX:100,scrollY:200,width:800,height:600,zoom:2})).toEqual({left:300,top:350,width:400,height:300})
  expect(cameraWorldBounds({scrollX:100,scrollY:200,width:800,height:600,zoom:.5})).toEqual({left:-300,top:-100,width:1600,height:1200})
})
it('culls an offscreen cropped column even when its full parent wall crosses the view',()=>{
  const view={left:100,top:100,width:400,height:300}
  expect(cropIntersectsView({left:0,top:0,width:16,height:450},view)).toBe(false)
  expect(cropIntersectsView({left:350,top:0,width:16,height:450},view)).toBe(true)
})
it('retains edge pixels and accounts for raised door lintels',()=>{
  const view={left:100,top:100,width:400,height:300}
  expect(cropIntersectsView({left:84,top:100,width:16,height:180},view)).toBe(true)
  expect(cropIntersectsView({left:120,top:450,width:16,height:70},view,304)).toBe(true)
  expect(cropIntersectsView({left:120,top:450,width:16,height:70},view)).toBe(false)
})
