import { chromium } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'
const browser = await chromium.launch({channel:'msedge',headless:true})
try {
  const page=await browser.newPage()
  await page.goto('http://127.0.0.1:5173/tools/nurse-animation/index.html')
  await page.waitForFunction(()=>!!window.nurseBake)
  const result=await page.evaluate(()=>window.nurseBake.bake())
  const clipped=Object.entries(result.atlas.frames).filter(([,f])=>f.spriteSourceSize.x===0||f.spriteSourceSize.y===0||f.spriteSourceSize.x+f.spriteSourceSize.w>=220||f.spriteSourceSize.y+f.spriteSourceSize.h>=233).map(([name])=>name)
  console.log(JSON.stringify({frames:Object.keys(result.atlas.frames).length,texture:result.atlas.meta.size,clipped}))
  if(clipped.length)throw new Error('Increase camera bounds before adopting clipped poses')
  const folder=new URL('../public/game-assets/hospital-prototype/',import.meta.url)
  await mkdir(folder,{recursive:true})
  await writeFile(new URL('rigged-nurse-sheet.png',folder),Buffer.from(result.png.split(',')[1],'base64'))
  for(const key of ['atlas','pivots','diagnostics'])await writeFile(new URL(`rigged-nurse-${key}.json`,folder),JSON.stringify(result[key],null,2)+'\n')
} finally {await browser.close()}

