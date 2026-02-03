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
const BASE_ANGULAR_SPEED = 2
const SPEED_INCREASE_PER_ROTATION = 0.2
const LAUNCH_VELOCITY_MULTIPLIER = 150 // Convert angular to linear velocity

type GameState = 'idle' | 'swinging' | 'flying' | 'resting'

export class GameScene extends Phaser.Scene {
  private shepherdGraphics!: Phaser.GameObjects.Graphics
  private slingGraphics!: Phaser.GameObjects.Graphics
  private stoneGraphics!: Phaser.GameObjects.Graphics
  private handPosition!: Phaser.Math.Vector2
  private stonePosition!: Phaser.Math.Vector2

  // Physics stone (only exists during flight)
  private stoneBody: MatterJS.BodyType | null = null

  // Sling state
  private gameState: GameState = 'idle'
  private slingAngle: number = 0
  private angularSpeed: number = BASE_ANGULAR_SPEED
  private rotationCount: number = 0
  private lastAngleForCount: number = 0
  private groundY!: number

  // Input
  private spaceKey!: Phaser.Input.Keyboard.Key
  private rKey!: Phaser.Input.Keyboard.Key

  // Hint text
  private hintText!: Phaser.GameObjects.Text
  private hasThrown: boolean = false

  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    this.groundY = this.scale.height - GROUND_Y_OFFSET

    // Set background color
    this.cameras.main.setBackgroundColor(COLORS.sky)

    // Create ground
    const groundWidth = 20000
    this.matter.add.rectangle(
      groundWidth / 2,
      this.groundY + 10,
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
    groundGraphics.fillRect(-100, this.groundY, groundWidth + 100, 40)

    // Draw shepherd
    this.shepherdGraphics = this.add.graphics()
    this.drawShepherd(SHEPHERD_X, this.groundY)

    // Hand position
    this.handPosition = new Phaser.Math.Vector2(SHEPHERD_X, this.groundY - 50)

    // Stone position
    this.stonePosition = new Phaser.Math.Vector2(
      this.handPosition.x + SLING_RADIUS,
      this.handPosition.y
    )

    // Graphics
    this.slingGraphics = this.add.graphics()
    this.stoneGraphics = this.add.graphics()

    this.drawSlingAndStone()

    // Hint text
    this.hintText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 60,
      'Hold SPACE to swing, release to throw\nPress R to reset',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#2d2d2d',
        align: 'center',
      }
    )
    this.hintText.setOrigin(0.5)
    this.hintText.setScrollFactor(0) // Fixed to camera

    // Input
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    // Camera bounds
    this.cameras.main.setBounds(-100, 0, 20000, this.scale.height)
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000

    switch (this.gameState) {
      case 'idle':
        if (this.spaceKey.isDown) {
          this.startSwinging()
        }
        break

      case 'swinging':
        this.updateSwinging(dt)
        break

      case 'flying':
        this.updateFlying()
        break

      case 'resting':
        if (this.rKey.isDown) {
          this.resetGame()
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
    // Rotate stone
    this.slingAngle += this.angularSpeed * dt

    // Count rotations and increase speed
    if (this.slingAngle - this.lastAngleForCount >= Math.PI * 2) {
      this.rotationCount++
      this.lastAngleForCount = this.slingAngle
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
      this.launchStone()
    }
  }

  private launchStone(): void {
    // Calculate tangent velocity (perpendicular to radius)
    // Tangent direction: (-sin(angle), -cos(angle)) for counter-clockwise
    const tangentX = -Math.sin(this.slingAngle)
    const tangentY = -Math.cos(this.slingAngle)

    const speed = this.angularSpeed * SLING_RADIUS * (LAUNCH_VELOCITY_MULTIPLIER / SLING_RADIUS)

    // Create physics body for stone
    this.stoneBody = this.matter.add.circle(
      this.stonePosition.x,
      this.stonePosition.y,
      8,
      {
        restitution: 0.4,
        friction: 0.3,
        frictionAir: 0.001,
        label: 'stone',
      }
    )

    // Apply launch velocity
    this.matter.body.setVelocity(this.stoneBody, {
      x: tangentX * speed,
      y: tangentY * speed,
    })

    // Hide sling cord
    this.slingGraphics.clear()

    if (!this.hasThrown) {
      this.hasThrown = true
      this.tweens.add({
        targets: this.hintText,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
      })
    }

    this.gameState = 'flying'
  }

  private updateFlying(): void {
    if (!this.stoneBody) return

    // Update stone graphics to follow physics body
    this.stonePosition.x = this.stoneBody.position.x
    this.stonePosition.y = this.stoneBody.position.y
    this.drawStoneOnly()

    // Camera follows stone
    this.cameras.main.scrollX = this.stonePosition.x - 200

    // Check if stone has come to rest
    const velocity = this.stoneBody.velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)

    if (speed < 0.1 && this.stonePosition.y >= this.groundY - 10) {
      this.gameState = 'resting'
      console.log(`Stone landed at x: ${this.stonePosition.x.toFixed(0)}`)
    }
  }

  private resetGame(): void {
    // Remove physics body
    if (this.stoneBody) {
      this.matter.world.remove(this.stoneBody)
      this.stoneBody = null
    }

    // Reset stone position
    this.stonePosition.x = this.handPosition.x + SLING_RADIUS
    this.stonePosition.y = this.handPosition.y

    // Reset camera
    this.cameras.main.scrollX = 0

    // Redraw
    this.drawSlingAndStone()

    // Reset state
    this.gameState = 'idle'
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
