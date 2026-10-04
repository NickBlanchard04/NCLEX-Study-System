import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
// Production preview, isolated browser save; never touches the user's profile.
const browser=await chromium.launch({headless:process.env.HEADED!=='1',channel:process.env.BROWSER_CHANNEL||'msedge'})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>{
  window.tycoonRenderSample={draws:0,frames:0}
  for(const type of [WebGLRenderingContext,WebGL2RenderingContext])for(const method of ['drawElements','drawArrays']){
    const original=type.prototype[method]
    type.prototype[method]=function(...args){window.tycoonRenderSample.draws++;return original.apply(this,args)}
  }
  const tick=()=>{window.tycoonRenderSample.frames++;requestAnimationFrame(tick)};requestAnimationFrame(tick)
})
try {
  await page.goto(process.env.TYCOON_URL||'http://127.0.0.1:4175/nurse-tycoon/')
  await page.getByRole('button',{name:'Play Fundamentals Clinic',exact:true}).click()
  await page.getByRole('button',{name:'Begin rounds',exact:true}).click()
  const host=page.locator('.tycoon-hospital-canvas')
  await host.locator('canvas').waitFor()
  await page.evaluate(()=>{
    const save=JSON.parse(localStorage.getItem('nclex-study-system'))
    save.state.tycoon.upgrades={...save.state.tycoon.upgrades,'staff-training':1,'lab-runner':1}
    localStorage.setItem('nclex-study-system',JSON.stringify(save))
  })
  await page.reload();await host.locator('canvas').waitFor();await page.waitForTimeout(3000)
  const cdp=process.env.PROFILE_PATH?await page.context().newCDPSession(page):null
  if(cdp){await cdp.send('Profiler.enable');await cdp.send('Profiler.start')}
  const sample=async name=>{
    const before=await page.evaluate(()=>({...window.tycoonRenderSample}))
    const timing=await page.evaluate(()=>new Promise(resolve=>{
      const intervals=[];let prior=performance.now();const start=prior
      function tick(now){intervals.push(now-prior);prior=now;if(now-start<6000)requestAnimationFrame(tick);else{intervals.sort((a,b)=>a-b);resolve({rafMeanMs:intervals.reduce((a,b)=>a+b,0)/intervals.length,rafP95Ms:intervals[Math.floor(intervals.length*.95)]})}}requestAnimationFrame(tick)
    }))
    const after=await page.evaluate(()=>({...window.tycoonRenderSample}))
    return {name,...timing,drawCallsPerFrame:(after.draws-before.draws)/(after.frames-before.frames),...await host.evaluate(e=>({sceneUpdateFps:Number(e.dataset.renderFps),objects:Number(e.dataset.renderObjects),vectorObjects:Number(e.dataset.vectorObjects),nurses:Number(e.dataset.nurseCount)}))}
  }
  const samples=[await sample('overview-idle')]
  await page.getByRole('button',{name:'Follow nurse',exact:true}).click()
  await page.getByRole('button',{name:'Room 103',exact:true}).click()
  await page.locator('#tycoon-command-panel').getByRole('button',{name:'Assess patient',exact:true}).click()
  samples.push(await sample('follow-route'))
  if(cdp){const {profile}=await cdp.send('Profiler.stop');await writeFile(process.env.PROFILE_PATH,JSON.stringify(profile))}
  console.log(JSON.stringify({browser:process.env.BROWSER_CHANNEL||'msedge',headless:process.env.HEADED!=='1',viewport:{width:1440,height:900},samples,errors,note:'rAF intervals are browser callbacks, not displayed FPS. Use headed runs on target hardware for release acceptance.'},null,2))
  if(errors.length) process.exitCode=1
} finally {await browser.close()}
