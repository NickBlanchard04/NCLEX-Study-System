import Phaser from 'phaser'
import { ArrowLeft, HeartPulse, Pause, Play, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'

const PLAYER_FRAME_WIDTH = 82
const PLAYER_FRAME_HEIGHT = 60
const PLAYER_FRAME_COLUMNS = 13
const GHOUL_FRAME_WIDTH = 57
const GHOUL_FRAME_HEIGHT = 60
const GHOUL_FRAME_COLUMNS = 16

function parseFrameIndexMap(
  frameConfig: Record<string, { x: number; y: number }> | undefined,
  frameWidth: number,
  frameHeight: number,
  columns: number,
) {
  const mapping: Record<string, number> = {}
  Object.entries(frameConfig ?? {}).forEach(([name, frame]) => {
    const frameX = Math.floor(frame.x / frameWidth)
    const frameY = Math.floor(frame.y / frameHeight)
    mapping[name] = frameY * columns + frameX
  })
  return mapping
}

interface HospitalvaniaHud {
  health: number
  maxHealth: number
  confidence: number
  supplies: number
  rescued: number
  totalPatients: number
  objective: string
  nearbyPatient: string | null
  status: 'ready' | 'playing' | 'paused' | 'won' | 'lost'
}

const initialHud: HospitalvaniaHud = {
  health: 5,
  maxHealth: 5,
  confidence: 0,
  supplies: 1,
  rescued: 0,
  totalPatients: 4,
  objective: 'Press Enter or Start Run to begin your hospital rescue shift.',
  nearbyPatient: null,
  status: 'ready',
}

class HospitalvaniaScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private groundLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer | null = null
  private hazards!: Phaser.Physics.Arcade.Group
  private supplies!: Phaser.Physics.Arcade.Group
  private patients!: Phaser.Physics.Arcade.StaticGroup
  private exit!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody
  private health = 5
  private maxHealth = 5
  private confidence = 0
  private medKits = 1
  private rescued = 0
  private totalPatients = 4
  private nearbyPatient: Phaser.Physics.Arcade.Sprite | null = null
  private lastHitAt = 0
  private facing: 1 | -1 = 1
  private status: HospitalvaniaHud['status'] = 'ready'
  private playerFrameMap: Record<string, number> = {}
  private ghoulFrameMap: Record<string, number> = {}
  private readonly updateHud: (hud: HospitalvaniaHud) => void

  constructor(updateHud: (hud: HospitalvaniaHud) => void) {
    super('hospitalvania')
    this.updateHud = updateHud
  }

  preload() {
    this.load.setPath('/game-assets/hospitalvania-pixel')
    this.load.image('gv-background', 'images/backgrounds/background.png')
    this.load.image('gv-columns', 'images/backgrounds/columns.png')
    this.load.image('gv-tileset', 'tilemaps/tiles/tileset.png')
    this.load.tilemapTiledJSON('gv-map', 'tilemaps/maps/map.json')
    this.load.spritesheet('gv-player', 'spritesheets/nurse-player.png', {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
    })
    this.load.spritesheet('gv-ghoul', 'spritesheets/infection-runner.png', {
      frameWidth: GHOUL_FRAME_WIDTH,
      frameHeight: GHOUL_FRAME_HEIGHT,
    })
    this.load.json('gv-player-frames', 'spritesheets/nurse-player.json')
    this.load.json('gv-ghoul-frames', 'spritesheets/infection-runner.json')

    this.load.setPath('/game-assets/hospitalvania')
    this.load.svg('patient-bed', 'patient-bed.svg', { width: 84, height: 62 })
    this.load.svg('supply', 'supply-kit.svg', { width: 48, height: 40 })
    this.load.svg('hazard', 'infection-hazard.svg', { width: 52, height: 52 })
    this.load.svg('platform', 'platform-tile.svg', { width: 160, height: 32 })
    this.load.svg('exit', 'handoff-exit.svg', { width: 82, height: 108 })
  }

  create() {
    this.createFallbackTextures()
    this.createClassicAnimations()

    const map = this.make.tilemap({ key: 'gv-map' })
    const tileset = map.addTilesetImage('tileset', 'gv-tileset')
    const worldWidth = tileset ? map.widthInPixels : 3800
    const worldHeight = tileset ? map.heightInPixels : 720

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight + 140)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setBackgroundColor('#061322')

    this.addBackground(worldWidth, worldHeight)
    this.platforms = this.physics.add.staticGroup()
    if (tileset) {
      this.groundLayer = map.createLayer('Tile Layer 1', tileset, 0, 0)
      this.groundLayer?.setCollisionByProperty({ collides: true })
    } else {
      this.buildHospitalMap()
    }

    const playerFrame = this.playerFrameMap['player-idle-0'] ?? 0
    this.player = this.physics.add.sprite(42, 116, 'gv-player', playerFrame).setCollideWorldBounds(true)
    this.player.setScale(0.9)
    this.player.body.setSize(26, 52).setOffset(29, 7)
    if (this.groundLayer) {
      this.physics.add.collider(this.player, this.groundLayer)
    } else {
      this.physics.add.collider(this.player, this.platforms)
    }
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.roundPixels = true
    this.cameras.main.setZoom(3.05)

    this.hazards = this.physics.add.group()
    this.supplies = this.physics.add.group()
    this.patients = this.physics.add.staticGroup()
    this.spawnWorldObjects()

    if (this.groundLayer) {
      this.physics.add.collider(this.hazards, this.groundLayer)
    } else {
      this.physics.add.collider(this.hazards, this.platforms)
    }
    this.physics.add.overlap(this.player, this.hazards, (_, hazard) => this.handleHazardHit(hazard), undefined, this)
    this.physics.add.overlap(this.player, this.supplies, (_, supply) => this.collectSupply(supply), undefined, this)
    this.physics.add.overlap(this.player, this.exit, () => this.tryFinish(), undefined, this)

    this.cursors = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys)
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,SPACE,E,K,R,P,ESC,ENTER') as Record<string, Phaser.Input.Keyboard.Key>
    this.input.keyboard?.on('keydown-R', () => this.scene.restart())
    this.physics.pause()
    this.emitHud()
  }

  update() {
    if (this.status === 'ready') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.startRun()
      }
      return
    }

    if (this.status === 'paused') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.P) || Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
        this.togglePause()
      }
      return
    }

    if (this.status !== 'playing') return

    const left = this.cursors.left?.isDown || this.keys.A?.isDown
    const right = this.cursors.right?.isDown || this.keys.D?.isDown
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.W)
    const interact = Phaser.Input.Keyboard.JustDown(this.keys.E)
    const action = Phaser.Input.Keyboard.JustDown(this.keys.K)
    const pause = Phaser.Input.Keyboard.JustDown(this.keys.P) || Phaser.Input.Keyboard.JustDown(this.keys.ESC)

    if (pause) {
      this.togglePause()
      return
    }

    if (left) {
      this.player.setVelocityX(-130)
      this.player.setFlipX(true)
      this.facing = -1
    } else if (right) {
      this.player.setVelocityX(130)
      this.player.setFlipX(false)
      this.facing = 1
    } else {
      this.player.setVelocityX(0)
    }

    if (jump && this.player.body.blocked.down) {
      this.player.setVelocityY(-370)
    }

    this.updatePlayerAnimation(left, right)
    this.updateNearbyPatient()
    this.updateHazardPatrols()
    if (interact) this.tryStabilizePatient()
    if (action) this.performPulseAction()
  }

  startRun() {
    if (this.status !== 'ready') return
    this.status = 'playing'
    this.physics.resume()
    this.emitHud('Stabilize every patient, clear hazards, then reach handoff.')
  }

  togglePause() {
    if (this.status === 'paused') {
      this.status = 'playing'
      this.physics.resume()
      this.emitHud('Run resumed. Keep moving toward the next patient.')
      return
    }

    if (this.status === 'playing') {
      this.status = 'paused'
      this.player.setVelocity(0, 0)
      this.physics.pause()
      this.emitHud('Paused. Press P or Esc to continue.')
    }
  }

  private createFallbackTextures() {
    const graphics = this.add.graphics()

    if (!this.textures.exists('nurse')) {
      graphics.fillStyle(0x2a7de1, 1).fillRoundedRect(0, 0, 48, 64, 12)
      graphics.fillStyle(0xe8f4ff, 1).fillCircle(24, 13, 12)
      graphics.fillStyle(0xffffff, 1).fillRect(20, 29, 8, 20).fillRect(14, 35, 20, 7)
      graphics.generateTexture('nurse', 48, 64)
      graphics.clear()
    }

    if (!this.textures.exists('patient-bed')) {
      graphics.fillStyle(0x9bd9ff, 1).fillRoundedRect(0, 0, 52, 52, 10)
      graphics.fillStyle(0x09213a, 1).fillRoundedRect(8, 8, 36, 26, 6)
      graphics.fillStyle(0x10b981, 1).fillRect(19, 36, 14, 5)
      graphics.generateTexture('patient-bed', 52, 52)
      graphics.clear()
    }

    if (!this.textures.exists('supply')) {
      graphics.fillStyle(0x0ea5e9, 1).fillRoundedRect(0, 0, 34, 26, 8)
      graphics.fillStyle(0xffffff, 1).fillRect(14, 5, 6, 16).fillRect(8, 10, 18, 6)
      graphics.generateTexture('supply', 34, 26)
      graphics.clear()
    }

    if (!this.textures.exists('hazard')) {
      graphics.fillStyle(0xef4444, 1).fillCircle(20, 20, 20)
      graphics.fillStyle(0xfff7ed, 1).fillCircle(13, 14, 4).fillCircle(27, 14, 4)
      graphics.fillStyle(0x7f1d1d, 1).fillRect(11, 28, 18, 4)
      graphics.generateTexture('hazard', 40, 40)
      graphics.clear()
    }

    if (!this.textures.exists('platform')) {
      graphics.fillStyle(0x08233d, 1).fillRoundedRect(0, 0, 96, 22, 6)
      graphics.lineStyle(2, 0x16b7ff, 1).strokeRoundedRect(0, 0, 96, 22, 6)
      graphics.generateTexture('platform', 96, 22)
      graphics.clear()
    }

    if (!this.textures.exists('exit')) {
      graphics.fillStyle(0x10b981, 1).fillRoundedRect(0, 0, 68, 90, 10)
      graphics.fillStyle(0xeafff7, 1).fillRect(30, 14, 8, 34).fillRect(18, 27, 32, 8)
      graphics.generateTexture('exit', 68, 90)
    }
    graphics.destroy()
  }

  private createClassicAnimations() {
    this.playerFrameMap = parseFrameIndexMap(
      this.cache.json.get('gv-player-frames') as Record<string, { x: number; y: number }>,
      PLAYER_FRAME_WIDTH,
      PLAYER_FRAME_HEIGHT,
      PLAYER_FRAME_COLUMNS,
    )
    this.ghoulFrameMap = parseFrameIndexMap(
      this.cache.json.get('gv-ghoul-frames') as Record<string, { x: number; y: number }>,
      GHOUL_FRAME_WIDTH,
      GHOUL_FRAME_HEIGHT,
      GHOUL_FRAME_COLUMNS,
    )

    this.createFrameAnimation('hv-player-idle', 'gv-player', 'player-idle-', this.playerFrameMap, 6, -1)
    this.createFrameAnimation('hv-player-walk', 'gv-player', 'player-walk-', this.playerFrameMap, 10, -1)
    this.createFrameAnimation('hv-player-jump', 'gv-player', 'player-jump-', this.playerFrameMap, 8, 0)
    this.createFrameAnimation('hv-player-fall', 'gv-player', 'player-fall-', this.playerFrameMap, 8, -1)
    this.createFrameAnimation('hv-player-hurt', 'gv-player', 'player-hurt-', this.playerFrameMap, 10, 0)
    this.createFrameAnimation('hv-ghoul-run', 'gv-ghoul', 'burning-ghoul-run1-', this.ghoulFrameMap, 10, -1)
  }

  private createFrameAnimation(
    key: string,
    texture: string,
    prefix: string,
    frameMap: Record<string, number>,
    frameRate: number,
    repeat: number,
  ) {
    if (this.anims.exists(key)) return
    const frames = Object.entries(frameMap)
      .filter(([name]) => name.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, frame]) => ({ key: texture, frame }))

    if (frames.length > 0) {
      this.anims.create({ key, frames, frameRate, repeat })
    }
  }

  private addBackground(width: number, height: number) {
    this.add.rectangle(width / 2, height / 2, width, height + 80, 0x061322).setScrollFactor(0)
    if (this.textures.exists('gv-background')) {
      this.add
        .tileSprite(0, 0, width, height, 'gv-background')
        .setOrigin(0)
        .setScrollFactor(0.22)
        .setDepth(-30)
      this.add
        .tileSprite(0, 0, width, height, 'gv-columns')
        .setOrigin(0)
        .setScrollFactor(0.42)
        .setDepth(-20)
      return
    }

    for (let x = 0; x < width; x += 420) {
      this.add.rectangle(x + 210, 260, 300, 290, 0x071d34, 0.6).setScrollFactor(0.18)
      this.add.rectangle(x + 210, 154, 220, 18, 0x1bb7ff, 0.22).setScrollFactor(0.18)
    }
    for (let x = 0; x < width; x += 220) {
      this.add.rectangle(x + 110, 330, 170, 300, 0x0b2a47, 0.55).setScrollFactor(0.45)
      this.add.rectangle(x + 110, 250, 120, 42, 0x153f66, 0.8).setScrollFactor(0.45)
      this.add.text(x + 68, 238, `ROOM ${400 + Math.floor(x / 220)}`, {
        color: '#bde9ff',
        fontFamily: 'Google Sans Text, Google Sans, sans-serif',
        fontSize: '13px',
        fontStyle: '700',
      }).setScrollFactor(0.45)
    }
    for (let x = 0; x < width; x += 80) {
      this.add.line(x, 620, 0, 0, 60, 0, 0x12476d, 0.45)
    }
  }

  private buildHospitalMap() {
    const makePlatform = (x: number, y: number, width: number) => {
      const platform = this.platforms.create(x, y, 'platform') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody
      platform.setDisplaySize(width, 22).refreshBody()
      return platform
    }

    makePlatform(350, 642, 760)
    makePlatform(1110, 642, 760)
    makePlatform(1870, 642, 760)
    makePlatform(2630, 642, 760)
    makePlatform(3390, 642, 760)
    makePlatform(560, 500, 260)
    makePlatform(920, 410, 240)
    makePlatform(1340, 520, 300)
    makePlatform(1740, 430, 240)
    makePlatform(2180, 535, 310)
    makePlatform(2620, 440, 260)
    makePlatform(3060, 520, 320)
  }

  private spawnWorldObjects() {
    const patientData = [
      { x: 520, y: 156, name: 'Mara', room: '402A', need: 'Fall risk' },
      { x: 1320, y: 156, name: 'Theo', room: '404B', need: 'Glucose low' },
      { x: 2220, y: 156, name: 'Lina', room: '407A', need: 'Bleeding cue' },
      { x: 3180, y: 156, name: 'Evan', room: '410C', need: 'Resp distress' },
    ]

    patientData.forEach((patient) => {
      const sprite = this.patients.create(patient.x, patient.y, 'patient-bed') as Phaser.Types.Physics.Arcade.SpriteWithStaticBody
      sprite.setScale(0.48).refreshBody()
      sprite.setData('rescued', false)
      sprite.setData('name', patient.name)
      sprite.setData('room', patient.room)
      sprite.setData('need', patient.need)
      this.add.text(patient.x - 42, patient.y - 56, `${patient.room}\n${patient.need}`, {
        color: '#e8f4ff',
        fontFamily: 'Google Sans Text, Google Sans, sans-serif',
        fontSize: '13px',
        fontStyle: '700',
        align: 'center',
      }).setOrigin(0.5)
    })

    ;[
      [350, 145],
      [960, 120],
      [1660, 145],
      [2470, 118],
      [2890, 145],
    ].forEach(([x, y]) => this.supplies.create(x, y, 'supply'))

    ;[
      [820, 160, 90],
      [1260, 160, 130],
      [1970, 160, 110],
      [2470, 132, 90],
      [3250, 160, 130],
    ].forEach(([x, y, range]) => {
      const hazard = this.hazards.create(x, y, this.textures.exists('gv-ghoul') ? 'gv-ghoul' : 'hazard') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      hazard.setScale(this.textures.exists('gv-ghoul') ? 0.95 : 1)
      hazard.body.setSize(this.textures.exists('gv-ghoul') ? 25 : 34, this.textures.exists('gv-ghoul') ? 44 : 34)
      hazard.body.setOffset(this.textures.exists('gv-ghoul') ? 16 : 8, this.textures.exists('gv-ghoul') ? 13 : 8)
      hazard.anims.play('hv-ghoul-run', true)
      hazard.setCollideWorldBounds(true).setBounce(1, 0)
      hazard.setVelocityX(range > 100 ? 58 : -58)
      hazard.setData('startX', x)
      hazard.setData('range', range)
    })

    this.exit = this.physics.add.staticSprite(4050, 140, 'exit')
    this.exit.setScale(0.55).refreshBody()
    this.add.text(3990, 70, 'HANDOFF\nEXIT', {
      color: '#bbf7d0',
      fontFamily: 'Google Sans Text, Google Sans, sans-serif',
      fontSize: '16px',
      fontStyle: '900',
      align: 'center',
    })
  }

  private handleHazardHit(hazard: unknown) {
    if (this.time.now - this.lastHitAt < 900 || this.status !== 'playing') return
    this.lastHitAt = this.time.now
    this.health = Math.max(0, this.health - 1)
    this.cameras.main.shake(130, 0.006)
    this.player.setTint(0xffc6c6)
    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      yoyo: true,
      repeat: 3,
      duration: 75,
      onComplete: () => {
        this.player.setAlpha(1)
        if (this.status === 'playing') this.player.clearTint()
      },
    })
    if (hazard instanceof Phaser.Physics.Arcade.Sprite) {
      hazard.setVelocityX(hazard.body ? -hazard.body.velocity.x : -90)
    }
    this.emitHud('Hazard hit. Reposition and keep moving.')
    if (this.health <= 0) {
      this.status = 'lost'
      this.player.setTint(0xef4444)
      this.emitHud('Shift failed. Press R to restart.')
      this.physics.pause()
    }
  }

  private collectSupply(supply: unknown) {
    if (!(supply instanceof Phaser.Physics.Arcade.Sprite)) return
    supply.destroy()
    this.medKits += 1
    this.confidence += 25
    this.emitFloatingText(supply.x, supply.y - 20, '+ supply kit', '#7dd3fc')
    this.emitHud('Supply collected. Use E near a patient to stabilize.')
  }

  private updateNearbyPatient() {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null
    let nearestDistance = 95
    this.patients.getChildren().forEach((child) => {
      const patient = child as Phaser.Physics.Arcade.Sprite
      if (patient.getData('rescued')) return
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, patient.x, patient.y)
      if (distance < nearestDistance) {
        nearest = patient
        nearestDistance = distance
      }
    })

    if (nearest !== this.nearbyPatient) {
      this.nearbyPatient = nearest
      this.emitHud()
    }
  }

  private updatePlayerAnimation(left: boolean | undefined, right: boolean | undefined) {
    if (this.player.texture.key !== 'gv-player' || this.status !== 'playing') return

    if (!this.player.body.blocked.down) {
      this.player.anims.play(this.player.body.velocity.y < 0 ? 'hv-player-jump' : 'hv-player-fall', true)
      return
    }

    if (left || right) {
      this.player.anims.play('hv-player-walk', true)
      return
    }

    this.player.anims.play('hv-player-idle', true)
  }

  private updateHazardPatrols() {
    this.hazards.getChildren().forEach((child) => {
      const hazard = child as Phaser.Physics.Arcade.Sprite
      const body = hazard.body as Phaser.Physics.Arcade.Body | null
      if (!body) return
      const startX = hazard.getData('startX') as number
      const range = hazard.getData('range') as number
      const speed = Math.max(70, Math.abs(body.velocity.x) || 85)

      if (hazard.x <= startX - range) {
        hazard.setVelocityX(speed)
      } else if (hazard.x >= startX + range) {
        hazard.setVelocityX(-speed)
      }
    })
  }

  private tryStabilizePatient() {
    if (!this.nearbyPatient || this.nearbyPatient.getData('rescued')) return
    if (this.medKits <= 0) {
      this.emitHud('Need a supply kit before stabilizing this patient.')
      this.emitFloatingText(this.player.x, this.player.y - 54, 'Need kit', '#fbbf24')
      return
    }

    this.medKits -= 1
    this.rescued += 1
    this.confidence += 150
    this.nearbyPatient.setTint(0x10b981)
    this.nearbyPatient.setData('rescued', true)
    this.emitFloatingText(
      this.nearbyPatient.x,
      this.nearbyPatient.y - 68,
      `${this.nearbyPatient.getData('room')} stabilized`,
      '#86efac',
    )
    this.emitHud(`${this.nearbyPatient.getData('name')} stabilized. Keep moving toward handoff.`)
  }

  private performPulseAction() {
    const pulseX = this.player.x + this.facing * 44
    const pulse = this.add.circle(pulseX, this.player.y, 34, 0x16b7ff, 0.25)
    this.tweens.add({ targets: pulse, alpha: 0, scale: 1.8, duration: 220, onComplete: () => pulse.destroy() })
    this.hazards.getChildren().forEach((child) => {
      const hazard = child as Phaser.Physics.Arcade.Sprite
      const distance = Phaser.Math.Distance.Between(pulseX, this.player.y, hazard.x, hazard.y)
      if (distance < 70) {
        hazard.destroy()
        this.confidence += 50
        this.emitFloatingText(pulseX, this.player.y - 40, 'hazard cleared', '#7dd3fc')
      }
    })
    this.emitHud()
  }

  private tryFinish() {
    if (this.status !== 'playing') return
    if (this.rescued < this.totalPatients) {
      this.emitHud('Stabilize every patient before handoff.')
      return
    }
    this.status = 'won'
    this.confidence += 500
    this.player.setTint(0x10b981)
    this.emitHud('Handoff complete. Floor safe.')
    this.physics.pause()
  }

  private emitFloatingText(x: number, y: number, message: string, color: string) {
    const text = this.add.text(x, y, message, {
      color,
      fontFamily: 'Google Sans Text, Google Sans, sans-serif',
      fontSize: '18px',
      fontStyle: '900',
      stroke: '#03111f',
      strokeThickness: 4,
    }).setOrigin(0.5)
    this.tweens.add({ targets: text, y: y - 42, alpha: 0, duration: 900, onComplete: () => text.destroy() })
  }

  private emitHud(objective?: string) {
    this.updateHud({
      health: this.health,
      maxHealth: this.maxHealth,
      confidence: this.confidence,
      supplies: this.medKits,
      rescued: this.rescued,
      totalPatients: this.totalPatients,
      objective:
        objective ??
        (this.nearbyPatient
          ? `Press E to stabilize ${this.nearbyPatient.getData('room')} - ${this.nearbyPatient.getData('need')}.`
          : this.status === 'ready'
            ? 'Press Enter or Start Run to begin your hospital rescue shift.'
            : 'Stabilize 4 patients, avoid hazards, and reach handoff.'),
      nearbyPatient: this.nearbyPatient ? `${this.nearbyPatient.getData('room')} - ${this.nearbyPatient.getData('name')}` : null,
      status: this.status,
    })
  }
}

export function NurseHospitalvaniaGame() {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [hud, setHud] = useState<HospitalvaniaHud>(initialHud)

  useEffect(() => {
    if (!parentRef.current || gameRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: parentRef.current,
      width: 1280,
      height: 720,
      backgroundColor: '#061322',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 950 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
      },
      scene: new HospitalvaniaScene(setHud),
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  const restart = () => {
    gameRef.current?.scene.getScene('hospitalvania')?.scene.restart()
    setHud(initialHud)
  }

  const getScene = () => gameRef.current?.scene.getScene('hospitalvania') as HospitalvaniaScene | undefined

  const startRun = () => getScene()?.startRun()

  const togglePause = () => getScene()?.togglePause()

  const statusLabel =
    hud.status === 'ready'
      ? 'Ready'
      : hud.status === 'paused'
        ? 'Paused'
        : hud.status === 'won'
          ? 'Cleared'
          : hud.status === 'lost'
            ? 'Failed'
            : 'Active'

  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      const scene = gameRef.current?.scene.getScene('hospitalvania') as HospitalvaniaScene | undefined

      if (event.key === 'Enter' && hud.status === 'ready') {
        event.preventDefault()
        scene?.startRun()
      }

      if ((event.key.toLowerCase() === 'p' || event.key === 'Escape') && (hud.status === 'playing' || hud.status === 'paused')) {
        event.preventDefault()
        scene?.togglePause()
      }
    }

    window.addEventListener('keydown', handleGlobalKeys)
    return () => window.removeEventListener('keydown', handleGlobalKeys)
  }, [hud.status])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03111f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(22,183,255,0.25),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,#061322_0%,#03111f_70%,#020913_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 p-4 md:p-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-sky-300/20 bg-[#071624]/86 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12"
              aria-label="Back to launch menu"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Nurse Command Arcade</p>
              <h1 className="text-3xl font-black tracking-[-0.05em] md:text-5xl">Hospitalvania</h1>
              <p className="mt-1 text-sm text-slate-300">
                A side-scrolling hospital rescue game inspired by classic platformers, rebuilt for nursing judgment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <HudPill label="Run" value={statusLabel} tone={hud.status === 'lost' ? 'danger' : hud.status === 'won' ? 'green' : 'blue'} />
            <HudPill label="Health" value={`${hud.health}/${hud.maxHealth}`} tone={hud.health <= 2 ? 'danger' : 'blue'} />
            <HudPill label="Supplies" value={`${hud.supplies}`} tone="green" />
            <HudPill label="Patients" value={`${hud.rescued}/${hud.totalPatients}`} tone="blue" />
            <HudPill label="Confidence" value={hud.confidence.toLocaleString()} tone="amber" />
          </div>
        </header>

        <section className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative overflow-hidden rounded-[30px] border border-sky-300/20 bg-[#071624] shadow-[0_30px_100px_rgba(0,0,0,0.38)]">
            <div ref={parentRef} className="min-h-[58vh] w-full" />
            {hud.status === 'ready' ? (
              <GameOverlay
                eyebrow="Nurse Command Side-Scroller"
                title="Hospitalvania"
                copy="Run the unit, jump hazards, stabilize patients, collect supplies, and reach handoff."
                primaryLabel="Start Run"
                primaryIcon={<Play className="h-4 w-4" />}
                onPrimary={startRun}
                secondaryLabel="Press Enter"
              />
            ) : null}
            {hud.status === 'paused' ? (
              <GameOverlay
                eyebrow="Pause"
                title="Shift Paused"
                copy="Take a breath. Your route, supplies, and patient progress are saved in this run."
                primaryLabel="Resume"
                primaryIcon={<Play className="h-4 w-4" />}
                onPrimary={togglePause}
                secondaryLabel="Press P or Esc"
              />
            ) : null}
            {hud.status === 'won' || hud.status === 'lost' ? (
              <GameOverlay
                eyebrow={hud.status === 'won' ? 'Handoff complete' : 'Run ended'}
                title={hud.status === 'won' ? 'Floor Safe' : 'Try the Shift Again'}
                copy={
                  hud.status === 'won'
                    ? 'Nice rescue. You stabilized every patient and reached handoff.'
                    : 'The patient load got away from you. Restart, collect supplies, and keep distance from hazards.'
                }
                primaryLabel="Restart"
                primaryIcon={<RotateCcw className="h-4 w-4" />}
                onPrimary={restart}
                secondaryLabel="Press R"
              />
            ) : null}
          </div>

          <aside className="space-y-4">
            <CommandPanel title="Mission" icon={<ShieldCheck className="h-4 w-4" />}>
              <p className="text-sm leading-6 text-slate-300">{hud.objective}</p>
              {hud.nearbyPatient ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Nearby patient</p>
                  <p className="mt-1 text-sm font-black text-white">{hud.nearbyPatient}</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-black text-sky-100">
                    <kbd className="rounded-lg border border-white/20 bg-white/14 px-2 py-1">E</kbd>
                    Stabilize
                  </p>
                </div>
              ) : null}
            </CommandPanel>

            <CommandPanel title="Controls" icon={<Sparkles className="h-4 w-4" />}>
              <div className="grid gap-2 text-sm text-slate-300">
                <ControlRow keys="A / D or Left / Right" label="Move" />
                <ControlRow keys="W / Space" label="Jump" />
                <ControlRow keys="E" label="Stabilize nearby patient" />
                <ControlRow keys="K" label="Clear hazard pulse" />
                <ControlRow keys="P / Esc" label="Pause" />
                <ControlRow keys="R" label="Restart run" />
              </div>
            </CommandPanel>

            <CommandPanel title="Shift Result" icon={<HeartPulse className="h-4 w-4" />}>
              <p
                className={clsx(
                  'text-2xl font-black tracking-[-0.04em]',
                  hud.status === 'won' ? 'text-emerald-200' : hud.status === 'lost' ? 'text-rose-200' : 'text-white',
                )}
              >
                {hud.status === 'won'
                  ? 'Handoff Complete'
                  : hud.status === 'lost'
                    ? 'Shift Failed'
                    : hud.status === 'paused'
                      ? 'Paused'
                      : hud.status === 'ready'
                        ? 'Ready to Start'
                        : 'Run Active'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Stabilize each patient with supplies, avoid infection hazards, and reach the green handoff exit.
              </p>
              <button
                type="button"
                onClick={hud.status === 'ready' ? startRun : togglePause}
                disabled={hud.status === 'won' || hud.status === 'lost'}
                className="mt-4 mr-2 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/14 px-4 py-3 text-sm font-black text-emerald-50 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {hud.status === 'paused' || hud.status === 'ready' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {hud.status === 'ready' ? 'Start' : hud.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={restart}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-sky-300/25 bg-sky-400/14 px-4 py-3 text-sm font-black text-sky-50 transition hover:-translate-y-0.5"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
            </CommandPanel>
          </aside>
        </section>
      </div>
    </main>
  )
}

function GameOverlay({
  eyebrow,
  title,
  copy,
  primaryLabel,
  primaryIcon,
  onPrimary,
  secondaryLabel,
}: {
  eyebrow: string
  title: string
  copy: string
  primaryLabel: string
  primaryIcon: React.ReactNode
  onPrimary: () => void
  secondaryLabel: string
}) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-[#020913]/72 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[30px] border border-sky-300/30 bg-[#061a2e]/92 p-7 text-center shadow-[0_0_70px_rgba(22,183,255,0.28)]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">{eyebrow}</p>
        <h2 className="mt-3 text-5xl font-black tracking-[-0.06em] text-white md:text-7xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-300">{copy}</p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-400 px-6 py-4 text-sm font-black text-[#03111f] shadow-[0_0_28px_rgba(22,183,255,0.42)] transition hover:-translate-y-0.5 hover:bg-sky-300"
          >
            {primaryIcon}
            {primaryLabel}
          </button>
          <span className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-slate-200">
            {secondaryLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

function HudPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'amber' | 'danger'
}) {
  const toneClass = {
    blue: 'text-sky-200',
    green: 'text-emerald-200',
    amber: 'text-amber-200',
    danger: 'text-rose-200',
  }[tone]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={clsx('mt-1 text-xl font-black', toneClass)}>{value}</p>
    </div>
  )
}

function CommandPanel({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-white/8 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-200">
        {icon}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ControlRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/6 px-3 py-2">
      <span className="font-bold text-slate-200">{label}</span>
      <kbd className="rounded-lg border border-white/15 bg-white/12 px-2 py-1 text-xs font-black text-white">
        {keys}
      </kbd>
    </div>
  )
}
