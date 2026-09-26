import Phaser from 'phaser'
import { CARE_LABELS, nextCareStep } from '../services/tycoon-care'
import { projectGround, type GroundPoint, type ScreenPoint } from './tycoon-care-presentation'
import { TycoonWardController, unprojectGround, type WardState, type WardStatus, type WardTarget } from './tycoon-ward'
import { CORRIDOR, ROOM_DOOR, ROOM_PROPS, ROOM_SPACING, ROOM_STOPS, WARD_ROOM, roomPoint, wardEnd } from './tycoon-ward-layout'

export interface TycoonWard {
  update(state: WardState): void
  goTo(id: string): boolean
  setDirection(x: number, y: number): void
  interact(): void
  snapshot(): ReturnType<TycoonWardController['snapshot']>
  destroy(): void
}
interface Options {
  parent: HTMLElement
  onInteract: (target: WardTarget) => void
  onStatus: (status: WardStatus) => void
  onError: (message: string) => void
}
interface ArtworkRegistration {
  environment: Record<string, {
    width: number; height: number
    visibleBounds: { width: number }
    groundOrigin: { x: number; y: number }
    footprint?: { baseLine: [number, number][] }
  }>
  nurse: { frames: Record<string, { pivotX: number; pivotY: number }> }
}
const BASE = '/game-assets/hospital-prototype/'
const environmentKeys = ['station-rear', 'wall-northwest', 'wall-northeast', 'patient-bed-overlay', 'equipment-monitor', 'equipment-iv-pole', 'furniture-bedside-cabinet', 'decor-potted-plant'] as const

export function createTycoonWard(options: Options): TycoonWard {
  const controller = new TycoonWardController(options.onInteract)
  let bridge: WardState | null = null
  let destroyed = false
  let loaded = false
  let lastStatus = ''
  let direction = { x: 0, y: 0 }
  const held = new Set<string>()
  const resetInput = () => { held.clear(); direction = { x: 0, y: 0 } }

  class WardScene extends Phaser.Scene {
    private registration!: ArtworkRegistration
    private nurse!: Phaser.GameObjects.Sprite
    private shadow!: Phaser.GameObjects.Ellipse
    private route!: Phaser.GameObjects.Graphics
    private indicators: { target: WardTarget; graphic: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }[] = []
    private lastFrame = ''
    private zoom = 1
    private elapsed = 0
    private upgradeKey = ''
    private roomFx: { taskId: string; light: Phaser.GameObjects.Arc; monitor: Phaser.GameObjects.Image; patient: Phaser.GameObjects.Image; reaction: Phaser.GameObjects.Text; progress: Phaser.GameObjects.Graphics; point: ScreenPoint; previous: string; until: number }[] = []
    private staff: { sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; offset: number; label: Phaser.GameObjects.Text }[] = []
    constructor() { super('playable-ward') }
    preload() {
      this.load.json('hospital-registration', `${BASE}registration.json`)
      this.load.image('bed-empty', `${BASE}bed-empty.png`)
      environmentKeys.forEach((key) => this.load.image(key, `${BASE}${key}.png`))
      this.load.atlas('nurse-03', `${BASE}nurse-03-animation-sheet.png`, `${BASE}nurse-03-atlas.json`)
      this.load.on('loaderror', () => options.onError('Hospital artwork could not load.'))
    }
    create() {
      if (destroyed || !bridge) return
      this.registration = this.cache.json.get('hospital-registration') as ArtworkRegistration
      if (!this.registration || environmentKeys.some((key) => !this.textures.exists(key)) || !this.textures.exists('nurse-03')) {
        options.onError('Hospital artwork is incomplete.'); return
      }
      this.drawHospital()
      loaded = true
      this.fitCamera()
      this.scale.on('resize', this.fitCamera, this)
      this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this))
      this.input.on('pointerup', (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
        if (controller.paused || objects.length) return
        controller.moveTo(unprojectGround(this.cameras.main.getWorldPoint(pointer.x, pointer.y)))
      })
      this.sync()
    }
    private fitCamera() {
      this.zoom = this.scale.width < 600 ? 0.85 : this.scale.width < 900 ? 1 : 1.12
      this.cameras.main.setZoom(this.zoom)
      this.followNurse()
    }
    private followNurse() {
      const { width, height } = this.scale
      const at = controller.snapshot().screenPosition
      const targetX = width < 900 ? width / 2 : width * 0.48
      const targetY = height * (width < 900 ? 0.58 : 0.61)
      this.cameras.main.centerOn(at.x + (width / 2 - targetX) / this.zoom, at.y + (height / 2 - targetY) / this.zoom)
    }
    private polygon(points: ScreenPoint[], fill: number, alpha = 1, depth = 0) {
      return this.add.graphics().setDepth(depth).fillStyle(fill, alpha).fillPoints(points.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true)
    }
    private prop(key: string, point: GroundPoint, width: number, offset = 0) {
      const entry = this.registration.environment[key], at = projectGround(point)
      return this.add.image(at.x, at.y, key).setOrigin(entry.groundOrigin.x, entry.groundOrigin.y)
        .setScale(width / entry.visibleBounds.width).setDepth(at.y + offset)
    }
    private wall(key: string, from: GroundPoint, to: GroundPoint) {
      const line = this.registration.environment[key].footprint?.baseLine
      if (!line) return
      const a = projectGround(from), b = projectGround(to)
      const sx = (b.x - a.x) / (line[1][0] - line[0][0]), sy = (b.y - a.y) / (line[1][1] - line[0][1])
      this.add.image(a.x - line[0][0] * sx, a.y - line[0][1] * sy, key).setOrigin(0, 0).setScale(sx, sy).setDepth(Math.min(a.y, b.y) - 50)
    }
    private lowWall(from: GroundPoint, to: GroundPoint) {
      const a = projectGround(from), b = projectGround(to)
      this.polygon([a, b, { x: b.x, y: b.y - 20 }, { x: a.x, y: a.y - 20 }], 0x7a93a7, 1, Math.max(a.y, b.y))
      this.add.graphics().setDepth(Math.max(a.y, b.y) + 1).lineStyle(6, 0xf2f3ee).lineBetween(a.x, a.y - 20, b.x, b.y - 20)
    }
    private text(text: string, p: GroundPoint, color = '#365064', size = 14) {
      const at = projectGround(p)
      return this.add.text(at.x, at.y, text, { fontFamily: 'Google Sans Text, sans-serif', fontSize: `${size}px`, color, align: 'center', backgroundColor: '#f4f2e9', padding: { x: 7, y: 5 } }).setOrigin(0.5).setDepth(1200)
    }
    private bedFrame(point: GroundPoint) {
      const at = projectGround(point), mattress = this.registration.environment['patient-bed-overlay']
      const scale = 200 / mattress.visibleBounds.width
      const onMattress = (x: number, y: number, drop = 0) => ({ x: at.x + (x - mattress.groundOrigin.x * mattress.width) * scale, y: at.y + (y - mattress.groundOrigin.y * mattress.height) * scale + drop })
      const chassis = this.add.graphics().setDepth(at.y - 2)
      for (const [x, y] of [[245, 584], [711, 1000], [1094, 861]]) {
        const p = onMattress(x, y, 6)
        chassis.lineStyle(6, 0xc4ced3).lineBetween(p.x, p.y, p.x, p.y + 10)
        chassis.fillStyle(0x344655).fillEllipse(p.x, p.y + 13, 9, 11)
        chassis.fillStyle(0x9aaab3).fillCircle(p.x, p.y + 13, 2)
      }
      const rail = [onMattress(214, 552, 2), onMattress(701, 1000, 2), onMattress(1124, 837, 2)]
      this.polygon([rail[0], rail[1], { x: rail[1].x, y: rail[1].y + 8 }, { x: rail[0].x, y: rail[0].y + 8 }], 0xdbe2e4, 1, at.y - 1)
      this.polygon([rail[1], rail[2], { x: rail[2].x, y: rail[2].y + 8 }, { x: rail[1].x, y: rail[1].y + 8 }], 0xb4c2ca, 1, at.y - 1)
    }
    private drawHospital() {
      const tasks = bridge!.tasks
      this.upgradeKey = JSON.stringify(bridge?.upgrades ?? {})
      const end = wardEnd(tasks.length)
      this.polygon([{ u: 0, v: 2.8 }, { u: end, v: 2.8 }, { u: end, v: 5.6 }, { u: 0, v: 5.6 }].map(projectGround).map((p) => ({ x: p.x + 5, y: p.y + 18 })), 0x344c4b, 0.2, -5)
      this.polygon([{ u: 0, v: 2.8 }, { u: end, v: 2.8 }, { u: end, v: 5.6 }, { u: 0, v: 5.6 }].map(projectGround), 0xe9e6dc, 1, -4)
      const grid = this.add.graphics().setDepth(-2).lineStyle(1, 0xbfc9c5, 0.6)
      for (let u = 0; u <= end; u += 0.5) {
        const a = projectGround({ u, v: 2.8 }), b = projectGround({ u, v: 5.6 })
        grid.lineBetween(a.x, a.y, b.x, b.y)
      }
      for (let v = 3; v <= 5.6; v += 0.5) {
        const a = projectGround({ u: 0, v }), b = projectGround({ u: end, v })
        grid.lineBetween(a.x, a.y, b.x, b.y)
      }
      this.lowWall({ u: 0, v: 5.6 }, { u: end, v: 5.6 })
      this.prop('station-rear', { u: 1.15, v: 3.6 }, 230)
      this.text('NURSING STATION', { u: 1.4, v: 4.8 })
      tasks.forEach((task, i) => {
        const p = (u: number, v: number) => ({ u: u + i * ROOM_SPACING, v })
        this.drawRoom(i, i % 2 ? 0xdde8e1 : 0xd6e8e8)
        this.polygon([p(ROOM_DOOR.minU, WARD_ROOM.maxV - 0.1), p(ROOM_DOOR.maxU, WARD_ROOM.maxV - 0.1), p(ROOM_DOOR.maxU, WARD_ROOM.maxV + 0.15), p(ROOM_DOOR.minU, WARD_ROOM.maxV + 0.15)].map(projectGround), 0x739aa3, 0.7)
        this.prop('furniture-bedside-cabinet', roomPoint(i, ROOM_PROPS.cabinet), 64)
        const monitor = this.prop('equipment-monitor', roomPoint(i, ROOM_PROPS.monitor), 65, 20).setInteractive({ useHandCursor: true, pixelPerfect: true }).on('pointerup', () => controller.goTo(`equipment:${task.id}`))
        this.prop('equipment-iv-pole', roomPoint(i, ROOM_PROPS.iv), 48).setInteractive({ useHandCursor: true, pixelPerfect: true }).on('pointerup', () => controller.goTo(`safety:${task.id}`))
        const bed = roomPoint(i, ROOM_PROPS.bed), at = projectGround(bed)
        this.add.ellipse(at.x, at.y + 6, 168, 36, 0x5a6b7c, 0.2).setDepth(1)
        this.bedFrame(bed)
        const patient = this.prop('patient-bed-overlay', bed, 200).setInteractive({ useHandCursor: true, pixelPerfect: true }).on('pointerup', () => controller.goTo(`patient:${task.id}`))
        this.prop('decor-potted-plant', roomPoint(i, ROOM_PROPS.plant), 52)
        this.text(`${task.room}\n${task.patientName}`, p(6, WARD_ROOM.minV - 0.8), '#173b52', 15)
        this.text(task.room.replace('Room ', ''), p(ROOM_STOPS.patient.u, CORRIDOR.minV + 0.35), '#48657e', 13)
        const doorway = projectGround(p(ROOM_DOOR.minU + 0.04, WARD_ROOM.maxV))
        const light = this.add.circle(doorway.x, doorway.y - 38, 6, 0xe3b565).setStrokeStyle(2, 0xf4f2e9).setDepth(1250)
        const reaction = this.text('', p(ROOM_PROPS.bed.u - 0.9, ROOM_PROPS.bed.v + 0.08), '#214b56', 12).setY(at.y - 126).setVisible(false)
        const progress = this.add.graphics().setDepth(1250)
        this.roomFx.push({ taskId: task.id, light, monitor, patient, reaction, progress, point: { x: at.x - 30, y: at.y - 108 }, previous: '', until: 0 })
      })
      this.drawUpgrades()
      this.route = this.add.graphics().setDepth(1)
      controller.targets().forEach((target) => {
        const at = projectGround(target.position)
        const graphic = this.add.circle(at.x, at.y, 13, 0x347f86, 0.18).setStrokeStyle(2, 0x347f86, 0.75).setDepth(2)
        const label = this.text(target.kind === 'station' ? 'Handoff' : target.kind === 'equipment' ? 'Monitor' : target.kind === 'safety' ? 'Safety' : 'Bedside', target.position, '#214b56', 11).setY(at.y + 25)
        label.setInteractive({ useHandCursor: true }).on('pointerup', () => controller.goTo(target.id))
        const hit = this.add.circle(at.x, at.y - 28, 38, 0xffffff, 0).setDepth(1100).setInteractive({ useHandCursor: true })
        hit.on('pointerup', () => controller.goTo(target.id))
        this.indicators.push({ target, graphic, label })
      })
      this.shadow = this.add.ellipse(0, 0, 28, 11, 0x24425b, 0.24)
      this.nurse = this.add.sprite(0, 0, 'nurse-03', 'se-idle-0').setScale(0.55)
    }
    private drawRoom(index: number, color: number, closed = false) {
      const { minU, maxU, minV, maxV } = WARD_ROOM
      const p = (u: number, v: number) => roomPoint(index, { u, v })
      this.polygon([p(minU, minV), p(maxU, minV), p(maxU, maxV), p(minU, maxV)].map(projectGround), color, 1, -3)
      this.wall('wall-northwest', p(minU, maxV), p(minU, minV))
      this.wall('wall-northeast', p(minU, minV), p(maxU, minV))
      this.lowWall(p(minU, maxV), p(closed ? maxU : ROOM_DOOR.minU, maxV))
      if (!closed) this.lowWall(p(ROOM_DOOR.maxU, maxV), p(maxU, maxV))
      this.lowWall(p(maxU, minV), p(maxU, maxV))
    }
    private drawUpgrades() {
      const upgrades = bridge?.upgrades ?? {}
      const install = (key: string, point: GroundPoint, width: number, label: string) => {
        this.prop(key, point, width)
        this.text(label, { u: point.u, v: point.v + 0.5 }, '#48657e', 11)
      }
      if (upgrades['ehr-station']) install('equipment-monitor', { u: 0.7, v: 3.38 }, 53, `EHR · Lv ${upgrades['ehr-station']}`)
      if (upgrades['simulation-room']) {
        this.polygon([{ u: -2.7, v: 2.2 }, { u: -0.2, v: 2.2 }, { u: -0.2, v: 4.4 }, { u: -2.7, v: 4.4 }].map(projectGround), 0xd6e8e8, 1, -3)
        install('bed-empty', { u: -1.5, v: 3.1 }, 160, `Practice bay · Lv ${upgrades['simulation-room']}`)
        install('equipment-monitor', { u: -2.15, v: 2.45 }, 52, 'Simulation')
      }
      const capacity = Math.min(6, 3 + (upgrades['extra-bed'] ?? 0))
      for (let i = bridge!.tasks.length; i < capacity; i++) {
        this.drawRoom(i, 0xe5e9df, true)
        install('bed-empty', roomPoint(i, ROOM_PROPS.bed), 190, `Room ${101 + i} · opens next shift`)
      }
      bridge!.tasks.forEach((_task, i) => {
        if (upgrades['vitals-monitor']) install('equipment-monitor', roomPoint(i, ROOM_PROPS.extraMonitor), 50, `Monitor Lv ${upgrades['vitals-monitor']}`)
        if (upgrades['med-safety-scanner']) {
          install('furniture-bedside-cabinet', roomPoint(i, ROOM_PROPS.scanner), 42, `Scanner Lv ${upgrades['med-safety-scanner']}`)
          const at = projectGround(roomPoint(i, ROOM_PROPS.scanner))
          this.add.rectangle(at.x, at.y - 36, 12, 18, 0x214b56).setStrokeStyle(2, 0xbce0d6).setDepth(at.y + 25)
        }
      })
      for (const [id, tint, offset, name] of [['staff-training', 0xa1d5cc, 0, 'Support RN'], ['lab-runner', 0xd0c5eb, 0.5, 'Lab runner']] as const) {
        if (!upgrades[id]) continue
        const sprite = this.add.sprite(0, 0, 'nurse-03', 'se-idle-0').setScale(0.48).setTint(tint)
        const shadow = this.add.ellipse(0, 0, 25, 9, 0x24425b, 0.2)
        const label = this.text(name, { u: 0, v: 0 }, '#365064', 10)
        this.staff.push({ sprite, shadow, offset, label })
      }
    }
    private animateWard() {
      const reduced = bridge?.reducedMotion
      for (const fx of this.roomFx) {
        const task = bridge!.tasks.find((item) => item.id === fx.taskId)!
        const step = nextCareStep(task), count = task.status === 'completed' ? 6 : task.careProgress?.steps.length ?? 0
        const key = `${task.status}:${count}`
        fx.light.setFillStyle(task.status === 'completed' ? 0x60977a : task.status === 'failed' || task.status === 'deteriorating' ? 0xbf755d : count === 0 ? 0xe3b565 : 0x7ba2a5)
        fx.light.setAlpha(reduced || count || task.status === 'failed' ? 1 : 0.7 + Math.sin(this.elapsed / 650) * 0.25)
        fx.monitor.setTint(task.careProgress?.steps.includes('monitor') ? 0xddfff0 : 0xffffff)
        if (key !== fx.previous) {
          if (fx.previous) {
            fx.reaction.setText(task.status === 'completed' ? 'Ready for handoff' : count >= 5 ? 'Thanks for checking on me.' : count >= 4 ? 'Care provided' : count ? 'Thanks for checking.' : 'Could you check on me?')
            fx.until = this.elapsed + 3400
          }
          fx.previous = key
          fx.progress.clear()
          for (let i = 0; i < 6; i++) fx.progress.fillStyle(i < count ? 0x5b9680 : 0xcedbd4).fillRect(fx.point.x + i * 11, fx.point.y, 8, 4)
        }
        fx.reaction.setVisible(this.elapsed < fx.until)
        fx.patient.setAngle(reduced || bridge?.paused ? 0 : Math.sin(this.elapsed / 1500) * 0.14)
        fx.progress.setVisible(Boolean(count) || bridge?.selectedTaskId === task.id)
        if (step === 'assessment' && !count && this.elapsed < 3200) { fx.reaction.setText('Could you check on me?'); fx.reaction.setVisible(true) }
      }
      for (const staff of this.staff) {
        const limit = roomPoint(bridge!.tasks.length - 1, ROOM_STOPS.patient).u
        const phase = (this.elapsed / 18000 + staff.offset) % 2
        const p = { u: 2.5 + (limit - 2.5) * (phase < 1 ? phase : 2 - phase), v: 4.45 }
        const at = projectGround(p), direction = phase < 1 ? 'se' : 'nw'
        const frame = `${direction}-${reduced || bridge?.paused ? 'idle-0' : `walk-${Math.floor(this.elapsed / 160) % 4}`}`
        const pivot = this.registration.nurse.frames[frame]
        staff.sprite.setFrame(frame).setOrigin(pivot.pivotX, pivot.pivotY).setPosition(at.x, at.y).setDepth(at.y + 1)
        staff.shadow.setPosition(at.x, at.y).setDepth(at.y - 1)
        staff.label.setPosition(at.x, at.y + 17)
      }
    }
    sync() {
      if (!loaded) return
      if (this.upgradeKey !== JSON.stringify(bridge?.upgrades ?? {})) {
        this.children.removeAll(true); this.indicators = []; this.roomFx = []; this.staff = []; this.lastFrame = ''
        this.drawHospital()
      }
      const s = controller.snapshot(), { x, y } = s.screenPosition
      this.nurse.setPosition(x, y).setDepth(y + 1)
      this.shadow.setPosition(x, y + 1).setDepth(y - 1)
      if (s.frame !== this.lastFrame) {
        this.nurse.setFrame(s.frame)
        const pivot = this.registration.nurse.frames[s.frame]
        this.nurse.setOrigin(pivot.pivotX, pivot.pivotY); this.lastFrame = s.frame
      }
      this.route.clear().lineStyle(2, 0x347f86, 0.6)
      if (s.path.length) this.route.strokePoints([s.screenPosition, ...s.path.map(projectGround)].map((p) => new Phaser.Math.Vector2(p.x, p.y)))
      this.indicators.forEach(({ target, graphic, label }) => {
        const task = bridge?.tasks.find((t) => t.id === target.taskId)
        const complete = target.kind === 'equipment' ? bridge?.reviewedTaskIds.includes(target.taskId!) : target.kind === 'safety' ? task?.careProgress?.steps.includes('safety') : task?.status === 'completed'
        const failed = target.kind === 'patient' && task?.status === 'failed'
        graphic.setFillStyle(complete ? 0x438567 : failed ? 0xb3684a : 0x347f86, s.nearby?.id === target.id ? 0.65 : 0.22)
        label.setText(complete ? target.kind === 'patient' ? '✓ Care complete' : '✓ Checked' : failed ? 'Task closed' : target.kind === 'patient' ? task && nextCareStep(task) ? CARE_LABELS[nextCareStep(task)!] : 'Bedside' : target.kind === 'station' ? 'Handoff' : target.kind === 'safety' ? 'Safety' : 'Monitor')
        label.setVisible(target.kind === 'station' || s.nearby?.id === target.id || bridge?.selectedTaskId === target.taskId)
      })
      this.followNurse()
      this.animateWard()
      const status = controller.status(), key = JSON.stringify(status)
      if (key !== lastStatus) { lastStatus = key; options.onStatus(status) }
      const diagnostics = { nurseCount: String(1 + this.staff.length), installedUpgrades: this.upgradeKey, nurseFrame: s.frame, nurseU: s.position.u.toFixed(3), nurseV: s.position.v.toFixed(3), moving: String(s.moving), nearby: s.nearby?.id ?? '', carePhase: s.caring ? 'caring' : s.moving ? 'walking' : 'ready' }
      for (const [k, v] of Object.entries(diagnostics)) if (options.parent.dataset[k] !== v) options.parent.dataset[k] = v
    }
    update(_time: number, delta: number) {
      if (!loaded || destroyed) return
      if (!controller.paused) this.elapsed += Math.min(delta, 50)
      const x = direction.x + Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'))
      const y = direction.y + Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup'))
      controller.tick(delta, { x, y }); this.sync()
    }
  }
  const scene = new WardScene()
  const game = new Phaser.Game({ type: Phaser.AUTO, parent: options.parent, width: Math.max(1, options.parent.clientWidth), height: Math.max(1, options.parent.clientHeight), transparent: true, scene, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: true }, audio: { noAudio: true }, input: { activePointers: 3, keyboard: false } })
  const onKeyDown = (event: KeyboardEvent) => {
    if (controller.paused || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))) return
    const key = event.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { event.preventDefault(); held.add(key) }
    if (key === 'e' && !event.repeat) { event.preventDefault(); controller.interact() }
  }
  const onKeyUp = (event: KeyboardEvent) => held.delete(event.key.toLowerCase())
  const onVisibility = () => { resetInput(); controller.setHidden(document.hidden); scene.sync() }
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', resetInput); document.addEventListener('visibilitychange', onVisibility)
  const observer = new ResizeObserver(() => { if (!destroyed) { game.scale.getParentBounds(); game.scale.refresh() } })
  observer.observe(options.parent); controller.setHidden(document.hidden)
  return {
    update(state) { bridge = state; controller.update(state); if (state.paused) resetInput(); scene.sync() },
    goTo: (id) => controller.goTo(id),
    setDirection(x, y) { direction = controller.paused ? { x: 0, y: 0 } : { x, y } },
    interact: () => controller.interact(),
    snapshot: () => controller.snapshot(),
    destroy() {
      destroyed = true; observer.disconnect(); resetInput()
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', resetInput); document.removeEventListener('visibilitychange', onVisibility)
      game.destroy(true)
    },
  }
}
