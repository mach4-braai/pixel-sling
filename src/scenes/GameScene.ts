import Phaser from 'phaser'

// Color palette (5 colors - minimalist)
const COLORS = {
  sky: 0x8899aa,
  ground: 0x4a4a4a,
  shepherd: 0x2d2d2d,
  stone: 0x666666,
  sling: 0x3d3d3d,
}

// Game constants
const SHEPHERD_X = 150
const GROUND_Y_OFFSET = 20
const SLING_RADIUS = 45
const BASE_ANGULAR_SPEED = 2.5
const SPEED_INCREASE_PER_ROTATION = 0.25
const LAUNCH_VELOCITY_MULTIPLIER = 180
const REST_DELAY_MS = 500

type GameState = 'idle' | 'swinging' | 'flying' | 'resting'

export class GameScene extends Phaser.Scene {
  // Graphics
  private shepherdGraphics!: Phaser.GameObjects.Graphics
  private slingGraphics!: Phaser.GameObjects.Graphics
  private stoneGraphics!: Phaser.GameObjects.Graphics
  private hintText!: Phaser.GameObjects.Text

  // Positions
  private handPosition!: Phaser.Math.Vector2
  private stonePosition!: Phaser.Math.Vector2
  private groundY!: number

  // Physics
  private stoneBody: MatterJS.BodyType | null = null

  // State
  private gameState: GameState = 'idle'
  private slingAngle: number = 0
  private angularSpeed: number = BASE_ANGULAR_SPEED
  private rotationCount: number = 0
  private lastAngleForCount: number = 0
  private restingTime: number = 0
  private hasThrown: boolean = false

  // Input
  private spaceKey!: Phaser.Input.Keyboard.Key
  private rKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.groundY = this.scale.height - GROUND_Y_OFFSET

    this.setupWorld()
    this.setupShepherd()
    this.setupStone()
    this.setupUI()
    this.setupInput()
  }

  private setupWorld(): void {
    this.cameras.main.setBackgroundColor(COLORS.sky)
    this.cameras.main.setBounds(-100, 0, 20000, this.scale.height)

    const groundWidth = 20000
    this.matter.add.rectangle(
      groundWidth / 2,
      this.groundY + 10,
      groundWidth,
      20,
      { isStatic: true, friction: 0.8, restitution: 0.4, label: 'ground' }
    )

    const groundGraphics = this.add.graphics()
    groundGraphics.fillStyle(COLORS.ground, 1)
    groundGraphics.fillRect(-100, this.groundY, groundWidth + 100, 40)
  }

  private setupShepherd(): void {
    this.shepherdGraphics = this.add.graphics()
    this.handPosition = new Phaser.Math.Vector2(SHEPHERD_X, this.groundY - 50)
    this.drawShepherd()
  }

  private setupStone(): void {
    this.stonePosition = new Phaser.Math.Vector2(
      this.handPosition.x + SLING_RADIUS,
      this.handPosition.y
    )
    this.slingGraphics = this.add.graphics()
    this.stoneGraphics = this.add.graphics()
    this.drawSlingAndStone()
  }

  private setupUI(): void {
    this.hintText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 60,
      'Hold SPACE to swing, release to throw\nPress R to reset',
      { fontFamily: 'monospace', fontSize: '14px', color: '#2d2d2d', align: 'center' }
    )
    this.hintText.setOrigin(0.5)
    this.hintText.setScrollFactor(0)
  }

  private setupInput(): void {
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000

    switch (this.gameState) {
      case 'idle':
        if (this.spaceKey.isDown) this.startSwinging()
        break
      case 'swinging':
        this.updateSwinging(dt)
        break
      case 'flying':
        this.updateFlying()
        break
      case 'resting':
        this.restingTime += delta
        if (this.restingTime > REST_DELAY_MS && this.rKey.isDown) this.resetGame()
        break
    }
  }

  private startSwinging(): void {
    this.gameState = 'swinging'
    this.slingAngle = 0
    this.angularSpeed = BASE_ANGULAR_SPEED
    this.rotationCount = 0
    this.lastAngleForCount = 0
  }

  private updateSwinging(dt: number): void {
    this.slingAngle += this.angularSpeed * dt

    if (this.slingAngle - this.lastAngleForCount >= Math.PI * 2) {
      this.rotationCount++
      this.lastAngleForCount = this.slingAngle
      this.angularSpeed = Math.min(
        BASE_ANGULAR_SPEED * (1 + SPEED_INCREASE_PER_ROTATION * this.rotationCount),
        BASE_ANGULAR_SPEED * 5
      )
    }

    this.stonePosition.x = this.handPosition.x + Math.cos(this.slingAngle) * SLING_RADIUS
    this.stonePosition.y = this.handPosition.y - Math.sin(this.slingAngle) * SLING_RADIUS
    this.drawSlingAndStone()

    if (!this.spaceKey.isDown) this.launchStone()
  }

  private launchStone(): void {
    const tangentX = -Math.sin(this.slingAngle)
    const tangentY = -Math.cos(this.slingAngle)
    const speed = this.angularSpeed * LAUNCH_VELOCITY_MULTIPLIER / Math.PI

    this.stoneBody = this.matter.add.circle(
      this.stonePosition.x,
      this.stonePosition.y,
      8,
      { restitution: 0.4, friction: 0.3, frictionAir: 0.001, label: 'stone' }
    )

    this.matter.body.setVelocity(this.stoneBody, {
      x: tangentX * speed,
      y: tangentY * speed,
    })

    this.slingGraphics.clear()
    this.gameState = 'flying'

    if (!this.hasThrown) {
      this.hasThrown = true
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 1000, ease: 'Power2' })
    }
  }

  private updateFlying(): void {
    if (!this.stoneBody) return

    this.stonePosition.x = this.stoneBody.position.x
    this.stonePosition.y = this.stoneBody.position.y
    this.drawStoneOnly()

    this.cameras.main.scrollX = this.stonePosition.x - 200

    const { x: vx, y: vy } = this.stoneBody.velocity
    const speed = Math.sqrt(vx * vx + vy * vy)

    if (speed < 0.1 && this.stonePosition.y >= this.groundY - 10) {
      this.gameState = 'resting'
      this.restingTime = 0
    }
  }

  private resetGame(): void {
    if (this.stoneBody) {
      this.matter.world.remove(this.stoneBody)
      this.stoneBody = null
    }

    this.stonePosition.x = this.handPosition.x + SLING_RADIUS
    this.stonePosition.y = this.handPosition.y
    this.cameras.main.scrollX = 0
    this.drawSlingAndStone()
    this.gameState = 'idle'
  }

  private drawShepherd(): void {
    const g = this.shepherdGraphics
    const x = SHEPHERD_X
    const headY = this.groundY - 55
    const shoulderY = this.groundY - 45
    const hipY = this.groundY - 25
    const footY = this.groundY

    g.clear()
    g.lineStyle(3, COLORS.shepherd, 1)
    g.strokeCircle(x, headY, 6)
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x, hipY)
    g.strokePath()
    g.beginPath()
    g.moveTo(x, hipY)
    g.lineTo(x - 8, footY)
    g.moveTo(x, hipY)
    g.lineTo(x + 8, footY)
    g.strokePath()
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x - 10, shoulderY + 15)
    g.strokePath()
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x, shoulderY - 5)
    g.strokePath()
  }

  private drawSlingAndStone(): void {
    this.slingGraphics.clear()
    this.slingGraphics.lineStyle(2, COLORS.sling, 1)
    this.slingGraphics.beginPath()
    this.slingGraphics.moveTo(this.handPosition.x, this.handPosition.y)
    this.slingGraphics.lineTo(this.stonePosition.x, this.stonePosition.y)
    this.slingGraphics.strokePath()
    this.drawStoneOnly()
  }

  private drawStoneOnly(): void {
    this.stoneGraphics.clear()
    this.stoneGraphics.fillStyle(COLORS.stone, 1)
    this.stoneGraphics.fillCircle(this.stonePosition.x, this.stonePosition.y, 8)
  }
}
