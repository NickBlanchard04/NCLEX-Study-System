import { applyNurseFrame, walkFrame } from './tycoon-walk-cycle'
import { setDepthIfChanged } from './tycoon-render-cache'
import { WARD_ART_STANDARD } from './tycoon-grounding'
import type { TycoonWardController } from './tycoon-ward'
import type { TycoonWorldJob } from '../app/types'
import type { TycoonJobActor } from './tycoon-job-actor'
import type { ScreenPoint } from './tycoon-care-presentation'
import type Phaser from 'phaser'
import { actorContact } from './tycoon-surface-finish'
import type { RoomDrawing } from './tycoon-room-renderer'
export interface StaffVisual {
  sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse
  contact: ReturnType<typeof actorContact>; label: Phaser.GameObjects.Text; kind: 'support' | 'lab'; parcel: Phaser.GameObjects.Rectangle
}
export function createStaffVisuals(scene: Phaser.Scene, text: RoomDrawing['text'], upgrades: Readonly<Record<string,number>>) {
  const staff: StaffVisual[] = []
      for (const [id, tint, kind, name] of [['staff-training', 0xf5f2eb, 'support', 'Support RN'], ['lab-runner', 0xd9e2eb, 'lab', 'Lab runner']] as const) {
        if (!upgrades[id]) continue
        const sprite = scene.add.sprite(0, 0, 'nurse-03', 'se-idle-0').setScale(WARD_ART_STANDARD.nurseScale).setTint(tint)
        const shadow = scene.add.ellipse(0, 0, 25, 9, 0x24425b, 0.2)
        const label = text(name, { u: 0, v: 0 }, '#365064', 10)
        const parcel = scene.add.rectangle(0, 0, 12, 10, 0xf1e5bf).setStrokeStyle(2, 0x837653).setVisible(false)
        shadow.setVisible(false)
        staff.push({ sprite, shadow, contact: actorContact(scene), label, kind, parcel })
      }
  return staff
}

export function presentStaff(staff: StaffVisual, pose: ReturnType<TycoonJobActor['snapshot']>, presentation: { moving: boolean; strideDistance: number }, at: ScreenPoint, job: TycoonWorldJob | undefined, reduced: boolean, elapsed: number, refreshUi: boolean, frames: Record<string,{pivotX:number;pivotY:number}>) {
  const working = job?.phase === 'working' || job?.phase === 'reporting'
  const carrying = staff.kind === 'lab' && (job?.phase === 'to-station' || job?.phase === 'reporting')
        const frame = working && !reduced ? `${pose.direction}-care-${Math.floor(elapsed / 320) % 2}` : presentation.moving && !reduced ? `${pose.direction}-${carrying ? 'push' : 'walk'}-${walkFrame(presentation.strideDistance)}` : `${pose.direction}-idle-0`

        applyNurseFrame(staff.sprite, frame, frames)
        staff.sprite.setPosition(at.x, at.y)
        setDepthIfChanged(staff.sprite,at.y+1)
        // Whole rigged poses preserve the shoulder, hip and foot relationship.
        staff.sprite.setCrop()
        staff.contact.update(at.x, at.y)
        const phase = job?.phase === 'to-patient' ? 'Walking to room' : job?.phase === 'working' ? staff.kind === 'lab' ? 'Collecting sample' : 'Providing comfort' : job?.phase === 'to-station' ? 'Returning to station' : job?.phase === 'reporting' ? staff.kind === 'lab' ? 'Delivering sample' : 'Reporting care' : 'Available'
        if (refreshUi) staff.label.setText(`${staff.kind === 'lab' ? 'Lab runner' : 'Support RN'}${working ? ` · ${phase}` : ''}`).setPosition(at.x, at.y - (staff.kind === 'support' ? 94 : 116)).setVisible(working)
        staff.parcel.setVisible(staff.kind === 'lab' && (job?.phase === 'to-station' || job?.phase === 'reporting' || job?.phase === 'working' && pose.workedMs > 900)).setPosition(at.x + (pose.direction.endsWith('e') ? 17 : -17), at.y - 43)
        setDepthIfChanged(staff.parcel,at.y+2)
}

export function presentPlayer(sprite: Phaser.GameObjects.Sprite, contact: ReturnType<typeof actorContact>, snapshot: ReturnType<TycoonWardController['snapshot']>, frames: Record<string,{pivotX:number;pivotY:number}>, lastFrame: string) {
  const { x, y } = snapshot.screenPosition
  sprite.setPosition(x,y);setDepthIfChanged(sprite,y+1)
  contact.update(x,y)
  sprite.setRotation(0) // Rotating the whole sprite lifts its registered feet off the floor.
  if(snapshot.frame !== lastFrame) {
    applyNurseFrame(sprite, snapshot.frame, frames)
  }
  return snapshot.frame
}


