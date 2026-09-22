import Phaser from 'phaser'
import {
  ROOM_BOUNDS,
  TycoonCarePresentation,
  projectGround,
  type CareSnapshot,
  type GroundPoint,
  type HospitalBridgeState,
  type HospitalStatus,
  type ScreenPoint,
} from './tycoon-care-presentation'

export type { HospitalBridgeState, HospitalStatus } from './tycoon-care-presentation'

export interface TycoonHospital {
  update(state: HospitalBridgeState): void
  snapshot(): CareSnapshot
  destroy(): void
}

export interface TycoonHospitalOptions {
  parent: HTMLElement
  onSelectRoom: () => void
  onStatus?: (status: HospitalStatus) => void
  onError?: (message: string) => void
}

interface EnvironmentRegistration {
  width: number
  height: number
  visibleBounds: { x: number; y: number; width: number; height: number }
  groundOrigin: { x: number; y: number }
  footprint?: { baseLine: [number, number][] }
}

interface ArtworkRegistration {
  environment: Record<string, EnvironmentRegistration>
  nurse: { frames: Record<string, { pivotX: number; pivotY: number }> }
}

const ASSET_BASE = '/game-assets/hospital-prototype/'
const environmentKeys = [
  'station-rear', 'wall-northwest', 'wall-northeast',
  'patient-bed-overlay', 'equipment-monitor', 'equipment-iv-pole',
  'furniture-bedside-cabinet', 'decor-potted-plant',
] as const
const roomCorners = [
  { u: ROOM_BOUNDS.minU, v: ROOM_BOUNDS.minV },
  { u: ROOM_BOUNDS.maxU, v: ROOM_BOUNDS.minV },
  { u: ROOM_BOUNDS.maxU, v: ROOM_BOUNDS.maxV },
  { u: ROOM_BOUNDS.minU, v: ROOM_BOUNDS.maxV },
].map(projectGround)

/** React supplies store snapshots; this renderer has no access to store actions. */
export function createTycoonHospital(options: TycoonHospitalOptions): TycoonHospital {
  const presentation = new TycoonCarePresentation()
  let bridge: HospitalBridgeState | null = null
  let destroyed = false
  let loaded = false
  let lastPhase: string | undefined
  let errorReported = false

  const reportError = (message: string) => {
    if (!destroyed && !errorReported) {
      errorReported = true
      options.onError?.(message)
    }
  }

  const reportStatus = () => {
    const status = presentation.status()
    if (lastPhase !== status.phase && !destroyed) {
      lastPhase = status.phase
      options.onStatus?.(status)
    }
  }

  class HospitalScene extends Phaser.Scene {
    private registration!: ArtworkRegistration
    private nurse?: Phaser.GameObjects.Sprite
    private nurseShadow?: Phaser.GameObjects.Ellipse
    private careBadge?: Phaser.GameObjects.Container
    private careBadgeText?: Phaser.GameObjects.Text
    private roomOutline?: Phaser.GameObjects.Graphics
    private routeMarkers?: Phaser.GameObjects.Graphics
    private roomHitArea?: Phaser.GameObjects.Polygon
    private roomLabel?: Phaser.GameObjects.Container
    private lastFrame = ''
    private lastSelected: boolean | undefined
    private lastCarePhase = ''
    private hovering = false

    constructor() { super('room-101') }

    preload() {
      this.load.json('hospital-registration', `${ASSET_BASE}registration.json`)
      environmentKeys.forEach((key) => this.load.image(key, `${ASSET_BASE}${key}.png`))
      this.load.atlas('nurse-03', `${ASSET_BASE}nurse-03-animation-sheet.png`, `${ASSET_BASE}nurse-03-atlas.json`)
      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        reportError(`The hospital artwork could not load (${file.key}). Please reload the scene.`)
      })
    }

    create() {
      if (destroyed) return
      this.registration = this.cache.json.get('hospital-registration') as ArtworkRegistration
      if (!this.registration || environmentKeys.some((key) => !this.textures.exists(key)) || !this.textures.exists('nurse-03')) {
        reportError('The hospital artwork is incomplete. Please reload the scene.')
        return
      }
      try {
        this.drawHospital()
        loaded = true
        this.fitCamera()
        this.syncPresentation()
        this.scale.on('resize', this.fitCamera, this)
        this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this))
        reportStatus()
      } catch (error) {
        reportError(error instanceof Error ? error.message : 'The hospital scene could not start.')
      }
    }

    private fitCamera() {
      const { width, height } = this.scale.gameSize
      const compact = width < 900
      // The floor continues beyond the camera. Frame the occupied room and the
      // station, rather than fitting the old 1200 × 760 presentation rectangle.
      // Keep both activity anchors and the entire care route in view on phones.
      // Only the extreme decorative wall edge may continue outside the view.
      const availableWidth = compact ? width : width - 328
      const top = compact ? Math.min(210, height * 0.28) : 104
      const bottom = compact ? 76 : 60
      const availableHeight = Math.max(height - top - bottom, 180)
      const zoom = Math.min(availableWidth / (compact ? 800 : 840), availableHeight / 550)
      const targetX = compact ? width / 2 : 16 + availableWidth / 2
      const targetY = top + availableHeight / 2
      const centerX = (compact ? 705 : 708) + (width / 2 - targetX) / zoom
      const centerY = 367 + (height / 2 - targetY) / zoom
      this.cameras.main.setZoom(zoom).centerOn(centerX, centerY)
      // Anchored labels retain readable text at narrow viewport scales.
      const labelX = width / 2 + (940 - centerX) * zoom
      const visibleLabelX = Phaser.Math.Clamp(labelX, 79, width - 79)
      this.roomLabel?.setScale(1 / zoom).setX(940 + (visibleLabelX - labelX) / zoom)
      this.careBadge?.setScale(1 / zoom)
      options.parent.dataset.roomHitX = String(width / 2 + (884.4 - centerX) * zoom)
      options.parent.dataset.roomHitY = String(height / 2 + (377.4 - centerY) * zoom)
    }

    private polygon(points: ScreenPoint[], fill: number, alpha = 1, depth = 0) {
      const graphic = this.add.graphics().setDepth(depth)
      graphic.fillStyle(fill, alpha).fillPoints(points.map(({ x, y }) => new Phaser.Math.Vector2(x, y)), true)
      return graphic
    }

    private groundLabel(text: string, u: number, v: number, color = '#4e6579', size = 15) {
      const point = projectGround({ u, v })
      return this.add.text(point.x, point.y, text, {
        fontFamily: 'Google Sans Text, sans-serif', fontSize: `${size}px`, fontStyle: '600', color,
        align: 'center', padding: { x: 7, y: 5 },
      }).setOrigin(0.5).setDepth(1200)
    }

    private prop(key: string, point: GroundPoint, visibleWidth: number, depthOffset = 0) {
      const entry = this.registration.environment[key]
      const at = projectGround(point)
      return this.add.image(at.x, at.y, key)
        .setOrigin(entry.groundOrigin.x, entry.groundOrigin.y)
        .setScale(visibleWidth / entry.visibleBounds.width)
        .setDepth(at.y + depthOffset)
    }

    private wall(key: string, from: GroundPoint, to: GroundPoint) {
      const line = this.registration.environment[key].footprint?.baseLine
      if (!line) return
      const a = projectGround(from)
      const b = projectGround(to)
      // Register both base endpoints to the chosen 1.64:1 floor projection.
      const sx = (b.x - a.x) / (line[1][0] - line[0][0])
      const sy = (b.y - a.y) / (line[1][1] - line[0][1])
      this.add.image(a.x - line[0][0] * sx, a.y - line[0][1] * sy, key)
        .setOrigin(0, 0).setScale(sx, sy).setDepth(Math.min(a.y, b.y) - 50)
    }

    private lowWall(from: GroundPoint, to: GroundPoint) {
      const a = projectGround(from)
      const b = projectGround(to)
      this.polygon([a, b, { x: b.x, y: b.y - 21 }, { x: a.x, y: a.y - 21 }], 0x7a93a7, 1, Math.max(a.y, b.y))
      const cap = this.add.graphics().setDepth(Math.max(a.y, b.y) + 1)
      cap.lineStyle(7, 0xf2f3ee).lineBetween(a.x, a.y - 21, b.x, b.y - 21)
    }

    private drawHospital() {
      // The source floor diamond is not a validated seamless texture. Continue
      // its cream palette with a procedural grid in the exact same projection,
      // so the hospital remains a full-bleed world at every screen proportion.
      const floor = this.add.graphics().setDepth(-5)
      floor.fillStyle(0xe9e6dc).fillRect(-10000, -10000, 20000, 20000)
      floor.lineStyle(1, 0xcdd1c9, 0.55)
      for (let tile = -36; tile <= 36; tile += 1) {
        const alongU = [projectGround({ u: tile, v: -36 }), projectGround({ u: tile, v: 36 })]
        const alongV = [projectGround({ u: -36, v: tile }), projectGround({ u: 36, v: tile })]
        floor.lineBetween(alongU[0].x, alongU[0].y, alongU[1].x, alongU[1].y)
        floor.lineBetween(alongV[0].x, alongV[0].y, alongV[1].x, alongV[1].y)
      }
      const hallway = [{ u: -36, v: 2.94 }, { u: 36, v: 2.94 }, { u: 36, v: 4.65 }, { u: -36, v: 4.65 }].map(projectGround)
      this.polygon(hallway, 0xfffcf1, 0.24, -4)

      this.polygon(roomCorners, 0xd6e8e8, 0.46, -1)
      // The entrance stays open. Low cutaway walls preserve the nurse sightline.
      this.wall('wall-northwest', { u: 3.7, v: 2.8 }, { u: 3.7, v: 0 })
      this.wall('wall-northeast', { u: 3.7, v: 0 }, { u: 7, v: 0 })
      this.lowWall({ u: 3.7, v: 2.8 }, { u: 5.12, v: 2.8 })
      this.lowWall({ u: 6.28, v: 2.8 }, { u: 7, v: 2.8 })
      const threshold = [{ u: 5.12, v: 2.71 }, { u: 6.28, v: 2.71 }, { u: 6.28, v: 2.91 }, { u: 5.12, v: 2.91 }].map(projectGround)
      this.polygon(threshold, 0x739aa3, 0.6, 0)

      this.routeMarkers = this.add.graphics().setDepth(1)
      this.roomOutline = this.add.graphics().setDepth(2)

      this.prop('station-rear', { u: 1.35, v: 3.6 }, 270)
      this.prop('decor-potted-plant', { u: 0.3, v: 4.95 }, 65)
      this.prop('decor-potted-plant', { u: 6.65, v: 5.45 }, 62)
      this.prop('furniture-bedside-cabinet', { u: 4.5, v: 0.58 }, 64)
      this.prop('equipment-monitor', { u: 4.46, v: 0.42 }, 65, 20)
      this.prop('equipment-iv-pole', { u: 6.32, v: 0.42 }, 48)

      // The audited patient image includes its own mattress and bedding. Register
      // this lightweight chassis to its visible hem; do not layer a second bed.
      const bedFootprint = [{ u: 4.65, v: 0.65 }, { u: 6.6, v: 0.65 }, { u: 6.6, v: 1.65 }, { u: 4.65, v: 1.65 }].map(projectGround)
      this.polygon(bedFootprint.map(({ x, y }) => ({ x, y: y + 2 })), 0x5a6b7c, 0.13, 2)
      const bedAt = projectGround({ u: 5.8, v: 1.12 })
      const mattress = this.registration.environment['patient-bed-overlay']
      const bedScale = 200 / mattress.visibleBounds.width
      const onMattress = (x: number, y: number, drop = 0): ScreenPoint => ({
        x: bedAt.x + (x - mattress.groundOrigin.x * mattress.width) * bedScale,
        y: bedAt.y + (y - mattress.groundOrigin.y * mattress.height) * bedScale + drop,
      })
      const chassis = this.add.graphics().setDepth(bedAt.y - 2)
      // Casters sit below the two near corners and the head end, with short
      // steel supports. Their anchors use the same source-space registration.
      for (const [sourceX, sourceY] of [[245, 584], [711, 1000], [1094, 861]]) {
        const support = onMattress(sourceX, sourceY, 6)
        chassis.lineStyle(6, 0xc4ced3).lineBetween(support.x, support.y, support.x, support.y + 10)
        chassis.fillStyle(0x344655).fillEllipse(support.x, support.y + 13, 9, 11)
        chassis.fillStyle(0x9aaab3).fillCircle(support.x, support.y + 13, 2)
      }
      const rail = [onMattress(214, 552, 2), onMattress(701, 1000, 2), onMattress(1124, 837, 2)]
      this.polygon([rail[0], rail[1], { x: rail[1].x, y: rail[1].y + 8 }, { x: rail[0].x, y: rail[0].y + 8 }], 0xdbe2e4, 1, bedAt.y - 1)
      this.polygon([rail[1], rail[2], { x: rail[2].x, y: rail[2].y + 8 }, { x: rail[1].x, y: rail[1].y + 8 }], 0xb4c2ca, 1, bedAt.y - 1)
      this.prop('patient-bed-overlay', { u: 5.8, v: 1.12 }, 200)

      this.groundLabel('NURSING STATION', 1.9, 4.15, '#48657e', 15)
      this.groundLabel('MAIN HALLWAY', 4.3, 5.1, '#89929a', 14)
      const labelPlate = this.add.rectangle(0, 0, 142, 43, 0x142d43, 0.26).setStrokeStyle(1, 0xffffff, 0.42)
      const labelTitle = this.add.text(0, -7, 'ROOM 101', {
        fontFamily: 'Google Sans Text, sans-serif', fontSize: '13px', fontStyle: '700', color: '#ffffff',
      }).setOrigin(0.5).setShadow(0, 1, '#142d43', 3, false, true)
      const labelPatient = this.add.text(0, 9, 'M. Carter', {
        fontFamily: 'Google Sans Text, sans-serif', fontSize: '11px', color: '#ffffff',
      }).setOrigin(0.5).setShadow(0, 1, '#142d43', 3, false, true)
      this.roomLabel = this.add.container(940, 126, [labelPlate, labelTitle, labelPatient]).setDepth(1200)
      labelPlate.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (!bridge?.paused && !document.hidden) options.onSelectRoom()
      })

      this.nurseShadow = this.add.ellipse(0, 0, 28, 11, 0x24425b, 0.18).setVisible(false)
      this.nurse = this.add.sprite(0, 0, 'nurse-03', 'se-idle-0').setScale(0.55).setVisible(false)
      const badgePlate = this.add.rectangle(0, 0, 144, 31, 0x142d43, 0.28).setStrokeStyle(1, 0xd8e5e4, 0.6)
      this.careBadgeText = this.add.text(0, 0, '', { fontFamily: 'Google Sans Text, sans-serif', fontSize: '12px', fontStyle: '600', color: '#ffffff' }).setOrigin(0.5).setShadow(0, 1, '#142d43', 3, false, true)
      this.careBadge = this.add.container(0, 0, [badgePlate, this.careBadgeText]).setDepth(1400).setVisible(false)

      this.roomHitArea = this.add.polygon(0, 0, roomCorners, 0xffffff, 0).setOrigin(0, 0).setDepth(1500)
      this.roomHitArea.setInteractive(new Phaser.Geom.Polygon(roomCorners), Phaser.Geom.Polygon.Contains)
      this.roomHitArea.input!.cursor = 'pointer'
      this.roomHitArea.on('pointerover', () => { this.hovering = true; this.drawRoomState() })
      this.roomHitArea.on('pointerout', () => { this.hovering = false; this.drawRoomState() })
      this.roomHitArea.on('pointerup', () => {
        if (!bridge?.paused && !document.hidden) options.onSelectRoom()
      })
      this.drawRoomState()
    }

    private drawRoomState() {
      if (!this.roomOutline || !this.routeMarkers) return
      this.roomOutline.clear()
      const highlighted = bridge?.selected || this.hovering
      this.roomOutline.lineStyle(highlighted ? 3 : 2, 0x318f9c, highlighted ? 0.8 : 0.32)
        .strokePoints(roomCorners.map(({ x, y }) => new Phaser.Math.Vector2(x, y)), true)
      this.routeMarkers.clear()
      const care = presentation.snapshot()
      if (care.phase === 'walking') {
        this.routeMarkers.fillStyle(0x88a8ae, 0.5)
        for (let u = 3; u <= 5.7; u += 0.35) {
          const at = projectGround({ u, v: 3.65 })
          this.routeMarkers.fillCircle(at.x, at.y, 3)
        }
      }
    }

    syncPresentation() {
      if (!loaded || !this.nurse || !this.nurseShadow) return
      const care = presentation.snapshot()
      const { x, y } = care.screenPosition
      this.nurse.setVisible(care.nurseCount === 1).setPosition(x, y).setDepth(y + 1)
      this.nurseShadow.setVisible(care.nurseCount === 1).setPosition(x, y + 1).setDepth(y - 1)
      if (care.frame !== this.lastFrame) {
        this.nurse.setFrame(care.frame)
        const registration = this.registration.nurse.frames[care.frame]
        this.nurse.setOrigin(registration.pivotX, registration.pivotY)
        this.lastFrame = care.frame
      }
      // The live HTML status already announces care. Keep this duplicate badge
      // off phones, where screen-sized text would obscure the patient artwork.
      this.careBadge?.setVisible(this.scale.gameSize.width >= 600 && (care.phase === 'caring' || care.phase === 'completed')).setPosition(x, y - 138)
      this.careBadgeText?.setText(care.phase === 'caring' ? 'Providing care…' : '✓ Care complete')
      if (this.lastSelected !== bridge?.selected || this.lastCarePhase !== care.phase) {
        this.lastSelected = bridge?.selected
        this.lastCarePhase = care.phase
        this.drawRoomState()
      }
      if (this.roomHitArea?.input) this.roomHitArea.input.enabled = !bridge?.paused
      const diagnostics = {
        carePhase: care.phase, nurseCount: String(care.nurseCount),
        nurseSpawns: String(care.spawnCount), nurseFrame: care.frame,
        nurseX: x.toFixed(1), nurseY: y.toFixed(1),
      }
      for (const [key, value] of Object.entries(diagnostics)) {
        if (options.parent.dataset[key] !== value) options.parent.dataset[key] = value
      }
      reportStatus()
    }

    update(_time: number, delta: number) {
      if (!loaded || destroyed) return
      presentation.tick(delta)
      this.syncPresentation()
    }
  }

  const scene = new HospitalScene()
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: Math.max(options.parent.clientWidth, 1),
    height: Math.max(options.parent.clientHeight, 1),
    backgroundColor: '#e9e6dc',
    transparent: false,
    scene,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    audio: { noAudio: true },
    input: { activePointers: 2 },
    fps: { target: 60, forceSetTimeOut: false },
  })

  const observer = new ResizeObserver(() => {
    if (!destroyed && options.parent.clientWidth && options.parent.clientHeight) {
      // RESIZE mode derives canvas dimensions from cached parent bounds. A
      // parent-only layout change must refresh those before refreshing the
      // scale, otherwise Phaser can restore the previous canvas dimensions.
      game.scale.getParentBounds()
      game.scale.refresh()
    }
  })
  observer.observe(options.parent)
  const onVisibility = () => { presentation.setHidden(document.hidden); scene.syncPresentation() }
  document.addEventListener('visibilitychange', onVisibility)
  presentation.setHidden(document.hidden)
  game.canvas?.setAttribute('aria-hidden', 'true')

  return {
    update(state) {
      if (destroyed) return
      bridge = { ...state }
      presentation.update(state)
      scene.syncPresentation()
      reportStatus()
    },
    snapshot: () => presentation.snapshot(),
    destroy() {
      if (destroyed) return
      destroyed = true
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      game.destroy(true)
    },
  }
}
