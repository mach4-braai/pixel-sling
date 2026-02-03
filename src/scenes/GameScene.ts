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
const STONE_RADIUS = 8

// Sling mechanics
const BASE_ANGULAR_SPEED = 8 // radians per second
const SPEED_INCREASE_PER_ROTATION = 0.15
const MAX_SPEED_MULTIPLIER = 3

// Physics constants
const GRAVITY = 800 // pixels per second squared
const LAUNCH_SPEED = 300 // base launch speed in pixels/second
const BOUNCE_DAMPING = 0.4 // velocity retained after bounce
const FRICTION = 0.98 // horizontal velocity multiplier per frame when rolling
const REST_THRESHOLD = 10 // velocity below this = at rest
const PIXELS_PER_METER = 50 // scale for distance display

type GameState = 'idle' | 'swinging' | 'flying' | 'resting'

export class GameScene extends Phaser.Scene {
  // Graphics
  private shepherdGraphics!: Phaser.GameObjects.Graphics
  private slingGraphics!: Phaser.GameObjects.Graphics
  private stoneGraphics!: Phaser.GameObjects.Graphics
  private groundGraphics!: Phaser.GameObjects.Graphics
  private hintText!: Phaser.GameObjects.Text
  private distanceText!: Phaser.GameObjects.Text

  // Positions
  private handPosition!: Phaser.Math.Vector2
  private stonePosition!: Phaser.Math.Vector2
  private groundY!: number

  // Velocity (only used during flight)
  private velocityX: number = 0
  private velocityY: number = 0

  // State
  private gameState: GameState = 'idle'
  private slingAngle: number = 0
  private angularSpeed: number = BASE_ANGULAR_SPEED
  private rotationCount: number = 0
  private lastAngleForCount: number = 0
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
    // Allow camera to follow stone in both directions
    this.cameras.main.setBounds(-10000, 0, 30000, this.scale.height)

    // Draw ground (extends both directions)
    this.groundGraphics = this.add.graphics()
    this.groundGraphics.fillStyle(COLORS.ground, 1)
    this.groundGraphics.fillRect(-10000, this.groundY, 30000, 40)
  }

  private setupShepherd(): void {
    this.shepherdGraphics = this.add.graphics()
    // Hand stretched out to the right at shoulder height
    const shoulderY = this.groundY - 45
    this.handPosition = new Phaser.Math.Vector2(SHEPHERD_X + 20, shoulderY)
    this.drawShepherd()
  }

  private setupStone(): void {
    // Stone dangles below the hand when idle
    this.stonePosition = new Phaser.Math.Vector2(
      this.handPosition.x,
      this.handPosition.y + SLING_RADIUS
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

    // Distance display (hidden until stone comes to rest)
    this.distanceText = this.add.text(
      this.scale.width / 2,
      50,
      '',
      { fontFamily: 'monospace', fontSize: '24px', color: '#2d2d2d', align: 'center' }
    )
    this.distanceText.setOrigin(0.5)
    this.distanceText.setScrollFactor(0)
    this.distanceText.setAlpha(0)
  }

  private setupInput(): void {
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000 // convert to seconds

    // R key resets from any state except idle
    if (this.rKey.isDown && this.gameState !== 'idle') {
      this.resetGame()
      return
    }

    switch (this.gameState) {
      case 'idle':
        if (this.spaceKey.isDown) this.startSwinging()
        break
      case 'swinging':
        this.updateSwinging(dt)
        break
      case 'flying':
        this.updateFlying(dt)
        break
      case 'resting':
        // Just wait for R key (handled above)
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
    // Rotate stone around hand (clockwise)
    this.slingAngle += this.angularSpeed * dt

    // Count rotations and increase speed
    if (this.slingAngle - this.lastAngleForCount >= Math.PI * 2) {
      this.rotationCount++
      this.lastAngleForCount = this.slingAngle
      this.angularSpeed = Math.min(
        BASE_ANGULAR_SPEED * (1 + SPEED_INCREASE_PER_ROTATION * this.rotationCount),
        BASE_ANGULAR_SPEED * MAX_SPEED_MULTIPLIER
      )
    }

    // Update stone position on the circle (clockwise rotation)
    // At angle 0: stone hangs below, then goes forward (right), up, back (left), down
    this.stonePosition.x = this.handPosition.x + Math.sin(this.slingAngle) * SLING_RADIUS
    this.stonePosition.y = this.handPosition.y + Math.cos(this.slingAngle) * SLING_RADIUS
    this.drawSlingAndStone()

    // Release on space up
    if (!this.spaceKey.isDown) {
      this.launchStone()
    }
  }

  private launchStone(): void {
    // Calculate tangent direction (perpendicular to radius, in direction of clockwise rotation)
    // For clockwise rotation: tangent = (cos, -sin) in screen coords
    const tangentX = Math.cos(this.slingAngle)
    const tangentY = -Math.sin(this.slingAngle)

    // Launch speed scales with angular speed
    const speedMultiplier = this.angularSpeed / BASE_ANGULAR_SPEED
    const launchSpeed = LAUNCH_SPEED * speedMultiplier

    this.velocityX = tangentX * launchSpeed
    this.velocityY = tangentY * launchSpeed

    // Hide sling cord
    this.slingGraphics.clear()
    this.gameState = 'flying'

    // Fade hint on first throw
    if (!this.hasThrown) {
      this.hasThrown = true
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 1000, ease: 'Power2' })
    }
  }

  private updateFlying(dt: number): void {
    // Apply gravity
    this.velocityY += GRAVITY * dt

    // Update position
    this.stonePosition.x += this.velocityX * dt
    this.stonePosition.y += this.velocityY * dt

    // Ground collision
    const groundContact = this.groundY - STONE_RADIUS
    if (this.stonePosition.y >= groundContact) {
      this.stonePosition.y = groundContact

      // Bounce
      if (Math.abs(this.velocityY) > REST_THRESHOLD) {
        this.velocityY = -this.velocityY * BOUNCE_DAMPING
        this.velocityX *= 0.9 // Lose some horizontal speed on bounce
      } else {
        // Rolling on ground
        this.velocityY = 0
        this.velocityX *= FRICTION
      }

      // Check if at rest
      if (Math.abs(this.velocityX) < REST_THRESHOLD && Math.abs(this.velocityY) < REST_THRESHOLD) {
        this.velocityX = 0
        this.velocityY = 0
        this.gameState = 'resting'
      }
    }

    // Update camera to follow stone (both directions)
    this.cameras.main.scrollX = this.stonePosition.x - 200

    // Update live distance display
    this.updateDistance()

    // Redraw stone
    this.drawStoneOnly()
  }

  private updateDistance(): void {
    const distancePixels = Math.abs(this.stonePosition.x - SHEPHERD_X)
    const distanceMeters = distancePixels / PIXELS_PER_METER
    this.distanceText.setText(`${distanceMeters.toFixed(1)}m`)
    this.distanceText.setAlpha(1)
  }

  private resetGame(): void {
    // Reset stone position (dangling below hand)
    this.stonePosition.x = this.handPosition.x
    this.stonePosition.y = this.handPosition.y + SLING_RADIUS

    // Reset velocity
    this.velocityX = 0
    this.velocityY = 0

    // Reset camera
    this.cameras.main.scrollX = 0

    // Hide distance
    this.distanceText.setAlpha(0)

    // Redraw
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

    // Head
    g.strokeCircle(x, headY, 6)

    // Body
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x, hipY)
    g.strokePath()

    // Legs
    g.beginPath()
    g.moveTo(x, hipY)
    g.lineTo(x - 8, footY)
    g.moveTo(x, hipY)
    g.lineTo(x + 8, footY)
    g.strokePath()

    // Left arm (down by side)
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x - 10, shoulderY + 15)
    g.strokePath()

    // Right arm (stretched out horizontally holding sling)
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x + 20, shoulderY)
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
    this.stoneGraphics.fillCircle(this.stonePosition.x, this.stonePosition.y, STONE_RADIUS)
  }
}
