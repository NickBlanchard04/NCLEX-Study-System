import { describe, expect, it } from 'vitest'
import { repairDepthOrder } from '../tycoon-depth-sort'

describe('ward depth ordering', () => {
  it('keeps wall ties stable when actors cross them in either direction', () => {
    const items=Array.from({length:2400},(_,id)=>({id,depth:Math.floor(id/3)}))
    for(const [index,depth] of [[3,720],[1800,20],[1500,400],[2300,20]])items[index].depth=depth
    const expected=[...items].sort((a,b)=>a.depth-b.depth)
    repairDepthOrder(items,()=>items.sort((a,b)=>a.depth-b.depth))
    expect(items).toEqual(expected)
    expect(new Set(items).size).toBe(2400)
  })
  it('falls back safely for a rebuilt scene without dropping or duplicating objects', () => {
    const items=Array.from({length:1000},(_,id)=>({id,depth:999-id}))
    const expected=[...items].sort((a,b)=>a.depth-b.depth)
    let rebuilt=false
    repairDepthOrder(items,()=>{rebuilt=true;items.sort((a,b)=>a.depth-b.depth)})
    expect(rebuilt).toBe(true)
    expect(items).toEqual(expected)
  })
})
