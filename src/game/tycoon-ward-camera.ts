import { HOSPITAL_MAP } from './tycoon-map-config'
import { projectGround, type ScreenPoint } from './tycoon-care-presentation'
import { cameraBlend } from './tycoon-ward-polish'

// Fit the room's wall height and adjoining hall between the fixed HUD rows.
// Keep phone characters readable; overview remains the full-building view.
export const followZoom = (width: number, height = 760) => width < 600 ? .85 : width < 900 ? 1 : Math.max(.65,Math.min(1.08,(height-180)/615,(width-280)/850))
export function overviewCamera(width: number, height: number) {
  const bounds = HOSPITAL_MAP.camera
  const left = projectGround(bounds.left).x - bounds.padding.left
  const right = projectGround(bounds.right).x + bounds.padding.right
  const top = projectGround(bounds.top).y - bounds.padding.top
  const bottom = projectGround(bounds.bottom).y + bounds.padding.bottom
  const sidebar = width >= 900 ? 240 : 0
  const zoom = Math.min((width-sidebar-32)/(right-left), (height-140)/(bottom-top), .75)
  return { zoom, x: (left+right)/2-sidebar/2/zoom, y: (top+bottom)/2 }
}
export function followCamera(width: number, height: number, zoom: number, at: ScreenPoint, previous: ScreenPoint | null, delta: number, snap: boolean) {
  const targetX = width < 900 ? width/2 : width*.44
  const targetY = height*(width < 900 ? .58 : .54)
  const goal = { x: at.x+(width/2-targetX)/zoom, y: at.y+(height/2-targetY)/zoom }
  const blend = snap || !previous ? 1 : cameraBlend(delta)
  return { x: (previous?.x ?? goal.x)+(goal.x-(previous?.x ?? goal.x))*blend, y: (previous?.y ?? goal.y)+(goal.y-(previous?.y ?? goal.y))*blend }
}
