import { wardCanvasPointer } from './tycoon-pointer'
import { PatientThoughtBubble } from './tycoon-thought-bubble'
import { HOSPITAL_MAP, PATIENT_ROOM, roomEntrance } from './tycoon-map-config'
import type Phaser from 'phaser'
import { projectGround, type GroundPoint, type ScreenPoint } from './tycoon-care-presentation'
import { createRoomMaterial } from './tycoon-room-material'
import { ROOM_PROPS, WARD_ROOM, roomPoint } from './tycoon-ward-layout'
import type { WardTask } from './tycoon-ward'
import { drawClinicalArchitecture } from './tycoon-room-architecture'

export interface RoomDrawing {
  scene: Phaser.Scene
  polygon(points: ScreenPoint[], fill: number, alpha?: number, depth?: number): Phaser.GameObjects.Graphics
  prop(key: string, point: GroundPoint, width: number, offset?: number): Phaser.GameObjects.Image
  text(text: string, point: GroundPoint, color?: string, size?: number): Phaser.GameObjects.Text
  lowWall(from: GroundPoint, to: GroundPoint, reference?: boolean): void
  wall(key: string, from: GroundPoint, to: GroundPoint): void
  occupiedBed(point: GroundPoint, onSelect: () => void): Phaser.GameObjects.Image[]
}
export function drawRoomShell(o: RoomDrawing, index: number, _color: number, closed = false) {
  const { minU, maxU, minV, maxV } = WARD_ROOM
  const p = (u: number, v: number) => roomPoint(index, { u, v })
  const key = `ward-concept-floor-${index}`
  const material = o.scene.textures.exists(key) ? null : createRoomMaterial(HOSPITAL_MAP.rooms[index].origin)
  if (material) o.scene.textures.addCanvas(key, material.canvas)
  const at = projectGround(roomPoint(index, { u: minU, v: minV }))
  const x = projectGround(roomPoint(index, { u: minU, v: maxV })).x - 1
  const y = at.y - 1
  o.scene.add.image(x, y, key).setOrigin(0).setDepth(-3)
  const architecture = drawClinicalArchitecture(o.scene,index,closed)
  // Register the generated fixture to the wall plane (uprights stay upright).
  const fixtureKey='studio-headwall-registered-v1'
  if(!o.scene.textures.exists(fixtureKey)) {
    const art=o.scene.textures.get('studio-headwall-v1').getSourceImage() as HTMLImageElement
    const canvas=document.createElement('canvas');canvas.width=art.width;canvas.height=Math.ceil(art.height+art.width*.21)
    const ctx=canvas.getContext('2d')!;ctx.transform(1,.21,0,1,0,0);ctx.drawImage(art,0,0)
    o.scene.textures.addCanvas(fixtureKey,canvas)
  }
  const fixtureAt=projectGround(p(5.7,minV))
  o.scene.add.image(fixtureAt.x,fixtureAt.y-118,fixtureKey).setScale(156/1415)
    .setDepth(projectGround(p(maxU,minV)).y+2)
  o.prop('furniture-bedside-cabinet',roomPoint(index,ROOM_PROPS.cabinet),52)
  return o.prop(PATIENT_ROOM.props.monitor.asset,roomPoint(index,ROOM_PROPS.monitor),52,20)
    .setData('doorFrame',architecture.frame).setData('doorLeaf',architecture.leaf).setData('doorHit',architecture.hit)
}

export function drawPatientRoom(o: RoomDrawing, task: WardTask, i: number, goTo: (id: string) => unknown) {
  const p = (u: number, v: number) => roomPoint(i, { u, v })
  const referenceMonitor = drawRoomShell(o, i, i % 2 ? 0xdde8e1 : 0xd6e8e8)
  const ambient = o.polygon([p(WARD_ROOM.minU, WARD_ROOM.minV), p(WARD_ROOM.maxU, WARD_ROOM.minV), p(WARD_ROOM.maxU, WARD_ROOM.maxV), p(WARD_ROOM.minU, WARD_ROOM.maxV)].map(projectGround), 0xffe3a6, 0.2, -2).setVisible(false)
  const monitor = (referenceMonitor ?? o.prop(PATIENT_ROOM.props.monitor.asset, roomPoint(i, ROOM_PROPS.monitor), PATIENT_ROOM.props.monitor.width, 20)).setInteractive({ useHandCursor: true, pixelPerfect: true }).on('pointerup', (pointer: Phaser.Input.Pointer) => { if (wardCanvasPointer(pointer, o.scene)) goTo(`equipment:${task.id}`) })
  for(const key of ['doorFrame','doorLeaf']) {
    const door=monitor.getData(key) as Phaser.GameObjects.Image
    door.setInteractive({useHandCursor:true,pixelPerfect:true}).on('pointerup',(pointer: Phaser.Input.Pointer)=>{ if (wardCanvasPointer(pointer, o.scene)) goTo(`patient:${task.id}`) })
  }
  (monitor.getData('doorHit') as Phaser.GameObjects.Zone).on('pointerup',(pointer: Phaser.Input.Pointer)=>{ if (wardCanvasPointer(pointer, o.scene)) goTo(`patient:${task.id}`) })
  o.prop(PATIENT_ROOM.props.iv.asset, roomPoint(i, ROOM_PROPS.iv), 28).setInteractive({ useHandCursor: true, pixelPerfect: true }).on('pointerup', (pointer: Phaser.Input.Pointer) => { if (wardCanvasPointer(pointer, o.scene)) goTo(`safety:${task.id}`) })
  const bed = roomPoint(i, ROOM_PROPS.bed), at = projectGround(bed)
  const patient = task.simulation?.discharged ? [] : o.occupiedBed(bed, () => { goTo(`patient:${task.id}`) })
  if (task.simulation?.discharged) { o.prop('reference-bed-table-empty', bed, 230) }

  // Call status stays at the doorway, separate from the permanent wall plaque.
  const doorway = projectGround(roomEntrance(i).center)
  const light = o.scene.add.circle(doorway.x, doorway.y - 190, 5, 0xe3b565).setStrokeStyle(2, 0xf4f2e9).setDepth(1250)
  const reaction = new PatientThoughtBubble(o.scene, at.x - 25, at.y - 145)
  const progress = o.scene.add.graphics().setDepth(1250)
  return { ambient, taskId: task.id, light, monitor, patient, reaction, progress, point: { x: at.x - 30, y: at.y - 108 }, previous: '', until: 0 }
}
