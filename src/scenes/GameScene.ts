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

export class GameScene extends Phaser.Scene {
  private shepherdGraphics!: Phaser.GameObjects.Graphics
  private _handPosition!: Phaser.Math.Vector2

  constructor() {
    super({ key: 'GameScene' })
  }

  get handPosition(): Phaser.Math.Vector2 {
    return this._handPosition
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

    // Draw shepherd (stick figure)
    this.shepherdGraphics = this.add.graphics()
    this.drawShepherd(SHEPHERD_X, groundY)

    // Store hand position for sling attachment
    this._handPosition = new Phaser.Math.Vector2(SHEPHERD_X, groundY - 50)
  }

  private drawShepherd(x: number, groundY: number): void {
    const g = this.shepherdGraphics
    g.clear()
    g.lineStyle(3, COLORS.shepherd, 1)

    // Body proportions
    const headY = groundY - 55
    const shoulderY = groundY - 45
    const hipY = groundY - 25
    const footY = groundY

    // Head (circle)
    g.strokeCircle(x, headY, 6)

    // Body (line from neck to hip)
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

    // Left arm (down)
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x - 10, shoulderY + 15)
    g.strokePath()

    // Right arm (raised for sling)
    g.beginPath()
    g.moveTo(x, shoulderY)
    g.lineTo(x, shoulderY - 5)
    g.strokePath()
  }
}
