import Phaser from 'phaser'

// Color palette
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
const SLING_RADIUS = 50
const BASE_ANGULAR_SPEED = 2 // radians per second
const SPEED_INCREASE_PER_ROTATION = 0.2 // 20% increase

type GameState = 'idle' | 'swinging' | 'flying' | 'resting'

export class GameScene extends Phaser.Scene {
  private shepherdGraphics!: Phaser.GameObjects.Graphics
  private slingGraphics!: Phaser.GameObjects.Graphics
  private stoneGraphics!: Phaser.GameObjects.Graphics
  private handPosition!: Phaser.Math.Vector2
  private stonePosition!: Phaser.Math.Vector2

  // Sling state
  private gameState: GameState = 'idle'
  private slingAngle: number = 0
  private angularSpeed: number = BASE_ANGULAR_SPEED
  private rotationCount: number = 0
  private lastAngleForCount: number = 0

  // Input
  private spaceKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    const groundY = this.scale.height - GROUND_Y_OFFSET

    // Set background color
    this.cameras.main.setBackgroundColor(COLORS.sky)

    // Create ground
    const groundWidth = 20000
    this.matter.add.rectangle(
      groundWidth / 2,
      groundY + 10,
      groundWidth,
      20,
      {
        isStatic: true,
        friction: 0.8,
        restitution: 0.4,
        label: 'ground',
      }
    )

    // Draw ground visually
    const groundGraphics = this.add.graphics()
    groundGraphics.fillStyle(COLORS.ground, 1)
    groundGraphics.fillRect(-100, groundY, groundWidth + 100, 40)

    // Draw shepherd
    this.shepherdGraphics = this.add.graphics()
    this.drawShepherd(SHEPHERD_X, groundY)

    // Hand position (sling pivot point)
    this.handPosition = new Phaser.Math.Vector2(SHEPHERD_X, groundY - 50)

    // Stone position (starts at rest beside shepherd)
    this.stonePosition = new Phaser.Math.Vector2(
      this.handPosition.x + SLING_RADIUS,
      this.handPosition.y
    )

    // Graphics for sling and stone
    this.slingGraphics = this.add.graphics()
    this.stoneGraphics = this.add.graphics()

    // Draw initial state
    this.drawSlingAndStone()

    // Input
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000 // convert to seconds

    if (this.gameState === 'idle') {
      if (this.spaceKey.isDown) {
        this.gameState = 'swinging'
        this.slingAngle = 0
        this.angularSpeed = BASE_ANGULAR_SPEED
        this.rotationCount = 0
        this.lastAngleForCount = 0
      }
    } else if (this.gameState === 'swinging') {
      // Rotate stone
      this.slingAngle += this.angularSpeed * dt

      // Count rotations and increase speed
      if (this.slingAngle - this.lastAngleForCount >= Math.PI * 2) {
        this.rotationCount++
        this.lastAngleForCount = this.slingAngle
        // Increase speed, cap at 5x base speed
        this.angularSpeed = Math.min(
          BASE_ANGULAR_SPEED * (1 + SPEED_INCREASE_PER_ROTATION * this.rotationCount),
          BASE_ANGULAR_SPEED * 5
        )
      }

      // Update stone position
      this.stonePosition.x = this.handPosition.x + Math.cos(this.slingAngle) * SLING_RADIUS
      this.stonePosition.y = this.handPosition.y - Math.sin(this.slingAngle) * SLING_RADIUS

      this.drawSlingAndStone()

      // Release on space up
      if (!this.spaceKey.isDown) {
        this.gameState = 'idle' // Will change to 'flying' in next task
        console.log(`Released after ${this.rotationCount} rotations at speed ${this.angularSpeed.toFixed(2)}`)
      }
    }
  }

  private drawShepherd(x: number, groundY: number): void {
    const g = this.shepherdGraphics
    g.clear()
    g.lineStyle(3, COLORS.shepherd, 1)

    const headY = groundY - 55
    const shoulderY = groundY - 45
    const hipY = groundY - 25
    const footY = groundY

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
    // Draw sling cord
    this.slingGraphics.clear()
    this.slingGraphics.lineStyle(2, COLORS.sling, 1)
    this.slingGraphics.beginPath()
    this.slingGraphics.moveTo(this.handPosition.x, this.handPosition.y)
    this.slingGraphics.lineTo(this.stonePosition.x, this.stonePosition.y)
    this.slingGraphics.strokePath()

    // Draw stone
    this.stoneGraphics.clear()
    this.stoneGraphics.fillStyle(COLORS.stone, 1)
    this.stoneGraphics.fillCircle(this.stonePosition.x, this.stonePosition.y, 8)
  }
}
