import { wardCanvasPointer } from './tycoon-pointer'
import type { PatientThoughtBubble } from './tycoon-thought-bubble'
import { WARD_RENDER_BUDGET } from './tycoon-render-cache'
import { flushArchitectureAtlas } from './tycoon-architecture-atlas'
import { repairDepthOrder } from './tycoon-depth-sort'
import { prepareWardArtwork } from './tycoon-artwork-cache'
import { cameraWorldBounds, cropIntersectsView, type ViewBounds } from './tycoon-camera-culling'
import { REFERENCE_ROOM_ART } from './tycoon-reference-room'
import { objectGrounding, WARD_ART_STANDARD } from './tycoon-grounding'
import { drawWardUpgrades } from './tycoon-upgrade-renderer'
import { createStaffVisuals, presentStaff, presentPlayer, type StaffVisual } from './tycoon-character-presentation'
import { createInteractionIcon, createInteractionGlow, updateInteractionCue, type InteractionCue } from './tycoon-interaction-cues'
import { followCamera, followZoom, overviewCamera } from './tycoon-ward-camera'
import { HOSPITAL_MAP, availableRoomCount } from './tycoon-map-config'
import { drawCorridorFloor, drawRegisteredWall } from './tycoon-map-surfaces'
import { actorContact, wallFinish } from './tycoon-surface-finish'
import { drawHospitalSurroundings } from './tycoon-hospital-surroundings'
import { drawPatientRoom, type RoomDrawing } from './tycoon-room-renderer'
import Phaser from 'phaser'
import { WardSound } from './tycoon-ward-sound'
import { spaceWardActor, WardActorPresentation } from './tycoon-ward-polish'
import { TycoonJobActor, type WorldJobReport } from './tycoon-job-actor'
import { worldJobActive, worldWorkMs } from '../services/tycoon-world-jobs'
import { CARE_LABELS, nextCareStep } from '../services/tycoon-care'
import { patientResponse } from '../services/tycoon-shift-loop'
import { projectGround, type GroundPoint, type ScreenPoint } from './tycoon-care-presentation'
import { TycoonWardController, unprojectGround, type WardState, type WardStatus, type WardTarget } from './tycoon-ward'
import { ROOM_PROPS, roomPoint } from './tycoon-ward-layout'

export interface TycoonWard {
  update(state: WardState): void
  setOverview(enabled: boolean): void
  goTo(id: string): boolean
  setDirection(x: number, y: number): void
  interact(): void
  snapshot(): ReturnType<TycoonWardController['snapshot']>
  destroy(): void
}
interface Options {
  onReady: () => void
  onJobProgress: WorldJobReport
  parent: HTMLElement
  onInteract: (target: WardTarget) => void
  onStatus: (status: WardStatus) => void
  onError: (message: string) => void
  onOpenShop: () => void
}
interface ArtworkRegistration {
  environment: Record<string, {
    width: number; height: number
    visibleBounds: { x: number; y: number; width: number; height: number }
    groundOrigin: { x: number; y: number }
    footprint?: { baseLine: [number, number][] }
  }>
  nurse: { frames: Record<string, { pivotX: number; pivotY: number }> }
}
const BASE = '/game-assets/hospital-prototype/'
const environmentKeys = ['staff-kitchenette','washroom-fixtures','linen-cabinet', 'dispatch-counter', 'reception-desk', 'renovation-barrier', 'waste-bin', 'sanitizer-stand', 'door-northwest', 'furniture-waiting-sofa', 'furniture-visitor-chair', 'equipment-medication-cart', 'equipment-monitor', 'equipment-iv-pole', 'furniture-bedside-cabinet', 'decor-potted-plant'] as const

export function createTycoonWard(options: Options): TycoonWard {
  const sound = new WardSound()
  const unlockSound = () => sound.unlock()
  const controller = new TycoonWardController(options.onInteract)
  let bridge: WardState | null = null
  let destroyed = false
  let loaded = false
  const artworkAbort = new AbortController()
  let artwork: Awaited<ReturnType<typeof prepareWardArtwork>> | undefined
  let game: Phaser.Game | undefined
  let lastStatus = ''
  const report: WorldJobReport = (...args) => queueMicrotask(() => { if (!destroyed) options.onJobProgress(...args) })
  let direction = { x: 0, y: 0 }
  const held = new Set<string>()
  const resetInput = () => { held.clear(); direction = { x: 0, y: 0 } }

  class WardScene extends Phaser.Scene {
    private overview = false
    private hoveredTarget: string | null = null
    private animateSurroundings: ((elapsed: number, reduced: boolean) => void) | null = null
    setOverview(enabled: boolean) { this.overview = enabled; if (loaded) this.fitCamera() }
    private registration!: ArtworkRegistration
    private nurse!: Phaser.GameObjects.Sprite
    private contact!: ReturnType<typeof actorContact>
    private route!: Phaser.GameObjects.Graphics
    private destinationPin!: Phaser.GameObjects.Graphics
    private destinationLabel!: Phaser.GameObjects.Text
    private destinationDrawKey = ''
    private readonly touch = window.matchMedia('(pointer: coarse)').matches
    private indicators: InteractionCue[] = []
    private lastFrame = ''
    private zoom = 1
    private elapsed = 0
    private uiDirty = true
    private lastUiAt = -Infinity
    private lastRouteAt = -Infinity
    invalidate() { this.uiDirty = true }
    private shiftedLabels: { label: Phaser.GameObjects.Text; y: number }[] = []
    private cameraAt: ScreenPoint | null = null
    private lastFootfall = 0
    private seenJobs: Set<string> | null = null
    private seenCare: Set<string> | null = null
    private completionPending = false
    private seenCalls: Set<string> | null = null
    private bellPending = false
    private equipmentLabels: { label: Phaser.GameObjects.Text; point: GroundPoint }[] = []
    private scanners: { taskId: string; light: Phaser.GameObjects.Rectangle }[] = []
    private stationScreen!: Phaser.GameObjects.Rectangle
    private sampleTray!: Phaser.GameObjects.Rectangle
    private upgradeKey = ''
    private patientsKey = ''
    private roomFx: { ambient: Phaser.GameObjects.Graphics; taskId: string; light: Phaser.GameObjects.Arc; monitor: Phaser.GameObjects.Image; patient: Phaser.GameObjects.Image[]; reaction: PatientThoughtBubble; progress: Phaser.GameObjects.Graphics; point: ScreenPoint; previous: string; until: number }[] = []
    private staff: StaffVisual[] = []
    private actors = { support: new TycoonJobActor(report, HOSPITAL_MAP.station.parking.support), lab: new TycoonJobActor(report, HOSPITAL_MAP.station.parking.lab) }
    private staffPresentation = { support: new WardActorPresentation(), lab: new WardActorPresentation() }
    private workFx!: Phaser.GameObjects.Graphics
    private workLabel!: Phaser.GameObjects.Text
    private playerJobKey = ''
    private playerWorkMs = 0
    private playerReported = false
    private staffDelta = 0
    private frameWindowAt = performance.now()
    private frameWindowCount = 0
    private sceneUpdateFps = 0
    private lastAmbientAt = -Infinity
    private cullEntries: { object: Phaser.GameObjects.Image; bounds: ViewBounds }[] = []
    private upperWalls: { object: Phaser.GameObjects.Image; room: number }[] = []
    private sceneLabels: Phaser.GameObjects.Text[] = []
    private vectorCount = 0
    private guidanceCaptionKey = ''
    private cullViewKey = ''
    private renderStarted = 0
    private renderCpuMs = 0
    constructor() { super('playable-ward') }
    preload() {
      // Blob URLs come from the content-addressed public artwork cache.
      const asset = (url: string) => artwork?.url(url) ?? url
      this.load.json('hospital-registration', asset(`${BASE}registration.json`))
      for(const [kind,name]of [['patient','assess-patient'],['equipment','check-monitor'],['safety','bedside-safety']])this.load.svg('care-icon-'+kind,'/game-assets/interaction-icons/'+name+'.svg',{width:64,height:64})
      this.load.image('bed-empty', asset(`${BASE}bed-empty.png`))
      environmentKeys.forEach((key) => this.load.image(key, asset(`${BASE}${key}.png`)))
      for (const key of ['reference-bed-table', 'reference-bed-table-empty', 'reference-station']) this.load.image(key, asset(`${BASE}${key}.png`))
      for (const key of ['elevator-core', 'stair-core']) this.load.image(key, asset(`${BASE}${key}.png`))
      this.load.image('patient-oak-door-detail-v1',asset(`${BASE}patient-oak-door-detail-v1.png`))
      this.load.image('studio-headwall-v1',asset(`${BASE}studio-headwall-v1.png`))
      this.load.json('building-core-registration', asset(`${BASE}building-core-registration.json`))
      this.load.json('reference-nurse-pivots', asset(`${BASE}rigged-nurse-pivots.json?v=care-v2`))
      this.load.atlas('nurse-03', asset(`${BASE}rigged-nurse-sheet.png?v=care-v2`), asset(`${BASE}rigged-nurse-atlas.json?v=care-v2`))
      this.load.on('loaderror', () => options.onError('Hospital artwork could not load.'))
    }
    create() {
      if (destroyed || !bridge) return
      this.registration = this.cache.json.get('hospital-registration') as ArtworkRegistration
      if (this.registration) {
        const cores = this.cache.json.get('building-core-registration') as Record<string, {width:number;height:number;origin:[number,number]}>
        for (const key of ['elevator-core', 'stair-core']) {
          const entry = cores?.[`${key}.png`]
          if (!entry) { options.onError('Hospital core artwork registration is incomplete.'); return }
          this.registration.environment[key] = { width:entry.width, height:entry.height,
            visibleBounds:{x:0,y:0,width:entry.width,height:entry.height}, groundOrigin:{x:entry.origin[0],y:entry.origin[1]} }
        }
        this.registration.environment['concept-wall'] = REFERENCE_ROOM_ART.wall
        this.registration.environment['concept-bed-occupied'] = REFERENCE_ROOM_ART.bed
        this.registration.environment['reference-bed-table'] = REFERENCE_ROOM_ART.bedTable
        this.registration.environment['reference-bed-table-empty'] = REFERENCE_ROOM_ART.bedTable
        this.registration.environment['reference-station'] = REFERENCE_ROOM_ART.station
        this.registration.nurse = this.cache.json.get('reference-nurse-pivots') as ArtworkRegistration['nurse']
      }
      const requiredArt = [...environmentKeys, 'elevator-core', 'stair-core', 'reference-bed-table', 'reference-bed-table-empty', 'reference-station', 'patient-oak-door-detail-v1', 'nurse-03']
      if (!this.registration?.nurse?.frames || requiredArt.some((key) => !this.textures.exists(key))) {
        options.onError('Hospital artwork is incomplete.'); return
      }
      this.drawHospital()
      this.events.on('prerender', () => { this.renderStarted = performance.now() })
      this.events.on('render', () => {
        const elapsed = performance.now() - this.renderStarted
        this.renderCpuMs = this.renderCpuMs ? this.renderCpuMs * .9 + elapsed * .1 : elapsed
      })
      const display = this.children, fullDepthSort = display.depthSort.bind(display)
      // Preserve Phaser's stable depth/tie order, without sorting thousands of
      // stationary wall columns again every time one nurse takes a step.
      display.depthSort = () => {
        if (!display.sortChildrenFlag) return
        repairDepthOrder(display.list as (Phaser.GameObjects.GameObject & { depth: number })[], fullDepthSort)
        display.sortChildrenFlag = false
      }
      loaded = true
      artwork?.release()
      // The first draw uploads/warms renderer programs. Keep the shift paused
      // through that preparation so a new player's first walk doesn't pay for it.
      this.events.once('render', () => { if (!destroyed) options.onReady() })
      this.fitCamera()
      this.scale.on('resize', this.fitCamera, this)
      this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this))
      this.input.on('pointerup', (pointer: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
        if (controller.paused || objects.length || pointer.event?.target !== this.game.canvas) return
        controller.moveTo(unprojectGround(this.cameras.main.getWorldPoint(pointer.x, pointer.y)))
      })
      this.sync()
    }
    private fitCamera() {
      this.zoom = followZoom(this.scale.width, this.scale.height, this.touch)
      this.cameras.main.setZoom(this.zoom)
      this.followNurse(0, true)
    }
    private followNurse(delta = 0, snap = false) {
      const { width, height } = this.scale
      if (this.overview) {
        const camera = overviewCamera(width, height)
        this.cameras.main.setZoom(camera.zoom).centerOn(camera.x, camera.y)
        this.cameraAt = null
        return
      }
      this.cameraAt = followCamera(width, height, this.zoom, controller.snapshot().screenPosition, this.cameraAt, delta, snap || Boolean(bridge?.reducedMotion), this.touch)
      this.cameras.main.centerOn(this.cameraAt.x, this.cameraAt.y)
    }
    private polygon(points: ScreenPoint[], fill: number, alpha = 1, depth = 0) {
      return this.add.graphics().setDepth(depth).fillStyle(fill, alpha).fillPoints(points.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true)
    }
    private prop(key: string, point: GroundPoint, width: number, offset = 0) {
      const entry = this.registration.environment[key], at = projectGround(point)
      const contactShadow = objectGrounding(this, key, entry, point, width)
      contactShadow?.setData('wardStatic',true)
      return this.add.image(at.x, at.y, key).setOrigin(entry.groundOrigin.x, entry.groundOrigin.y)
        .setScale(width / entry.visibleBounds.width).setTint(WARD_ART_STANDARD.palette.ambientTint).setDepth(at.y + offset).setData('contactShadow', contactShadow).setData('wardStatic',true)
    }
    private wall(key: string, from: GroundPoint, to: GroundPoint) {
      const entry = this.registration.environment[key]
      if (entry.footprint) drawRegisteredWall(this, key, entry, from, to)
    }
    private lowWall(from: GroundPoint, to: GroundPoint, reference = false) {
      wallFinish(this, from, to, reference)
    }
    private text(text: string, p: GroundPoint, color = '#365064', size = 14) {
      const at = projectGround(p)
      return this.add.text(at.x, at.y, text, { fontFamily: 'Google Sans Text, sans-serif', fontSize: `${size}px`, color, align: 'center', backgroundColor: '#f4f2e900', padding: { x: 7, y: 5 } }).setOrigin(0.5).setDepth(1200)
    }
    private occupiedBed(point: GroundPoint, onClick: () => void) {
      const at = projectGround(point)
      return [this.prop('reference-bed-table', point, 230).setDepth(at.y + 10)
        .setInteractive({ useHandCursor: true, pixelPerfect: true }).on('pointerup', (pointer: Phaser.Input.Pointer) => { if (wardCanvasPointer(pointer, this)) onClick() })]
    }
    private drawHospital() {
      const tasks = bridge!.tasks
      this.patientsKey = tasks.map((task) => `${task.id}:${Boolean(task.simulation?.discharged)}`).join('|')
      this.upgradeKey = JSON.stringify(bridge?.upgrades ?? {})
      this.animateSurroundings = drawHospitalSurroundings({ scene: this, rooms: tasks.length, upgrades: bridge?.upgrades ?? {},
        prop: this.prop.bind(this), polygon: this.polygon.bind(this), text: this.text.bind(this), wall: this.wall.bind(this), lowWall: this.lowWall.bind(this),
        frames: this.registration.nurse.frames, goTo: id => { if(!controller.paused)controller.goTo(id) }, openShop: () => { if (!controller.paused) options.onOpenShop() } })
      drawCorridorFloor(this)
      this.prop('reference-station', HOSPITAL_MAP.station.prop.point, HOSPITAL_MAP.station.prop.width)
      const station = projectGround(HOSPITAL_MAP.station.prop.point)
      this.stationScreen = this.add.rectangle(station.x - 34, station.y - 53, 8, 6, 0x548a89).setDepth(station.y + 2).setVisible(false)
      this.sampleTray = this.add.rectangle(station.x + 20, station.y - 43, 19, 10, 0xf1e5bf).setStrokeStyle(2, 0x837653).setDepth(station.y + 2).setVisible(false)
      this.text('NURSING STATION', { u: 1.4, v: 4.8 }).setVisible(false)
      this.roomFx = tasks.map((task, index) => drawPatientRoom(this.roomDrawing(), task, index, id => controller.goTo(id)))
      this.drawUpgrades()
      this.route = this.add.graphics().setDepth(1)
      this.destinationDrawKey = ''
      this.guidanceCaptionKey = ''
      this.destinationPin = this.add.graphics().setScrollFactor(0).setDepth(100000)
      this.destinationLabel = this.add.text(0, 0, '', { fontFamily: 'system-ui', fontSize: '12px', color: '#ffffff', backgroundColor: '#202626', padding: { x: 8, y: 5 } }).setScrollFactor(0).setDepth(100001).setOrigin(.5, 1).setVisible(false).setData('fixedSign', true)
      controller.targets().forEach((target) => {
        const at = projectGround(target.position)
        const graphic = this.add.circle(at.x, at.y, 24, 0x347f86, 0.08).setScale(1,44/72).setStrokeStyle(1.5, 0x347f86, 0.55).setDepth(-.6)
        const label = this.text(target.kind === 'station' ? 'Handoff' : target.kind === 'equipment' ? 'Monitor' : target.kind === 'safety' ? 'Safety' : 'Bedside', target.position, '#214b56', 11).setY(at.y + 25)
        label.setInteractive({ useHandCursor: true }).on('pointerup', (pointer: Phaser.Input.Pointer) => { if (wardCanvasPointer(pointer, this)) controller.goTo(target.id) })
        const hit = this.add.circle(at.x, at.y - 28, 38, 0xffffff, 0).setDepth(1100).setInteractive({ useHandCursor: true })
        hit.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (wardCanvasPointer(pointer, this)) controller.goTo(target.id) })
        hit.on('pointerover', () => { this.hoveredTarget = target.id; this.invalidate() })
        hit.on('pointerout', () => { this.hoveredTarget = null; this.invalidate() })
        const glow = createInteractionGlow(this, target, at.x, at.y)
        const icon=createInteractionIcon(this,target,at.x,at.y)
        label.setBackgroundColor('#00000000').setColor('#273c3c').setPadding(10,7).setY(at.y-48)
        const bubble = this.add.graphics().setDepth(label.depth-1)
        this.indicators.push({ target, graphic, glow, icon, label, bubble })
      })
      this.contact = actorContact(this)
      this.nurse = this.add.sprite(0, 0, 'nurse-03', 'se-idle-0').setScale(WARD_ART_STANDARD.nurseScale)
      this.workFx = this.add.graphics().setDepth(1300)
        this.workLabel = this.text('', { u: 0, v: 0 }, '#214b56', 12).setVisible(false)
        flushArchitectureAtlas(this)
        this.cullEntries=[];this.upperWalls=[];this.sceneLabels=[];this.vectorCount=0
        for(const item of this.children.list) {
          if(item instanceof Phaser.GameObjects.Text)this.sceneLabels.push(item)
          if(item.type==='Graphics')this.vectorCount++
          if(item instanceof Phaser.GameObjects.Image) {
            const crop=item.getData('wardCullBounds') as ViewBounds | undefined
            if(crop)this.cullEntries.push({object:item,bounds:{...crop,top:item.y}})
            else if(item.getData('wardStatic')) {
              const bounds=item.getBounds()
              this.cullEntries.push({object:item,bounds:{left:bounds.x,top:bounds.y,width:bounds.width,height:bounds.height}})
            }
            if(item.getData('upperWall'))this.upperWalls.push({object:item,room:item.getData('clinicalRoom') as number})
          }
        }
        this.cullViewKey=''
    }
    private roomDrawing(): RoomDrawing {
      return { scene: this, polygon: this.polygon.bind(this), prop: this.prop.bind(this), text: this.text.bind(this),
        lowWall: this.lowWall.bind(this), wall: this.wall.bind(this), occupiedBed: this.occupiedBed.bind(this) }
    }
    private drawUpgrades() {
      const rendered = drawWardUpgrades(this.roomDrawing(), bridge!, () => controller.paused, options.onOpenShop)
      this.equipmentLabels = rendered.labels; this.scanners = rendered.scanners
      this.staff = createStaffVisuals(this, this.text.bind(this), bridge?.upgrades ?? {})
    }
    private animateWard(refreshUi: boolean) {
      const reduced = bridge?.reducedMotion
      if(this.elapsed-this.lastAmbientAt>=WARD_RENDER_BUDGET.ambientMs || this.lastAmbientAt===-Infinity) {
        this.animateSurroundings?.(this.elapsed, Boolean(reduced));this.lastAmbientAt=this.elapsed
      }
      const player = controller.snapshot()
      const active = bridge?.worldJobs?.filter(worldJobActive) ?? []
      const charting = active.some((job) => job.kind === 'chart')
      this.stationScreen.setFillStyle(charting ? 0xa7ead2 : 0x548a89).setAlpha(charting && !reduced ? 0.8 + Math.sin(this.elapsed / 160) * 0.2 : 1)
      this.sampleTray.setVisible(Boolean(bridge?.worldJobs?.some((job) => job.kind === 'lab' && (job.phase === 'reporting' || job.phase === 'complete'))))
      for (const scanner of this.scanners) {
        const scanning = active.some((job) => job.taskId === scanner.taskId && job.kind === 'scanner')
        const done = bridge?.tasks.find((task) => task.id === scanner.taskId)?.simulation?.scannerUsed
        scanner.light.setFillStyle(scanning ? 0x6df2bc : done ? 0x6fa990 : 0x214b56).setAlpha(scanning && !reduced ? 0.7 + Math.sin(this.elapsed / 130) * 0.3 : 1)
      }
      if (refreshUi) for (const item of this.equipmentLabels) item.label.setVisible(!this.touch && !controller.paused && !bridge?.playerWorking && Math.hypot(player.position.u - item.point.u, player.position.v - item.point.v) < 1.8)
      if(refreshUi) {
      sound.configure(bridge?.soundEnabled !== false, Boolean(bridge?.paused || document.hidden))
      if (!this.seenJobs) this.seenJobs = new Set(bridge?.worldJobs?.filter((job) => job.phase === 'complete').map((job) => job.id))
      for (const job of bridge?.worldJobs ?? []) if (job.phase === 'complete' && !this.seenJobs.has(job.id)) { this.seenJobs.add(job.id); if (job.kind !== 'chart') sound.cue('complete') }
      const careKeys = bridge?.tasks.map(task => `${bridge?.shiftId}:${task.id}:${task.careProgress?.steps.join(',') ?? ''}`) ?? []
      if (!this.seenCare) this.seenCare = new Set(careKeys)
      careKeys.forEach((key, index) => {
        if (!this.seenCare!.has(key)) {
          this.seenCare!.add(key)
          if (bridge?.tasks[index].careProgress?.steps.length) this.completionPending = true
        }
      })
      if (this.completionPending && !controller.paused) { sound.cue('complete'); this.completionPending = false }
      if (!this.seenCalls) this.seenCalls = new Set(bridge?.calls?.map((call) => call.id))
      for (const call of bridge?.calls ?? []) if (!this.seenCalls.has(call.id)) { this.seenCalls.add(call.id); this.bellPending = true }
      }
      if (this.bellPending && !bridge?.paused && !document.hidden) { sound.cue('bell'); this.bellPending = false }
      if (player.moving && player.footfall !== this.lastFootfall) sound.cue(HOSPITAL_MAP.rooms.some(room => { const u=player.position.u-room.origin.u,v=player.position.v-room.origin.v,b=HOSPITAL_MAP.roomTemplate.bounds;return u>b.minU&&u<b.maxU&&v>b.minV&&v<b.maxV }) ? 'step-soft' : 'step')
      this.lastFootfall = player.footfall
      if (refreshUi) for (const fx of this.roomFx) {
        const task = bridge!.tasks.find((item) => item.id === fx.taskId)!
        for (const layer of fx.patient) layer.setVisible(!task.simulation?.discharged)
        const step = nextCareStep(task), count = task.status === 'completed' ? 6 : task.careProgress?.steps.length ?? 0
        const response = patientResponse(task)
        const call = bridge?.calls?.find((call) => call.taskId === task.id && (call.status === 'ringing' || call.status === 'assigned' || call.status === 'missed'))
        const key = `${task.status}:${count}:${task.simulation?.condition}:${call?.status}`
        fx.light.setFillStyle(task.status === 'completed' ? 0x60977a : task.status === 'failed' || task.status === 'deteriorating' ? 0xbf755d : count === 0 ? 0xe3b565 : 0x7ba2a5)
        fx.light.setAlpha(reduced || count || task.status === 'failed' ? 1 : 0.7 + Math.sin(this.elapsed / 650) * 0.25)
        const comfort = bridge?.calls?.some((item) => item.taskId === task.id && item.kind === 'comfort' && item.status === 'answered')
        fx.ambient.setVisible(Boolean(comfort))
        if (comfort) fx.light.setFillStyle(0xf6db9b).setAlpha(1)
        if (call) fx.light.setFillStyle(call.kind === 'change' ? 0xd36148 : 0xf0bf5f).setAlpha(reduced || bridge?.paused ? 1 : 0.65 + Math.sin(this.elapsed / 260) * 0.3)
        if (!fx.monitor.getData('referenceMonitor')) fx.monitor.setTint(task.simulation?.condition === 'worsening' ? 0xffb8a0 : task.simulation?.condition === 'improving' || task.simulation?.condition === 'stable' ? 0xb2f5ca : 0xffffff)
        if (key !== fx.previous) {
          if (fx.previous) {
            fx.reaction.setText(task.simulation ? `${response.expression}\n${response.dialogue}` : task.status === 'completed' ? 'Ready for handoff' : count >= 5 ? 'Thanks for checking on me.' : count >= 4 ? 'Care provided' : count ? 'Thanks for checking.' : 'Could you check on me?')
            fx.until = this.elapsed + 3400
          }
          fx.previous = key
          fx.progress.clear()
          for (let i = 0; i < HOSPITAL_MAP.rooms.length; i++) fx.progress.fillStyle(i < count ? 0x5b9680 : 0xcedbd4).fillRect(fx.point.x + i * 11, fx.point.y, 8, 4)
        }
        if (call) fx.reaction.setText(call.status === 'assigned' ? 'Support staff assigned' : call.kind === 'change' ? 'Call bell ringing\nSymptoms changing' : 'Call bell ringing\nComfort request')
        else if (task.simulation) fx.reaction.setText(`${response.expression}\n${response.dialogue}`)
        fx.reaction.setVisible(!task.simulation?.discharged && !active.some((job) => job.taskId === task.id) && (bridge?.selectedTaskId === task.id || player.nearby?.taskId === task.id) && !controller.paused && (Boolean(call) || this.elapsed < fx.until))
        // The mattress stays registered to its wheels; patient feedback uses the reaction caption.
        fx.progress.setVisible(bridge?.selectedTaskId === task.id && !fx.reaction.visible)
        if (!task.simulation && step === 'assessment' && !count && this.elapsed < 3200) { fx.reaction.setText('Could you check on me?'); fx.reaction.setVisible(true) }
      }
      for (const fx of this.roomFx) fx.reaction.animate(this.elapsed, Boolean(reduced))
      const jobState = { ...bridge!, paused: Boolean(bridge?.paused || document.hidden) }
      const occupied: GroundPoint[] = [player.position]
      for (const staff of this.staff) {
        const job = bridge?.worldJobs?.find((job) => job.kind === staff.kind && worldJobActive(job))
        const actor = this.actors[staff.kind]
        actor.tick(jobState, job, this.staffDelta)
        const pose = actor.snapshot()
        const goal = spaceWardActor(pose.position, occupied, bridge!.tasks.length)
        const presentation = this.staffPresentation[staff.kind]
        const displayPoint = presentation.update(goal, bridge!.tasks.length, this.staffDelta, jobState.paused)
        occupied.push(displayPoint)
        const at = projectGround(displayPoint)
        presentStaff(staff, pose, presentation, at, job, Boolean(reduced), this.elapsed, refreshUi, this.registration.nurse.frames)
      }
      const playerJob = bridge?.worldJobs?.find((job) => ['scanner', 'chart'].includes(job.kind) && worldJobActive(job))
      if(playerJob||this.playerJobKey)this.workFx.clear()
      this.workLabel.setVisible(Boolean(playerJob))
      if (playerJob) {
        const key = `${bridge!.shiftId}:${playerJob.id}:${playerJob.phase}`
        if (key !== this.playerJobKey) {
          this.playerJobKey = key; this.playerWorkMs = 0; this.playerReported = false
          if (playerJob.kind === 'scanner') sound.cue('scan')
          controller.restorePosition(playerJob.anchor)
        }
        if (!jobState.paused) this.playerWorkMs += this.staffDelta
        const at = controller.snapshot().screenPosition, ratio = Math.min(1, this.playerWorkMs / worldWorkMs(playerJob.phase))
        this.workLabel.setText(`${playerJob.kind === 'scanner' ? 'Scanning' : 'Charting'} · ${Math.round(ratio * 100)}%${jobState.paused ? ' · Paused' : ''}`).setPosition(at.x, at.y - 94)
        this.workFx.fillStyle(0xcbd8d1).fillRect(at.x - 35, at.y - 72, 70, 5).fillStyle(0x39866e).fillRect(at.x - 35, at.y - 72, 70 * ratio, 5)
        if (playerJob.kind === 'scanner') {
          const index = bridge!.tasks.findIndex((task) => task.id === playerJob.taskId)
          const bed = projectGround(roomPoint(index, ROOM_PROPS.bed))
          const sweep = reduced ? 0 : Math.sin(this.elapsed / 180) * 9
          this.workFx.lineStyle(2, 0x5bf2c0, 0.8).lineBetween(at.x + 8, at.y - 30, bed.x + 20, bed.y - 45 + sweep)
        } else {
          for (let i = 0; i < 3; i++) this.workFx.lineStyle(2, 0x39866e).lineBetween(at.x + 18, at.y - 52 + i * 6, at.x + 18 + (reduced ? 20 : 20 * ratio), at.y - 52 + i * 6)
        }
        const target = controller.targets().find((target) => target.id === (playerJob.kind === 'chart' ? 'station' : `safety:${playerJob.taskId}`))
        if (target) controller.faceTarget(target)
        const direction = controller.snapshot().direction
        const frame = `${direction}-${reduced ? 'idle-0' : `${playerJob.kind === 'chart' ? 'chart' : 'assess'}-${Math.floor(this.elapsed / 140) % 8}`}`
        const pivot = this.registration.nurse.frames[frame]
        this.nurse.setFrame(frame).setOrigin(pivot.pivotX, pivot.pivotY).setPosition(at.x, at.y).setDepth(at.y + 1)
        this.lastFrame = frame
        if (!this.playerReported && ratio >= 1) {
          this.playerReported = true
          report(playerJob.id, playerJob.phase, controller.snapshot().position, this.playerWorkMs, bridge!.shiftId)
        }
      } else {
        this.playerJobKey = ''
        if (player.workKind && player.caring) this.workLabel.setText(player.workKind === 'treat' ? '✓ Bedside care recorded' : '✓ Bedside check recorded').setPosition(player.screenPosition.x, player.screenPosition.y - 98).setVisible(true)
      }
      this.staffDelta = 0
    }
    private placeLabels() {
      const boxes = [this.nurse, ...this.staff.map((staff) => staff.sprite)].map((sprite) => sprite.getBounds())
      const labels = this.sceneLabels.filter(item => item.visible && !item.getData('fixedSign'))
      labels.sort((a, b) => Number(b === this.workLabel) - Number(a === this.workLabel))
      for (const label of labels) {
        const originalY = label.y
        let bounds = label.getBounds(), attempts = 0
        while (boxes.some((box) => Phaser.Geom.Intersects.RectangleToRectangle(bounds, box)) && attempts++ < 10) { label.y -= 10; bounds = label.getBounds() }
        if (label.y !== originalY) this.shiftedLabels.push({ label, y: originalY })
        if (boxes.some((box) => Phaser.Geom.Intersects.RectangleToRectangle(bounds, box)) && label !== this.workLabel) {
          if (label.y === originalY) this.shiftedLabels.push({ label, y: originalY })
          label.setVisible(false)
        } else boxes.push(bounds)
      }
    }
    sync() {
      if (!loaded) return
      const now = performance.now()
      // Keep movement and work timers full-rate; captions and diagnostics need only 10 Hz.
      const refreshUi = this.uiDirty || now - this.lastUiAt >= WARD_RENDER_BUDGET.uiMs
      if (refreshUi) {
        this.lastUiAt = now
        this.uiDirty = false
        for (const item of this.shiftedLabels) if (item.label.active) item.label.setY(item.y).setVisible(true)
        this.shiftedLabels = []
        if (this.upgradeKey !== JSON.stringify(bridge?.upgrades ?? {}) || this.patientsKey !== bridge?.tasks.map((task) => `${task.id}:${Boolean(task.simulation?.discharged)}`).join('|')) {
          this.children.removeAll(true); this.indicators = []; this.roomFx = []; this.staff = []; this.equipmentLabels = []; this.scanners = []; this.lastFrame = ''
          this.hoveredTarget = null
          this.drawHospital()
        }
      }
      const s = controller.snapshot()
      if(refreshUi) this.upperWalls.forEach(({object,room})=>{
          const task=bridge?.tasks[room]
          const active=task && (task.id===bridge?.selectedTaskId || task.id===s.nearby?.taskId)
          object.setAlpha(active ? .12 : .32)
      })
      this.lastFrame = presentPlayer(this.nurse, this.contact, s, this.registration.nurse.frames, this.lastFrame)
      if (refreshUi || now - this.lastRouteAt >= WARD_RENDER_BUDGET.routeMs) {
        this.lastRouteAt = now
        this.route.clear().lineStyle(2, 0x347f86, 0.6)
        if (s.path.length) this.route.strokePoints([s.screenPosition, ...s.path.map(projectGround)].map((p) => new Phaser.Math.Vector2(p.x, p.y)))
      }
      if (refreshUi) this.indicators.forEach(cue => updateInteractionCue(cue, bridge, s.nearby, this.hoveredTarget, controller.paused, s.destination, this.touch))
      this.followNurse(this.staffDelta)
      // A single camera-space beacon stays readable even when the room is off-screen.
      const suggested = controller.targets().find(target => target.id === bridge?.suggestedTargetId)
      const guided = !controller.paused && !s.caring && s.nearby?.id !== suggested?.id ? suggested : undefined
      const endpoint = s.path.at(-1) ?? guided?.position
      this.destinationLabel.setVisible(!this.touch && Boolean(endpoint))
      if (!endpoint && this.destinationDrawKey) { this.destinationPin.clear(); this.destinationDrawKey = '' }
      const destination = endpoint ? s.destination?.label ?? guided?.label ?? 'Walk here' : ''
      if(options.parent.dataset.destination!==destination)options.parent.dataset.destination=destination
      if (endpoint) {
        const view = cameraWorldBounds(this.cameras.main), point = projectGround(endpoint)
        const x = (point.x - view.left) * this.cameras.main.zoom
        const y = (point.y - view.top) * this.cameras.main.zoom
        const footer = this.touch && this.scale.width > this.scale.height ? 100 : 150
        const target = s.destination ?? guided
        const task = bridge?.tasks.find(task => task.id === target?.taskId)
        const caption = target?.kind === 'station' ? 'Nursing station' : task ? `${task.room} · ${target?.kind === 'patient' ? CARE_LABELS[nextCareStep(task) ?? 'assessment'] : target?.kind === 'safety' ? 'Safety check' : 'Monitor'}` : 'Walk here'
        if(caption!==this.guidanceCaptionKey){this.guidanceCaptionKey=caption;this.destinationLabel.setText(caption)}
        const margin = this.destinationLabel.width / 2 + 12
        const pinX = Phaser.Math.Clamp(x, margin, this.scale.width - margin)
        const pinY = Phaser.Math.Clamp(y, 55, Math.max(55, this.scale.height - footer))
        const offscreen = Math.abs(pinX - x) > 1 || Math.abs(pinY - y) > 1
        const angle = Math.atan2(y - pinY, x - pinX)
        const key = `${caption}:${pinX.toFixed(1)}:${pinY.toFixed(1)}:${angle.toFixed(2)}:${offscreen}:${this.scale.width}:${this.scale.height}:${this.cameras.main.zoom}`
        if (key !== this.destinationDrawKey) {
        this.destinationDrawKey = key
        const zoom = this.cameras.main.zoom, centerX = this.scale.width / 2, centerY = this.scale.height / 2
        const px = pinX - centerX, py = pinY - centerY
        this.destinationPin.clear().setPosition(centerX, centerY).setScale(1 / zoom).lineStyle(2, 0xffffff, .95).fillStyle(0xc72533, .9)
        if (offscreen) {
          const tip = { x: px + Math.cos(angle) * 12, y: py + Math.sin(angle) * 12 }
          this.destinationPin.fillTriangle(tip.x, tip.y, px + Math.cos(angle + 2.3) * 8, py + Math.sin(angle + 2.3) * 8, px + Math.cos(angle - 2.3) * 8, py + Math.sin(angle - 2.3) * 8)
        } else this.destinationPin.fillCircle(px, py, 7).strokeCircle(px, py, 10)
        this.destinationLabel.setScale(1 / zoom).setPosition(centerX + px / zoom, centerY + (py - 17) / zoom)
        }
      }
      // CameraManager otherwise renders every column, even outside the viewport.
      // Cull actual crop bounds, rather than each column's full parent wall size.
      const camera=this.cameras.main,view=cameraWorldBounds(camera)
      const viewKey=`${view.left}:${view.top}:${view.width}:${view.height}`
      if(viewKey!==this.cullViewKey){
        this.cullViewKey=viewKey
        for(const {object,bounds} of this.cullEntries){
          const filter=cropIntersectsView(bounds,view)?0:camera.id
          if(object.cameraFilter!==filter)object.cameraFilter=filter
        }
      }
      this.animateWard(refreshUi)
      if (refreshUi) {
        this.placeLabels()
        this.indicators.forEach(({bubble,label}) => bubble.setVisible(label.visible).setPosition(label.x,label.y))
      }
      const status = controller.status()
      if (bridge?.playerWorking && !bridge.paused && !document.hidden) { const job = bridge.worldJobs?.find(job => worldJobActive(job) && ['chart', 'scanner'].includes(job.kind)); status.workKind = job?.kind === 'chart' ? 'chart' : 'scanner'; status.label = status.workKind === 'chart' ? 'Charting care…' : 'Scanning at bedside…'; status.caring = true }
      const key = `${status.label}:${status.workKind}:${status.moving}:${status.caring}:${status.nearby?.id ?? ''}`
      if (key !== lastStatus) { lastStatus = key; options.onStatus(status) }
      if (refreshUi) {
        options.parent.dataset.renderFps=this.sceneUpdateFps.toFixed(1)
        options.parent.dataset.renderCpuMs=this.renderCpuMs.toFixed(2)
        options.parent.dataset.renderObjects=String(this.children.length)
        options.parent.dataset.vectorObjects=String(this.vectorCount)
        options.parent.dataset.backgroundActors = '0'
        options.parent.dataset.currentFloor = String(HOSPITAL_MAP.floor)
        options.parent.dataset.lockedElevators = String(HOSPITAL_MAP.elevators.length)
        options.parent.dataset.ambientTime = this.elapsed.toFixed(0)
        options.parent.dataset.overview = String(this.overview)
        options.parent.dataset.cameraZoom = this.cameras.main.zoom.toFixed(2)
        options.parent.dataset.workAnimation = this.playerJobKey ? (bridge?.worldJobs?.find(job => job.id && worldJobActive(job) && ['chart', 'scanner'].includes(job.kind))?.kind ?? '') : s.workKind ?? ''
        options.parent.dataset.interactionIcons = String(this.indicators.filter(item=>item.icon).length)
        options.parent.dataset.visibleMarkers = String(this.indicators.filter(item => item.graphic.visible).length)
        options.parent.dataset.mapRooms = String(HOSPITAL_MAP.rooms.length)
        options.parent.dataset.lockedRooms = String(HOSPITAL_MAP.rooms.length - availableRoomCount(bridge!.tasks.length, bridge?.upgrades))
        const diagnostics = { nurseCount: String(1 + this.staff.length), installedUpgrades: this.upgradeKey, nurseFrame: String(this.nurse.frame.name), nurseU: s.position.u.toFixed(3), nurseV: s.position.v.toFixed(3), moving: String(s.moving), stride: s.strideDistance.toFixed(2), facing: s.direction, speed: s.speed.toFixed(1), nearby: s.nearby?.id ?? '', worldJobs: JSON.stringify(bridge?.worldJobs?.map(({kind, phase}) => ({kind, phase})) ?? []), carePhase: bridge?.playerWorking ? 'working' : s.caring ? 'caring' : s.moving ? 'walking' : 'ready' }
        for (const [k, v] of Object.entries(diagnostics)) if (options.parent.dataset[k] !== v) options.parent.dataset[k] = v
      }
    }
    update(_time: number, delta: number) {
      if (!loaded || destroyed) return
      this.frameWindowCount++
      const frameNow=performance.now()
      if(frameNow-this.frameWindowAt>=1000) {
        this.sceneUpdateFps=this.frameWindowCount*1000/(frameNow-this.frameWindowAt)
        this.frameWindowCount=0;this.frameWindowAt=frameNow
      }
      const paused = bridge?.paused || document.hidden
      if (!paused) this.elapsed += Math.min(delta, 50)
      this.staffDelta = paused ? 0 : Math.min(delta, 50)
      const x = direction.x + Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'))
      const y = direction.y + Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup'))
      controller.tick(delta, { x, y }); this.sync()
    }
  }
  const scene = new WardScene()
  // target is Phaser's timing baseline, not a cap. rAF follows display refresh;
  // limit:0 explicitly allows 90/120/144 Hz without a timer-forced render loop.
  void prepareWardArtwork(artworkAbort.signal).then(prepared => {
    artwork = prepared
    if (destroyed) { prepared.release(); return }
    options.parent.dataset.artworkCacheHits = String(prepared.hits)
    game = new Phaser.Game({ type: Phaser.AUTO, parent: options.parent, width: Math.max(1, options.parent.clientWidth), height: Math.max(1, options.parent.clientHeight), transparent: true, scene, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, fps: { target: 60, limit: 0, forceSetTimeOut: false }, render: { antialias: true }, audio: { noAudio: true }, input: { activePointers: 3, keyboard: false } })
  }).catch(() => { if (!destroyed) options.onError('Hospital artwork could not load.') })
  const onKeyDown = (event: KeyboardEvent) => {
    if (controller.paused || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))) return
    const key = event.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { event.preventDefault(); held.add(key) }
    if (key === 'e' && !event.repeat) { event.preventDefault(); controller.interact() }
  }
  const onKeyUp = (event: KeyboardEvent) => held.delete(event.key.toLowerCase())
  const onVisibility = () => { resetInput(); controller.setHidden(document.hidden); scene.invalidate(); scene.sync() }
  window.addEventListener('pointerdown', unlockSound, true); window.addEventListener('keydown', unlockSound)
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', resetInput); document.addEventListener('visibilitychange', onVisibility)
  const observer = new ResizeObserver(() => { if (!destroyed && game) { game.scale.getParentBounds(); game.scale.refresh() } })
  observer.observe(options.parent); controller.setHidden(document.hidden)
  return {
    update(state) {
      if (!bridge || Object.keys(state).some((key) => state[key as keyof WardState] !== bridge![key as keyof WardState])) scene.invalidate()
      bridge = state; controller.update(state); if (state.paused) resetInput(); scene.sync()
    },
    setOverview: (enabled) => scene.setOverview(enabled),
    goTo: (id) => controller.goTo(id),
    setDirection(x, y) { direction = controller.paused ? { x: 0, y: 0 } : { x, y } },
    interact: () => controller.interact(),
    snapshot: () => controller.snapshot(),
    destroy() {
      destroyed = true; observer.disconnect(); resetInput()
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', resetInput); document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointerdown', unlockSound, true); window.removeEventListener('keydown', unlockSound)
      artworkAbort.abort(); artwork?.release()
      sound.destroy(); game?.destroy(true)
    },
  }
}
