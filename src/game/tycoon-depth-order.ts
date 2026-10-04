import type { ScreenPoint } from './tycoon-care-presentation'

/** A sloped architectural baseline cannot use its far endpoint as one depth. */
export function surfaceDepthAtX(a:ScreenPoint,b:ScreenPoint,x:number,bias=0) {
  const t=Math.abs(b.x-a.x)<.001?.5:Math.max(0,Math.min(1,(x-a.x)/(b.x-a.x)))
  return a.y+(b.y-a.y)*t+bias
}
