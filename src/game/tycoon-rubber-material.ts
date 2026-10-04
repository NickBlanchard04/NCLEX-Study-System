/** Shared matte rubber grain, generated once and baked into each floor surface. */
let grain:HTMLCanvasElement | undefined
export function rubberPattern(ctx:CanvasRenderingContext2D) {
  if(!grain) {
    grain=document.createElement('canvas');grain.width=256;grain.height=256
    const g=grain.getContext('2d')!;g.fillStyle='#cec9bd';g.fillRect(0,0,256,256)
    let seed=2919
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
    for(let i=0;i<18000;i++) {
      g.fillStyle=i%3?'rgba(83,77,65,.045)':'rgba(255,252,241,.16)'
      g.fillRect(random()*256,random()*256,.4+random()*.65,.4+random()*.65)
    }
  }
  return ctx.createPattern(grain,'repeat')!
}
