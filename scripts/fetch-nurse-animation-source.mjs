import fs from 'node:fs/promises'
import path from 'node:path'

// Public CC0 source packs. No account, payment or private credentials required.
const root=path.resolve('tools/nurse-animation/source')
await fs.mkdir(root,{recursive:true})
for(const slug of ['universal-base-characters','universal-animation-library']) {
  const origin=`https://quaternius.itch.io/${slug}`
  const response=await fetch(origin)
  if(!response.ok)throw new Error(`${origin}: ${response.status}`)
  const html=await response.text()
  const csrf=html.match(/name="csrf_token" value="([^"]+)"/)?.[1]
  const cookie=response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')
  const download=await fetch(`${origin}/download_url`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',cookie,referer:origin},body:new URLSearchParams({csrf_token:csrf}).toString()})
  const result=await download.json()
  if(!result.url)throw new Error(JSON.stringify(result))
  const listing=await fetch(result.url,{headers:{cookie}})
  const files=await listing.text()
  const fileToken=files.match(/name="csrf_token" value="([^"]+)"/)?.[1]
  const fileCookie=[cookie,...listing.headers.getSetCookie().map(x=>x.split(';')[0])].join('; ')
  const upload=files.match(/data-upload_id="(\d+)"/)?.[1]
  const fileResponse=await fetch(`${origin}/file/${upload}?source=game_download`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',cookie:fileCookie,referer:result.url},body:new URLSearchParams({csrf_token:fileToken}).toString()})
  const file=await fileResponse.json()
  if(!file.url)throw new Error('Source download did not return a file URL')
  const archive=await fetch(file.url)
  if(!archive.ok)throw new Error(`Archive: ${archive.status}`)
  const buffer=Buffer.from(await archive.arrayBuffer())
  await fs.writeFile(path.join(root,`${slug}.zip`),buffer)
  console.log(slug,`${buffer.length} bytes saved`)
}
