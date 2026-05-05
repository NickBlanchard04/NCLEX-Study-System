import * as THREE from 'three'

export type Shift3DPatientStatus = 'stable' | 'watch' | 'urgent' | 'critical'

export interface Shift3DPatient {
  id: string
  room: string
  name: string
  risk: Shift3DPatientStatus
}

interface PatientEntity {
  patient: Shift3DPatient
  group: THREE.Group
  bed: THREE.Mesh
  alertLight: THREE.PointLight
  monitor: THREE.Mesh
  interactRadius: number
}

interface MovingEntity {
  group: THREE.Group
  origin: THREE.Vector3
  amplitude: number
  speed: number
}

export interface Shift3DEngineOptions {
  mount: HTMLElement
  patients: Shift3DPatient[]
  selectedPatientId: string
  activeEventPatientIds: string[]
  completedPatientIds: string[]
  onSelectPatient: (patientId: string) => void
  onProximityChange: (patientId: string | null) => void
}

const statusColor: Record<Shift3DPatientStatus, number> = {
  stable: 0x10b981,
  watch: 0x38bdf8,
  urgent: 0xf59e0b,
  critical: 0xef4444,
}

const roomPositions = [
  new THREE.Vector3(-12, 0, -8),
  new THREE.Vector3(-12, 0, 0),
  new THREE.Vector3(-12, 0, 8),
  new THREE.Vector3(12, 0, -6),
  new THREE.Vector3(12, 0, 4),
]

export class Shift3DEngine {
  private mount: HTMLElement
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120)
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  private clock = new THREE.Clock()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private animationFrame = 0
  private player = new THREE.Group()
  private velocity = new THREE.Vector3()
  private keys = new Set<string>()
  private patientEntities = new Map<string, PatientEntity>()
  private movingEntities: MovingEntity[] = []
  private selectedPatientId: string
  private activeEventPatientIds = new Set<string>()
  private completedPatientIds = new Set<string>()
  private nearestPatientId: string | null = null
  private virtualDirection = new THREE.Vector3()
  private onSelectPatient: (patientId: string) => void
  private onProximityChange: (patientId: string | null) => void

  constructor(options: Shift3DEngineOptions) {
    this.mount = options.mount
    this.selectedPatientId = options.selectedPatientId
    this.activeEventPatientIds = new Set(options.activeEventPatientIds)
    this.completedPatientIds = new Set(options.completedPatientIds)
    this.onSelectPatient = options.onSelectPatient
    this.onProximityChange = options.onProximityChange

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.setClearColor(0x071624, 1)
    this.mount.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(0x071624)
    this.scene.fog = new THREE.Fog(0x071624, 22, 62)
    this.camera.position.set(0, 12, 17)
    this.camera.lookAt(0, 0, 0)

    this.buildWorld(options.patients)
    this.bindEvents()
    this.resize()
    this.loop()
  }

  update(options: Partial<Omit<Shift3DEngineOptions, 'mount' | 'patients'>>) {
    if (options.selectedPatientId) this.selectedPatientId = options.selectedPatientId
    if (options.activeEventPatientIds) this.activeEventPatientIds = new Set(options.activeEventPatientIds)
    if (options.completedPatientIds) this.completedPatientIds = new Set(options.completedPatientIds)
    if (options.onSelectPatient) this.onSelectPatient = options.onSelectPatient
    if (options.onProximityChange) this.onProximityChange = options.onProximityChange
    this.paintPatientStates()
  }

  setVirtualDirection(x: number, z: number) {
    this.virtualDirection.set(x, 0, z)
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown)
    this.scene.traverse((object) => {
      if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
        object.geometry.dispose()
      }
      if ('material' in object) {
        const material = object.material
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else if (material instanceof THREE.Material) material.dispose()
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private buildWorld(patients: Shift3DPatient[]) {
    this.scene.add(new THREE.AmbientLight(0xd9ecff, 0.42))

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
    keyLight.position.set(0, 18, 8)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    this.scene.add(keyLight)

    const accentLight = new THREE.PointLight(0x2a7de1, 35, 48)
    accentLight.position.set(0, 4, 0)
    this.scene.add(accentLight)

    this.addHospitalFloor()
    this.addNursePlayer()
    this.addUnitProps()

    patients.forEach((patient, index) => this.addPatientRoom(patient, roomPositions[index] ?? new THREE.Vector3()))
    this.addMovingStaff('uap', new THREE.Vector3(-5, 0, -12), 6, 0.8, 0x10b981)
    this.addMovingStaff('charge', new THREE.Vector3(6, 0, 10), 4, 0.65, 0xf59e0b)
    this.paintPatientStates()
  }

  private addHospitalFloor() {
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.25, 28),
      new THREE.MeshStandardMaterial({ color: 0x0d2439, roughness: 0.7, metalness: 0.1 }),
    )
    floor.position.y = -0.15
    floor.receiveShadow = true
    this.scene.add(floor)

    const corridor = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.08, 27),
      new THREE.MeshStandardMaterial({ color: 0x143654, roughness: 0.55, metalness: 0.12 }),
    )
    corridor.position.y = 0.03
    corridor.receiveShadow = true
    this.scene.add(corridor)

    const grid = new THREE.GridHelper(32, 32, 0x2a7de1, 0x1d3d5f)
    grid.position.y = 0.08
    this.scene.add(grid)

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x0a1a2b, roughness: 0.8 })
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(34, 4, 0.4), wallMaterial)
    backWall.position.set(0, 2, -14)
    this.scene.add(backWall)

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(34, 4, 0.4), wallMaterial)
    frontWall.position.set(0, 2, 14)
    this.scene.add(frontWall)
  }

  private addNursePlayer() {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 1.2, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a7de1, roughness: 0.45, metalness: 0.08 }),
    )
    body.castShadow = true
    body.position.y = 1.05
    this.player.add(body)

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd7b1, roughness: 0.5 }),
    )
    head.castShadow = true
    head.position.y = 2.02
    this.player.add(head)

    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.16, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    )
    badge.position.set(0.2, 1.35, 0.4)
    this.player.add(badge)

    this.player.position.set(0, 0, 8)
    this.scene.add(this.player)
  }

  private addUnitProps() {
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 1.1, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x163b5c, roughness: 0.62 }),
    )
    desk.position.set(0, 0.55, 0)
    desk.castShadow = true
    desk.receiveShadow = true
    this.scene.add(desk)

    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.92, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x66e6d4 }),
    )
    monitor.position.set(0, 1.45, -1.12)
    this.scene.add(monitor)
  }

  private addPatientRoom(patient: Shift3DPatient, position: THREE.Vector3) {
    const group = new THREE.Group()
    group.position.copy(position)

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.12, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x102b45, roughness: 0.65 }),
    )
    room.position.y = 0.04
    room.receiveShadow = true
    group.add(room)

    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.72, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xe4f0ff, roughness: 0.5 }),
    )
    bed.position.set(position.x < 0 ? 0.8 : -0.8, 0.6, 0)
    bed.castShadow = true
    bed.userData.patientId = patient.id
    group.add(bed)

    const patientBody = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.32, 1.45, 5, 12),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 }),
    )
    patientBody.rotation.z = Math.PI / 2
    patientBody.position.copy(bed.position).add(new THREE.Vector3(0, 0.55, 0))
    patientBody.castShadow = true
    group.add(patientBody)

    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.62, 0.08),
      new THREE.MeshBasicMaterial({ color: statusColor[patient.risk] }),
    )
    monitor.position.set(position.x < 0 ? 2.9 : -2.9, 1.45, -1.75)
    monitor.userData.patientId = patient.id
    group.add(monitor)

    const alertLight = new THREE.PointLight(statusColor[patient.risk], 9, 8)
    alertLight.position.set(monitor.position.x, 1.8, monitor.position.z)
    group.add(alertLight)

    const labelCanvas = this.createLabelTexture(`${patient.room}\n${patient.name}`)
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: labelCanvas,
        transparent: true,
      }),
    )
    label.scale.set(3.4, 1.1, 1)
    label.position.set(0, 2.8, 1.9)
    group.add(label)

    this.scene.add(group)
    this.patientEntities.set(patient.id, {
      patient,
      group,
      bed,
      alertLight,
      monitor,
      interactRadius: 4.1,
    })
  }

  private addMovingStaff(
    label: string,
    origin: THREE.Vector3,
    amplitude: number,
    speed: number,
    color: number,
  ) {
    const group = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.34, 1, 6, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
    )
    body.position.y = 0.98
    body.castShadow = true
    group.add(body)

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf4c7a1, roughness: 0.55 }),
    )
    head.position.y = 1.78
    group.add(head)

    const tag = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.createLabelTexture(label.toUpperCase()), transparent: true }),
    )
    tag.position.y = 2.55
    tag.scale.set(1.8, 0.55, 1)
    group.add(tag)

    group.position.copy(origin)
    this.scene.add(group)
    this.movingEntities.push({ group, origin, amplitude, speed })
  }

  private createLabelTexture(text: string) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 192
    const context = canvas.getContext('2d')!
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(7, 22, 36, 0.86)'
    context.roundRect(12, 12, canvas.width - 24, canvas.height - 24, 28)
    context.fill()
    context.strokeStyle = 'rgba(148, 213, 255, 0.6)'
    context.lineWidth = 4
    context.stroke()
    context.fillStyle = '#ffffff'
    context.font = '700 38px Inter, Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    text.split('\n').forEach((line, index, lines) => {
      context.fillText(line, canvas.width / 2, canvas.height / 2 + (index - (lines.length - 1) / 2) * 46)
    })
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  private paintPatientStates() {
    this.patientEntities.forEach((entity, patientId) => {
      const active = this.activeEventPatientIds.has(patientId)
      const selected = this.selectedPatientId === patientId
      const completed = this.completedPatientIds.has(patientId)
      const baseColor = completed ? 0x10b981 : active ? 0xef4444 : statusColor[entity.patient.risk]
      const material = entity.monitor.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.color.setHex(baseColor)
      }
      entity.alertLight.color.setHex(baseColor)
      entity.alertLight.intensity = selected ? 18 : active ? 22 : completed ? 8 : 10
      entity.group.scale.setScalar(selected ? 1.045 : 1)
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
    this.keys.add(event.key.toLowerCase())
    if (event.key.toLowerCase() === 'e' && this.nearestPatientId) {
      this.onSelectPatient(this.nearestPatientId)
    }
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
    ])
    const hit = this.raycaster.intersectObjects(targets)[0]
    const patientId = hit?.object.userData.patientId
    if (typeof patientId === 'string') {
      this.onSelectPatient(patientId)
    }
  }

  private loop = () => {
    const delta = Math.min(0.05, this.clock.getDelta())
    this.updatePlayer(delta)
    this.updateMovingEntities()
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

    if (direction.lengthSq() > 0) {
      direction.normalize()
      this.velocity.lerp(direction.multiplyScalar(7.5), 0.18)
      this.player.rotation.y = Math.atan2(this.velocity.x, this.velocity.z)
    } else {
      this.velocity.multiplyScalar(0.82)
    }

    this.player.position.addScaledVector(this.velocity, delta)
    this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -14, 14)
    this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -12, 12)
  }

  private updateMovingEntities() {
    const elapsed = this.clock.elapsedTime
    this.movingEntities.forEach((entity) => {
      entity.group.position.x = entity.origin.x + Math.sin(elapsed * entity.speed) * entity.amplitude
      entity.group.position.z = entity.origin.z + Math.cos(elapsed * entity.speed * 0.7) * 1.8
      entity.group.rotation.y = Math.sin(elapsed * entity.speed) * 0.6
    })
  }

  private updateCamera(delta: number) {
    const target = this.player.position.clone().add(new THREE.Vector3(0, 12, 15))
    this.camera.position.lerp(target, 1 - Math.pow(0.001, delta))
    this.camera.lookAt(this.player.position.x, 0.6, this.player.position.z)
  }

  private updateNearestPatient() {
    let nearest: string | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    this.patientEntities.forEach((entity, patientId) => {
      const worldPosition = new THREE.Vector3()
      entity.group.getWorldPosition(worldPosition)
      const distance = worldPosition.distanceTo(this.player.position)
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
