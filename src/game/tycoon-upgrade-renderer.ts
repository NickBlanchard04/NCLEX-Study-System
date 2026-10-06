import { wardCanvasPointer } from './tycoon-pointer'
import type Phaser from 'phaser'
import { HOSPITAL_MAP, unlockedRoomCount, roomEntrance } from './tycoon-map-config'
import { ROOM_PROPS, roomPoint } from './tycoon-ward-layout'
import { projectGround, type GroundPoint } from './tycoon-care-presentation'
import type { WardState } from './tycoon-ward'
import { drawRoomShell, type RoomDrawing } from './tycoon-room-renderer'
export function drawWardUpgrades(o: RoomDrawing, state: WardState, paused: () => boolean, openShop: () => void) {
  const labels: { label: Phaser.GameObjects.Text; point: GroundPoint }[] = []
  const scanners: { taskId: string; light: Phaser.GameObjects.Rectangle }[] = []
  const drawRoom = (i: number, color: number, closed: boolean) => drawRoomShell(o,i,color,closed)
  const upgrades = state.upgrades ?? {}
  const install = (key: string, point: GroundPoint, width: number, label: string) => {
    o.prop(key, point, width)
    const caption = o.text(label, { u: point.u, v: point.v + 0.5 }, '#365064', 11).setVisible(false)
    labels.push({ label: caption, point })
  }
  if (upgrades['ehr-station']) install(HOSPITAL_MAP.upgrades.ehr.prop.asset, HOSPITAL_MAP.upgrades.ehr.prop.point, HOSPITAL_MAP.upgrades.ehr.prop.width, `EHR · Lv ${upgrades['ehr-station']}`)
  // Existing simulation upgrades retain their state benefits. Their physical bay
  // belongs to the future floor, so it must not reveal a room outside this ward.
  const capacity = unlockedRoomCount(upgrades)
  for (let i = state.tasks.length; i < HOSPITAL_MAP.rooms.length; i++) {
    const locked = i >= capacity
    const monitor=drawRoom(i, 0xe5e9df, locked)
    const entrance=roomEntrance(i),door = projectGround(entrance.center)
    o.scene.add.circle(door.x,door.y-190,5,locked?0x89938d:0x61b58e).setStrokeStyle(2,0xf4f2e9).setDepth(1250)
    install('reference-bed-table-empty', roomPoint(i, ROOM_PROPS.bed), 230, locked ? `Room ${101 + i} · Unlock in shop` : `Room ${101 + i} · opens next shift`)
    if (locked) {
      o.prop('renovation-barrier',entrance.outside,75).setInteractive({useHandCursor:true,pixelPerfect:true}).on('pointerup',(pointer: Phaser.Input.Pointer)=>{if(wardCanvasPointer(pointer,o.scene)&&!paused())openShop()})
      for(const key of ['doorFrame','doorLeaf']) {
        (monitor.getData(key) as Phaser.GameObjects.Image).setInteractive({useHandCursor:true,pixelPerfect:true}).on('pointerup',(pointer: Phaser.Input.Pointer)=>{if(wardCanvasPointer(pointer,o.scene)&&!paused())openShop()})
      }
      const doorHit=monitor.getData('doorHit') as Phaser.GameObjects.Zone
      doorHit.on('pointerup',(pointer: Phaser.Input.Pointer)=>{if(wardCanvasPointer(pointer,o.scene)&&!paused())openShop()})
    }
  }
  state.tasks.forEach((_task, i) => {
    if (upgrades['vitals-monitor']) install(HOSPITAL_MAP.upgrades.monitor.prop.asset, roomPoint(i, HOSPITAL_MAP.upgrades.monitor.prop.point), HOSPITAL_MAP.upgrades.monitor.prop.width, `Monitor Lv ${upgrades['vitals-monitor']}`)
    if (upgrades['med-safety-scanner']) {
      install(HOSPITAL_MAP.upgrades.scanner.prop.asset, roomPoint(i, HOSPITAL_MAP.upgrades.scanner.prop.point), HOSPITAL_MAP.upgrades.scanner.prop.width, `Scanner Lv ${upgrades['med-safety-scanner']}`)
      const at = projectGround(roomPoint(i, ROOM_PROPS.scanner))
      const light = o.scene.add.rectangle(at.x, at.y - 36, 12, 18, 0x214b56).setStrokeStyle(2, 0xbce0d6).setDepth(at.y + 25)
      scanners.push({ taskId: _task.id, light })
    }
  })
  return { labels, scanners }
}
