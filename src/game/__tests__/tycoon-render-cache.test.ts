import { expect,it } from 'vitest'
import { setDepthIfChanged } from '../tycoon-render-cache'
it('does not queue scene sorting for an unchanged actor depth',()=>{
  const changes:number[]=[]
  const actor={depth:100,setDepth(value:number){this.depth=value;changes.push(value)}}
  for(let i=0;i<60;i++) setDepthIfChanged(actor,100)
  expect(changes).toEqual([])
  setDepthIfChanged(actor,101);setDepthIfChanged(actor,101)
  expect(changes).toEqual([101])
})
