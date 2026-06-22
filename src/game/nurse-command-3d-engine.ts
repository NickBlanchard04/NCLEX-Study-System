import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type NurseCommandPatientStatus = 'stable' | 'watch' | 'urgent' | 'critical'

export interface NurseCommandPatient {
  id: string
  room: string
  name: string
  risk: NurseCommandPatientStatus
}

export interface NurseCommandEngineState {
  selectedPatientId?: string
  activeEventPatientIds?: string[]
  deterioratingPatientIds?: string[]
  completedPatientIds?: string[]
  delegatedPatientIds?: string[]
  onSelectPatient?: (patientId: string) => void
  onInteractPatient?: (patientId: string) => void
  onProximityChange?: (patientId: string | null) => void
}

export interface NurseCommand3DEngineOptions extends Required<NurseCommandEngineState> {
  mount: HTMLElement
  patients: NurseCommandPatient[]
  assetManifest?: Partial<Record<GameAssetId, string>>
}

type GameAssetId =
  | 'nurse-avatar'
  | 'patient-bed'
  | 'monitor'
  | 'nurses-station'
  | 'med-cart'
  | 'uap'
  | 'provider'
  | 'rt'
  | 'charge'

interface PatientEntity {
  patient: NurseCommandPatient
  group: THREE.Group
  bed: THREE.Object3D
  monitor: THREE.Object3D
  monitorScreen: THREE.Mesh
  alertLight: THREE.PointLight
  glowRing: THREE.Mesh
  interactRadius: number
}

interface StaffEntity {
  group: THREE.Group
  role: 'uap' | 'rt' | 'provider' | 'charge'
  route: THREE.Vector3[]
  routeIndex: number
  speed: number
  beacon: THREE.PointLight
  leftLeg?: THREE.Object3D
  rightLeg?: THREE.Object3D
}

interface PlayerRig {
  group: THREE.Group
  leftArm?: THREE.Object3D
  rightArm?: THREE.Object3D
  leftLeg?: THREE.Object3D
  rightLeg?: THREE.Object3D
  importedRoot?: THREE.Object3D
}

interface RoomLayout {
  room: string
  position: THREE.Vector3
  side: 'left' | 'right'
}

interface Obstacle {
  center: THREE.Vector3
  halfSize: THREE.Vector3
}

const defaultAssetManifest: Record<GameAssetId, string> = {
  'nurse-avatar': '/game-assets/nurse-avatar.glb',
  'patient-bed': '/game-assets/patient-bed.glb',
  monitor: '/game-assets/monitor.glb',
  'nurses-station': '/game-assets/nurses-station.glb',
  'med-cart': '/game-assets/med-cart.glb',
  uap: '/game-assets/uap.glb',
  provider: '/game-assets/provider.glb',
  rt: '/game-assets/rt.glb',
  charge: '/game-assets/charge.glb',
}

const statusColor: Record<NurseCommandPatientStatus, number> = {
  stable: 0x10b981,
  watch: 0x38bdf8,
  urgent: 0xf59e0b,
  critical: 0xef4444,
}

const roomLayouts: RoomLayout[] = [
  { room: '402A', position: new THREE.Vector3(-13, 0, -10), side: 'left' },
  { room: '404B', position: new THREE.Vector3(-13, 0, -2.5), side: 'left' },
  { room: '407A', position: new THREE.Vector3(-13, 0, 5), side: 'left' },
  { room: '410C', position: new THREE.Vector3(13, 0, -8.5), side: 'right' },
  { room: '412B', position: new THREE.Vector3(13, 0, 1.5), side: 'right' },
  { room: '414A', position: new THREE.Vector3(13, 0, 9.5), side: 'right' },
]

const makeMaterial = (
  color: number,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.12,
    ...options,
  })

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if ('geometry' in child && child.geometry instanceof THREE.BufferGeometry) child.geometry.dispose()
    if ('material' in child) {
      const material = child.material
      if (Array.isArray(material)) material.forEach((item) => item.dispose())
      else if (material instanceof THREE.Material) material.dispose()
    }
  })
}

export class NurseCommand3DEngine {
  private mount: HTMLElement
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180)
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  private clock = new THREE.Clock()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private gltfLoader = new GLTFLoader()
  private animationFrame = 0
  private player: PlayerRig = { group: new THREE.Group() }
  private velocity = new THREE.Vector3()
  private cameraLookTarget = new THREE.Vector3()
  private cameraOffset = new THREE.Vector3(0, 10.5, 13.5)
  private virtualDirection = new THREE.Vector3()
  private keys = new Set<string>()
  private patientEntities = new Map<string, PatientEntity>()
  private staffEntities: StaffEntity[] = []
  private obstacles: Obstacle[] = []
  private loadedAssetIds = new Set<GameAssetId>()
  private assetManifest: Record<GameAssetId, string>
  private selectedPatientId: string
  private activeEventPatientIds = new Set<string>()
  private deterioratingPatientIds = new Set<string>()
  private completedPatientIds = new Set<string>()
  private delegatedPatientIds = new Set<string>()
  private nearestPatientId: string | null = null
  private onSelectPatient: (patientId: string) => void
  private onInteractPatient: (patientId: string) => void
  private onProximityChange: (patientId: string | null) => void

  constructor(options: NurseCommand3DEngineOptions) {
    this.mount = options.mount
    this.assetManifest = { ...defaultAssetManifest, ...options.assetManifest }
    this.selectedPatientId = options.selectedPatientId
    this.activeEventPatientIds = new Set(options.activeEventPatientIds)
    this.deterioratingPatientIds = new Set(options.deterioratingPatientIds)
    this.completedPatientIds = new Set(options.completedPatientIds)
    this.delegatedPatientIds = new Set(options.delegatedPatientIds)
    this.onSelectPatient = options.onSelectPatient
    this.onInteractPatient = options.onInteractPatient
    this.onProximityChange = options.onProximityChange

    this.configureRenderer()
    this.buildScene(options.patients)
    this.bindEvents()
    this.resize()
    this.loop()
  }

  updateGameState(options: NurseCommandEngineState) {
    if (options.selectedPatientId) this.selectedPatientId = options.selectedPatientId
    if (options.activeEventPatientIds) this.activeEventPatientIds = new Set(options.activeEventPatientIds)
    if (options.deterioratingPatientIds) this.deterioratingPatientIds = new Set(options.deterioratingPatientIds)
    if (options.completedPatientIds) this.completedPatientIds = new Set(options.completedPatientIds)
    if (options.delegatedPatientIds) this.delegatedPatientIds = new Set(options.delegatedPatientIds)
    if (options.onSelectPatient) this.onSelectPatient = options.onSelectPatient
    if (options.onInteractPatient) this.onInteractPatient = options.onInteractPatient
    if (options.onProximityChange) this.onProximityChange = options.onProximityChange
    this.paintPatientStates()
  }

  update(options: NurseCommandEngineState) {
    this.updateGameState(options)
  }

  setMoveInput(input: { x: number; z: number }) {
    this.virtualDirection.set(input.x, 0, input.z)
  }

  setVirtualDirection(x: number, z: number) {
    this.setMoveInput({ x, z })
  }

  interact() {
    if (!this.nearestPatientId) return
    this.onSelectPatient(this.nearestPatientId)
    this.onInteractPatient(this.nearestPatientId)
  }

  focusPatient(patientId: string) {
    const entity = this.patientEntities.get(patientId)
    if (!entity) return
    const target = new THREE.Vector3()
    entity.group.getWorldPosition(target)
    this.player.group.position.lerp(target.clone().setY(0), 0.18)
    this.onSelectPatient(patientId)
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown)
    disposeObject(this.scene)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private configureRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.setClearColor(0x04101f, 1)
    this.mount.appendChild(this.renderer.domElement)
    this.scene.background = new THREE.Color(0x04101f)
    this.scene.fog = new THREE.FogExp2(0x04101f, 0.026)
    this.camera.position.set(0, 11, 18)
    this.cameraLookTarget.set(0, 0.8, 0)
  }

  private buildScene(patients: NurseCommandPatient[]) {
    this.addLighting()
    this.addHospitalShell()
    this.addNursesStation()
    this.addUtilityProps()
    this.addPlayer()
    patients.forEach((patient, index) =>
      this.addPatientRoom(patient, roomLayouts[index] ?? roomLayouts[roomLayouts.length - 1]),
    )
    this.addStaffNpc('uap', [new THREE.Vector3(-3.5, 0, 8), new THREE.Vector3(-8, 0, -6), new THREE.Vector3(0, 0, -11)], 3.2, 0x10b981)
    this.addStaffNpc('charge', [new THREE.Vector3(4, 0, 7), new THREE.Vector3(7, 0, 0), new THREE.Vector3(2, 0, -8)], 2.7, 0xf59e0b)
    this.addStaffNpc('rt', [new THREE.Vector3(8, 0, -11), new THREE.Vector3(3, 0, -4), new THREE.Vector3(10, 0, 3)], 3.8, 0x38bdf8)
    this.addStaffNpc('provider', [new THREE.Vector3(-9, 0, 10), new THREE.Vector3(-2, 0, 3), new THREE.Vector3(-10, 0, -5)], 2.4, 0xa78bfa)
    this.paintPatientStates()
  }

  private addLighting() {
    this.scene.add(new THREE.AmbientLight(0xb9dcff, 0.34))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9)
    keyLight.position.set(4, 22, 12)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    keyLight.shadow.camera.left = -24
    keyLight.shadow.camera.right = 24
    keyLight.shadow.camera.top = 24
    keyLight.shadow.camera.bottom = -24
    this.scene.add(keyLight)

    const blueWash = new THREE.PointLight(0x1e90ff, 58, 62, 1.8)
    blueWash.position.set(0, 5, 0)
    this.scene.add(blueWash)

    const corridorStrip = new THREE.RectAreaLight(0x9bdcff, 5.5, 6, 30)
    corridorStrip.position.set(0, 4.8, 0)
    corridorStrip.rotation.x = -Math.PI / 2
    this.scene.add(corridorStrip)
  }

  private addHospitalShell() {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(38, 0.25, 34),
      makeMaterial(0x0b2035, { roughness: 0.42, metalness: 0.18 }),
    )
    floor.position.y = -0.14
    floor.receiveShadow = true
    this.scene.add(floor)

    const corridor = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 0.08, 32.5),
      makeMaterial(0x143a5b, { roughness: 0.36, metalness: 0.24 }),
    )
    corridor.position.y = 0.03
    corridor.receiveShadow = true
    this.scene.add(corridor)

    const centerLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.09, 31),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 }),
    )
    centerLine.position.y = 0.11
    this.scene.add(centerLine)

    const grid = new THREE.GridHelper(38, 38, 0x1e90ff, 0x1b3a57)
    grid.position.y = 0.12
    this.scene.add(grid)

    this.addWall(new THREE.Vector3(0, 2.1, -17), new THREE.Vector3(39, 4.2, 0.45))
    this.addWall(new THREE.Vector3(0, 2.1, 17), new THREE.Vector3(39, 4.2, 0.45))
    this.addWall(new THREE.Vector3(-19, 2.1, 0), new THREE.Vector3(0.45, 4.2, 34))
    this.addWall(new THREE.Vector3(19, 2.1, 0), new THREE.Vector3(0.45, 4.2, 34))

    for (let z = -13; z <= 13; z += 6.5) {
      this.addCeilingLight(new THREE.Vector3(0, 4.25, z))
    }
  }

  private addWall(position: THREE.Vector3, size: THREE.Vector3) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), makeMaterial(0x071624, { roughness: 0.82 }))
    wall.position.copy(position)
    wall.receiveShadow = true
    this.scene.add(wall)
    this.obstacles.push({ center: position.clone().setY(0), halfSize: new THREE.Vector3(size.x / 2, 0, size.z / 2) })
  }

  private addCeilingLight(position: THREE.Vector3) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.08, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xaee6ff, transparent: true, opacity: 0.84 }),
    )
    panel.position.copy(position)
    this.scene.add(panel)

    const light = new THREE.PointLight(0x8edcff, 4.6, 11, 2.1)
    light.position.copy(position).add(new THREE.Vector3(0, -0.35, 0))
    this.scene.add(light)
  }

  private addNursesStation() {
    const station = new THREE.Group()
    station.position.set(0, 0, 0.8)

    const desk = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.15, 2.5), makeMaterial(0x173a59, { roughness: 0.5 }))
    desk.position.y = 0.58
    desk.castShadow = true
    desk.receiveShadow = true
    station.add(desk)

    const counterGlow = new THREE.Mesh(
      new THREE.BoxGeometry(5.1, 0.04, 2.25),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18 }),
    )
    counterGlow.position.y = 1.18
    station.add(counterGlow)

    for (let index = -1; index <= 1; index += 1) {
      const monitor = this.createMonitor(0x38bdf8)
      monitor.position.set(index * 1.45, 1.48, -1.18)
      monitor.rotation.x = -0.08
      station.add(monitor)
    }

    station.add(this.createFloatingLabel('NURSES STATION', 3.3, 0.7, new THREE.Vector3(0, 2.55, 1.15)))
    this.scene.add(station)
    this.obstacles.push({ center: station.position.clone(), halfSize: new THREE.Vector3(3.25, 0, 1.7) })
    this.replaceWithAsset('nurses-station', station, { scale: 1.25, position: station.position.clone() })
  }

  private addUtilityProps() {
    const medCart = this.createCart(0x1d4b72)
    medCart.position.set(-5.8, 0, 10.8)
    this.scene.add(medCart)
    this.replaceWithAsset('med-cart', medCart, { scale: 1.1, position: medCart.position.clone() })

    const supplyRack = new THREE.Group()
    for (let shelf = 0; shelf < 3; shelf += 1) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.7), makeMaterial(0x264966))
      box.position.y = 0.45 + shelf * 0.55
      supplyRack.add(box)
    }
    supplyRack.position.set(5.8, 0, 11)
    this.scene.add(supplyRack)
  }

  private addPlayer() {
    const group = this.player.group
    group.position.set(0, 0, 9.5)

    const bodyMaterial = makeMaterial(0x1e90ff, { roughness: 0.44, metalness: 0.08 })
    const skinMaterial = makeMaterial(0xf1c6a8, { roughness: 0.56 })

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.25, 8, 14), bodyMaterial)
    torso.position.y = 1.2
    torso.castShadow = true
    group.add(torso)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), skinMaterial)
    head.position.y = 2.18
    head.castShadow = true
    group.add(head)

    this.player.leftArm = this.addLimb(group, new THREE.Vector3(-0.5, 1.32, 0), 0x9bdcff)
    this.player.rightArm = this.addLimb(group, new THREE.Vector3(0.5, 1.32, 0), 0x9bdcff)
    this.player.leftLeg = this.addLimb(group, new THREE.Vector3(-0.22, 0.45, 0), 0x08233d)
    this.player.rightLeg = this.addLimb(group, new THREE.Vector3(0.22, 0.45, 0), 0x08233d)

    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.17, 0.035), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    badge.position.set(0.24, 1.48, 0.4)
    group.add(badge)

    const followLight = new THREE.PointLight(0x38bdf8, 8, 7, 2)
    followLight.position.set(0, 2.2, 0)
    group.add(followLight)

    this.scene.add(group)
    this.replaceWithAsset('nurse-avatar', group, { scale: 1.2, position: group.position.clone(), preserveChildren: true })
  }

  private addLimb(parent: THREE.Group, position: THREE.Vector3, color: number) {
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.72, 6, 8), makeMaterial(color))
    limb.position.copy(position)
    limb.castShadow = true
    parent.add(limb)
    return limb
  }

  private addPatientRoom(patient: NurseCommandPatient, layout: RoomLayout) {
    const group = new THREE.Group()
    group.position.copy(layout.position)

    const room = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 5.8), makeMaterial(0x0d2b45, { roughness: 0.58 }))
    room.position.y = 0.06
    room.receiveShadow = true
    group.add(room)

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.8, 0.18), makeMaterial(0x092036))
    backWall.position.set(0, 1.4, layout.side === 'left' ? -2.95 : 2.95)
    group.add(backWall)

    const bed = this.createBed()
    bed.position.set(layout.side === 'left' ? 1.1 : -1.1, 0, -0.15)
    bed.rotation.y = layout.side === 'left' ? 0 : Math.PI
    bed.userData.patientId = patient.id
    group.add(bed)

    const patientBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 1.45, 6, 12), makeMaterial(0x94a3b8, { roughness: 0.52 }))
    patientBody.rotation.z = Math.PI / 2
    patientBody.position.set(bed.position.x, 1.08, bed.position.z)
    patientBody.castShadow = true
    group.add(patientBody)

    const monitor = this.createMonitor(statusColor[patient.risk])
    monitor.position.set(layout.side === 'left' ? 3.05 : -3.05, 1.45, layout.side === 'left' ? -1.95 : 1.95)
    monitor.userData.patientId = patient.id
    group.add(monitor)

    const monitorScreen = monitor.children.find((child) => child.userData.kind === 'monitor-screen') as THREE.Mesh
    const alertLight = new THREE.PointLight(statusColor[patient.risk], 10, 8, 1.7)
    alertLight.position.copy(monitor.position).add(new THREE.Vector3(0, 0.5, 0))
    group.add(alertLight)

    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.035, 8, 80),
      new THREE.MeshBasicMaterial({ color: statusColor[patient.risk], transparent: true, opacity: 0.38 }),
    )
    glowRing.rotation.x = -Math.PI / 2
    glowRing.position.y = 0.16
    group.add(glowRing)

    const label = this.createFloatingLabel(`${patient.room}\n${patient.name}`, 3.4, 1.1, new THREE.Vector3(0, 2.85, layout.side === 'left' ? 2.1 : -2.1))
    group.add(label)

    this.scene.add(group)
    this.obstacles.push({ center: layout.position.clone().add(new THREE.Vector3(bed.position.x, 0, bed.position.z)), halfSize: new THREE.Vector3(2.1, 0, 1.25) })
    this.patientEntities.set(patient.id, {
      patient,
      group,
      bed,
      alertLight,
      monitor,
      monitorScreen,
      glowRing,
      interactRadius: 4.45,
    })
    this.replaceWithAsset('patient-bed', bed, { scale: 1.1, position: bed.position.clone(), rotationY: bed.rotation.y })
    this.replaceWithAsset('monitor', monitor, { scale: 1, position: monitor.position.clone() })
  }

  private createBed() {
    const bed = new THREE.Group()
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.42, 1.55), makeMaterial(0xdbeafe, { roughness: 0.44, metalness: 0.08 }))
    frame.position.y = 0.58
    frame.castShadow = true
    bed.add(frame)

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.25), makeMaterial(0x60a5fa, { roughness: 0.66 }))
    blanket.position.set(-0.08, 0.9, 0)
    blanket.castShadow = true
    bed.add(blanket)

    const railMaterial = makeMaterial(0x9fb8d2, { roughness: 0.35, metalness: 0.36 })
    for (const z of [-0.92, 0.92]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.08, 0.08), railMaterial)
      rail.position.set(0, 1.05, z)
      bed.add(rail)
    }
    return bed
  }

  private createMonitor(color: number) {
    const monitor = new THREE.Group()
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.9, 8), makeMaterial(0x6b8097, { metalness: 0.45 }))
    stand.position.y = -0.45
    monitor.add(stand)

    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.78, 0.12), makeMaterial(0x06111e, { roughness: 0.34, metalness: 0.18 }))
    shell.castShadow = true
    monitor.add(shell)

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.55),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    )
    screen.position.z = 0.071
    screen.userData.kind = 'monitor-screen'
    screen.userData.patientId = ''
    monitor.add(screen)

    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.025, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 }),
    )
    line.position.set(0, 0.04, 0.079)
    monitor.add(line)
    return monitor
  }

  private createCart(color: number) {
    const cart = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.15, 0.82), makeMaterial(color, { roughness: 0.48, metalness: 0.18 }))
    body.position.y = 0.75
    body.castShadow = true
    cart.add(body)
    for (const x of [-0.55, 0.55]) {
      for (const z of [-0.28, 0.28]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14), makeMaterial(0x071624))
        wheel.rotation.z = Math.PI / 2
        wheel.position.set(x, 0.12, z)
        cart.add(wheel)
      }
    }
    return cart
  }

  private addStaffNpc(role: StaffEntity['role'], route: THREE.Vector3[], speed: number, color: number) {
    const group = new THREE.Group()
    group.position.copy(route[0])
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.05, 6, 12), makeMaterial(color, { roughness: 0.48 }))
    body.position.y = 1
    body.castShadow = true
    group.add(body)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 12), makeMaterial(0xf3c8a6, { roughness: 0.55 }))
    head.position.y = 1.82
    head.castShadow = true
    group.add(head)

    const leftLeg = this.addLimb(group, new THREE.Vector3(-0.18, 0.4, 0), 0x0b2035)
    const rightLeg = this.addLimb(group, new THREE.Vector3(0.18, 0.4, 0), 0x0b2035)
    const tag = this.createFloatingLabel(role.toUpperCase(), 1.8, 0.56, new THREE.Vector3(0, 2.62, 0))
    group.add(tag)
    const beacon = new THREE.PointLight(color, 0, 8, 1.8)
    beacon.position.y = 2.18
    group.add(beacon)
    this.scene.add(group)

    this.staffEntities.push({ group, role, route, routeIndex: 1, speed, beacon, leftLeg, rightLeg })
    this.replaceWithAsset(role, group, { scale: 1, position: group.position.clone(), preserveChildren: true })
  }

  private createFloatingLabel(text: string, width: number, height: number, position: THREE.Vector3) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.createLabelTexture(text),
        transparent: true,
        depthTest: false,
      }),
    )
    sprite.scale.set(width, height, 1)
    sprite.position.copy(position)
    return sprite
  }

  private createLabelTexture(text: string) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 192
    const context = canvas.getContext('2d')
    if (!context) return new THREE.CanvasTexture(canvas)

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(4, 16, 31, 0.88)'
    context.roundRect(12, 12, canvas.width - 24, canvas.height - 24, 28)
    context.fill()
    context.strokeStyle = 'rgba(56, 189, 248, 0.65)'
    context.lineWidth = 4
    context.stroke()
    context.fillStyle = '#f8fbff'
    context.font = '800 38px Inter, Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    text.split('\n').forEach((line, index, lines) => {
      context.fillText(line, canvas.width / 2, canvas.height / 2 + (index - (lines.length - 1) / 2) * 46)
    })
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private replaceWithAsset(
    assetId: GameAssetId,
    fallback: THREE.Object3D,
    options: { scale: number; position: THREE.Vector3; rotationY?: number; preserveChildren?: boolean },
  ) {
    if (this.loadedAssetIds.has(assetId)) return
    this.loadedAssetIds.add(assetId)
    const url = this.assetManifest[assetId]
    if (!url) return

    this.gltfLoader.load(
      url,
      (gltf) => {
        const model = gltf.scene
        model.traverse((child) => {
          child.castShadow = true
          child.receiveShadow = true
        })
        model.scale.setScalar(options.scale)
        model.position.copy(options.position)
        if (typeof options.rotationY === 'number') model.rotation.y = options.rotationY
        fallback.parent?.add(model)
        if (!options.preserveChildren) fallback.visible = false
      },
      undefined,
      () => {
        // Asset packs are optional in v1; procedural geometry stays live when files are absent.
      },
    )
  }

  private paintPatientStates() {
    const elapsed = this.clock.elapsedTime
    this.patientEntities.forEach((entity, patientId) => {
      const active = this.activeEventPatientIds.has(patientId)
      const deteriorating = this.deterioratingPatientIds.has(patientId)
      const selected = this.selectedPatientId === patientId
      const completed = this.completedPatientIds.has(patientId)
      const delegated = this.delegatedPatientIds.has(patientId)
      const pulse = (Math.sin(elapsed * (deteriorating ? 9 : 5.5)) + 1) / 2
      const color = completed ? 0x10b981 : deteriorating ? 0xff2d55 : active ? 0xef4444 : delegated ? 0xa78bfa : statusColor[entity.patient.risk]

      const monitorMaterial = entity.monitorScreen.material
      if (monitorMaterial instanceof THREE.MeshBasicMaterial) {
        monitorMaterial.color.setHex(color)
        monitorMaterial.opacity = completed ? 0.72 : 0.82 + pulse * 0.16
      }
      const ringMaterial = entity.glowRing.material
      if (ringMaterial instanceof THREE.MeshBasicMaterial) {
        ringMaterial.color.setHex(color)
        ringMaterial.opacity = completed ? 0.2 : selected ? 0.58 : deteriorating ? 0.52 + pulse * 0.32 : 0.28
      }
      entity.alertLight.color.setHex(color)
      entity.alertLight.intensity = deteriorating ? 30 + pulse * 24 : selected ? 22 : active ? 24 : delegated ? 14 : completed ? 7 : 10
      entity.group.scale.setScalar(deteriorating ? 1.025 + pulse * 0.035 : selected ? 1.04 : 1)
    })
  }

  private bindEvents() {
    window.addEventListener('resize', this.resize)
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown)
  }

  private resize = () => {
    const width = Math.max(1, this.mount.clientWidth)
    const height = Math.max(1, this.mount.clientHeight)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private keyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    this.keys.add(key)
    if (key === 'e') this.interact()
  }

  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase())
  }

  private pointerDown = (event: PointerEvent) => {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const targets = Array.from(this.patientEntities.values()).flatMap((entity) => [
      entity.bed,
      entity.monitor,
      entity.monitorScreen,
      entity.glowRing,
    ])
    const hit = this.raycaster.intersectObjects(targets, true)[0]
    const patientId = this.findPatientId(hit?.object)
    if (patientId) this.onSelectPatient(patientId)
  }

  private findPatientId(object?: THREE.Object3D): string | null {
    let current = object
    while (current) {
      if (typeof current.userData.patientId === 'string') return current.userData.patientId
      current = current.parent ?? undefined
    }
    return null
  }

  private loop = () => {
    const delta = Math.min(0.05, this.clock.getDelta())
    this.updatePlayer(delta)
    this.updateStaff(delta)
    this.updateCamera(delta)
    this.updateNearestPatient()
    this.paintPatientStates()
    this.renderer.render(this.scene, this.camera)
    this.animationFrame = requestAnimationFrame(this.loop)
  }

  private updatePlayer(delta: number) {
    const direction = new THREE.Vector3()
    if (this.keys.has('w') || this.keys.has('arrowup')) direction.z -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) direction.z += 1
    if (this.keys.has('a') || this.keys.has('arrowleft')) direction.x -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) direction.x += 1
    direction.add(this.virtualDirection)

    const moving = direction.lengthSq() > 0
    if (moving) {
      direction.normalize()
      this.velocity.lerp(direction.multiplyScalar(8.4), 1 - Math.pow(0.002, delta))
      this.player.group.rotation.y = Math.atan2(this.velocity.x, this.velocity.z)
    } else {
      this.velocity.multiplyScalar(Math.pow(0.035, delta))
    }

    const nextPosition = this.player.group.position.clone().addScaledVector(this.velocity, delta)
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -16.2, 16.2)
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -14.2, 14.2)
    this.resolveObstacleCollision(nextPosition)
    this.player.group.position.copy(nextPosition)

    const stride = Math.sin(this.clock.elapsedTime * 11) * Math.min(1, this.velocity.length() / 7)
    if (this.player.leftLeg) this.player.leftLeg.rotation.x = stride * 0.42
    if (this.player.rightLeg) this.player.rightLeg.rotation.x = -stride * 0.42
    if (this.player.leftArm) this.player.leftArm.rotation.x = -stride * 0.28
    if (this.player.rightArm) this.player.rightArm.rotation.x = stride * 0.28
  }

  private resolveObstacleCollision(position: THREE.Vector3) {
    const radius = 0.55
    for (const obstacle of this.obstacles) {
      const dx = position.x - obstacle.center.x
      const dz = position.z - obstacle.center.z
      const overlapX = obstacle.halfSize.x + radius - Math.abs(dx)
      const overlapZ = obstacle.halfSize.z + radius - Math.abs(dz)
      if (overlapX > 0 && overlapZ > 0) {
        if (overlapX < overlapZ) position.x += dx < 0 ? -overlapX : overlapX
        else position.z += dz < 0 ? -overlapZ : overlapZ
      }
    }
  }

  private updateStaff(delta: number) {
    const hasDelegation = this.delegatedPatientIds.size > 0
    this.staffEntities.forEach((entity) => {
      const target = entity.route[entity.routeIndex]
      const toTarget = target.clone().sub(entity.group.position)
      const distance = toTarget.length()
      if (distance < 0.25) {
        entity.routeIndex = (entity.routeIndex + 1) % entity.route.length
      } else {
        toTarget.normalize()
        entity.group.position.addScaledVector(toTarget, delta * entity.speed * (hasDelegation ? 1.35 : 1))
        entity.group.rotation.y = Math.atan2(toTarget.x, toTarget.z)
      }

      const stride = Math.sin(this.clock.elapsedTime * entity.speed * 4.8)
      if (entity.leftLeg) entity.leftLeg.rotation.x = stride * 0.32
      if (entity.rightLeg) entity.rightLeg.rotation.x = -stride * 0.32
      entity.beacon.intensity = hasDelegation ? 8 + Math.sin(this.clock.elapsedTime * 7) * 3 : 1.5
    })
  }

  private updateCamera(delta: number) {
    const targetCameraPosition = this.player.group.position.clone().add(this.cameraOffset)
    this.camera.position.lerp(targetCameraPosition, 1 - Math.pow(0.0008, delta))
    this.cameraLookTarget.lerp(this.player.group.position.clone().add(new THREE.Vector3(0, 1, -1.2)), 1 - Math.pow(0.004, delta))
    this.camera.lookAt(this.cameraLookTarget)
  }

  private updateNearestPatient() {
    let nearest: string | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    this.patientEntities.forEach((entity, patientId) => {
      const worldPosition = new THREE.Vector3()
      entity.group.getWorldPosition(worldPosition)
      const distance = worldPosition.distanceTo(this.player.group.position)
      if (distance < entity.interactRadius && distance < nearestDistance) {
        nearest = patientId
        nearestDistance = distance
      }
    })

    if (nearest !== this.nearestPatientId) {
      this.nearestPatientId = nearest
      this.onProximityChange(nearest)
    }
  }
}
