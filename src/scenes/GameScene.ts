import Phaser from 'phaser'

// Color palette
const COLORS = {
  sky: 0x8899aa,
  ground: 0x4a4a4a,
  shepherd: 0x2d2d2d,
  stone: 0x666666,
  sling: 0x3d3d3d,
  trajectory: 0x666666,
  sweetSpot: 0x4a7c4e,
  powerBar: 0x4a7c4e,
  powerBarBg: 0x3d3d3d,
}

// Release zone (optimal release angles for forward throw)
const SWEET_SPOT_START = Math.PI * 0.25  // 45 degrees into rotation
const SWEET_SPOT_END = Math.PI * 0.75    // 135 degrees into rotation

// Slow motion settings
const SLOW_MO_DURATION = 800  // milliseconds
const SLOW_MO_SCALE = 0.3     // time scale during slow-mo

const STORAGE_KEY = 'pixel-sling-highscore'

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
  private trajectoryGraphics!: Phaser.GameObjects.Graphics
  private releaseZoneGraphics!: Phaser.GameObjects.Graphics
  private powerMeterBg!: Phaser.GameObjects.Graphics
  private powerMeterFill!: Phaser.GameObjects.Graphics
  private hintText!: Phaser.GameObjects.Text
  private distanceText!: Phaser.GameObjects.Text
  private highScoreText!: Phaser.GameObjects.Text
  private newBestText!: Phaser.GameObjects.Text

  // High score
  private highScore: number = 0

  // Slow motion
  private isSlowMo: boolean = false

  // Previous throw trajectory
  private previousTrajectory: { x: number; y: number }[] = []

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

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.groundY = this.scale.height - GROUND_Y_OFFSET

    this.loadHighScore()
    this.setupWorld()
    this.setupShepherd()
    this.setupStone()
    this.setupUI()
    this.setupInput()
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem(STORAGE_KEY)
    this.highScore = saved ? parseFloat(saved) : 0
  }

  private saveHighScore(): void {
    localStorage.setItem(STORAGE_KEY, this.highScore.toString())
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
    this.releaseZoneGraphics = this.add.graphics()
    this.slingGraphics = this.add.graphics()
    this.stoneGraphics = this.add.graphics()
    this.trajectoryGraphics = this.add.graphics()
    this.drawSlingAndStone()
  }

  private setupUI(): void {
    this.hintText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 60,
      'Hold SPACE to swing, release to throw',
      { fontFamily: 'monospace', fontSize: '14px', color: '#2d2d2d', align: 'center' }
    )
    this.hintText.setOrigin(0.5)
    this.hintText.setScrollFactor(0)

    // Distance display
    this.distanceText = this.add.text(
      this.scale.width / 2,
      50,
      '',
      { fontFamily: 'monospace', fontSize: '24px', color: '#2d2d2d', align: 'center' }
    )
    this.distanceText.setOrigin(0.5)
    this.distanceText.setScrollFactor(0)
    this.distanceText.setAlpha(0)

    // High score display
    this.highScoreText = this.add.text(
      this.scale.width - 10,
      10,
      this.highScore > 0 ? `Best: ${this.highScore.toFixed(1)}m` : '',
      { fontFamily: 'monospace', fontSize: '16px', color: '#2d2d2d', align: 'right' }
    )
    this.highScoreText.setOrigin(1, 0)
    this.highScoreText.setScrollFactor(0)

    // New best celebration text (hidden)
    this.newBestText = this.add.text(
      this.scale.width / 2,
      90,
      'NEW BEST!',
      { fontFamily: 'monospace', fontSize: '18px', color: '#4a7c4e', align: 'center' }
    )
    this.newBestText.setOrigin(0.5)
    this.newBestText.setScrollFactor(0)
    this.newBestText.setAlpha(0)

    // Power meter (left side)
    this.powerMeterBg = this.add.graphics()
    this.powerMeterBg.setScrollFactor(0)
    this.powerMeterFill = this.add.graphics()
    this.powerMeterFill.setScrollFactor(0)
  }

  private setupInput(): void {
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000 // convert to seconds

    switch (this.gameState) {
      case 'idle':
        this.drawPreviousTrajectory()
        if (this.spaceKey.isDown) this.startSwinging()
        break
      case 'swinging':
        this.drawPreviousTrajectory()
        this.updateSwinging(dt)
        break
      case 'flying':
        this.updateFlying(dt)
        // SPACE restarts the game
        if (this.spaceKey.isDown) {
          this.resetGame()
          this.startSwinging()
        }
        break
      case 'resting':
        this.drawPreviousTrajectory()
        // SPACE restarts the game
        if (this.spaceKey.isDown) {
          this.resetGame()
          this.startSwinging()
        }
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

    this.drawReleaseZone()
    this.drawPowerMeter()
    this.drawSlingAndStone()

    // Release on space up
    if (!this.spaceKey.isDown) {
      this.launchStone()
    }
  }

  private drawReleaseZone(): void {
    this.releaseZoneGraphics.clear()

    // Draw the sweet spot arc
    this.releaseZoneGraphics.lineStyle(4, COLORS.sweetSpot, 0.5)

    // Convert our rotation angles to Phaser's arc angles
    // Our angle: 0 = down, increases clockwise
    // Phaser arc: 0 = right, increases counter-clockwise
    // So we need to transform: phaserAngle = PI/2 - ourAngle
    const startAngle = Math.PI / 2 - SWEET_SPOT_END
    const endAngle = Math.PI / 2 - SWEET_SPOT_START

    this.releaseZoneGraphics.beginPath()
    this.releaseZoneGraphics.arc(
      this.handPosition.x,
      this.handPosition.y,
      SLING_RADIUS + 10,
      startAngle,
      endAngle,
      false
    )
    this.releaseZoneGraphics.strokePath()

    // Check if currently in sweet spot and highlight
    const normalizedAngle = this.slingAngle % (Math.PI * 2)
    if (normalizedAngle >= SWEET_SPOT_START && normalizedAngle <= SWEET_SPOT_END) {
      // Stone is in sweet spot - make it glow
      this.stoneGraphics.lineStyle(3, COLORS.sweetSpot, 0.8)
      this.stoneGraphics.strokeCircle(this.stonePosition.x, this.stonePosition.y, STONE_RADIUS + 4)
    }
  }

  private drawPowerMeter(): void {
    const meterX = 20
    const meterY = 100
    const meterWidth = 15
    const meterHeight = 150

    // Calculate power (0 to 1)
    const power = Math.min(
      (this.angularSpeed / BASE_ANGULAR_SPEED - 1) / (MAX_SPEED_MULTIPLIER - 1),
      1
    )

    // Background
    this.powerMeterBg.clear()
    this.powerMeterBg.fillStyle(COLORS.powerBarBg, 0.5)
    this.powerMeterBg.fillRect(meterX, meterY, meterWidth, meterHeight)

    // Fill (from bottom up)
    this.powerMeterFill.clear()
    this.powerMeterFill.fillStyle(COLORS.powerBar, 0.8)
    const fillHeight = meterHeight * power
    this.powerMeterFill.fillRect(meterX, meterY + meterHeight - fillHeight, meterWidth, fillHeight)

    // Border
    this.powerMeterBg.lineStyle(2, COLORS.shepherd, 0.8)
    this.powerMeterBg.strokeRect(meterX, meterY, meterWidth, meterHeight)
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

    // Clear previous trajectory and start recording new one
    this.previousTrajectory = []
    this.trajectoryGraphics.clear()

    // Clear swing UI
    this.releaseZoneGraphics.clear()
    this.powerMeterBg.clear()
    this.powerMeterFill.clear()

    // Hide sling cord
    this.slingGraphics.clear()
    this.gameState = 'flying'

    // Start slow motion
    this.startSlowMotion()

    // Fade hint on first throw
    if (!this.hasThrown) {
      this.hasThrown = true
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 1000, ease: 'Power2' })
    }
  }

  private startSlowMotion(): void {
    if (this.isSlowMo) return  // Already in slow-mo
    this.isSlowMo = true
    this.time.timeScale = SLOW_MO_SCALE

    // Return to normal speed after duration
    this.time.delayedCall(SLOW_MO_DURATION * SLOW_MO_SCALE, () => {
      this.time.timeScale = 1
      this.isSlowMo = false
    })
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
        this.checkHighScore()
      }
    }

    // Record trajectory point (every few frames to avoid too many points)
    if (this.previousTrajectory.length === 0 ||
        Math.abs(this.stonePosition.x - this.previousTrajectory[this.previousTrajectory.length - 1].x) > 15) {
      this.previousTrajectory.push({ x: this.stonePosition.x, y: this.stonePosition.y })
    }

    // Update camera to follow stone (both directions)
    this.cameras.main.scrollX = this.stonePosition.x - 200

    // Update live distance display
    this.updateDistance()

    // Redraw stone
    this.drawStoneOnly()
  }

  private drawPreviousTrajectory(): void {
    this.trajectoryGraphics.clear()

    if (this.previousTrajectory.length < 2) return

    this.trajectoryGraphics.fillStyle(COLORS.trajectory, 0.7)

    for (const point of this.previousTrajectory) {
      this.trajectoryGraphics.fillCircle(point.x, point.y, 3)
    }
  }

  private updateDistance(): void {
    const distancePixels = Math.abs(this.stonePosition.x - SHEPHERD_X)
    const distanceMeters = distancePixels / PIXELS_PER_METER
    this.distanceText.setText(`${distanceMeters.toFixed(1)}m`)
    this.distanceText.setAlpha(1)
  }

  private checkHighScore(): void {
    const distancePixels = Math.abs(this.stonePosition.x - SHEPHERD_X)
    const distanceMeters = distancePixels / PIXELS_PER_METER

    if (distanceMeters > this.highScore) {
      this.highScore = distanceMeters
      this.saveHighScore()
      this.highScoreText.setText(`Best: ${this.highScore.toFixed(1)}m`)

      // Show celebration
      this.newBestText.setAlpha(1)
      this.tweens.add({
        targets: this.newBestText,
        alpha: 0,
        duration: 2000,
        delay: 1000,
        ease: 'Power2'
      })
    }
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

    // Reset time scale
    this.time.timeScale = 1
    this.isSlowMo = false

    // Hide UI elements
    this.distanceText.setAlpha(0)
    this.newBestText.setAlpha(0)
    this.trajectoryGraphics.clear()
    this.releaseZoneGraphics.clear()
    this.powerMeterBg.clear()
    this.powerMeterFill.clear()

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
