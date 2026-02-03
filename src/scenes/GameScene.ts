import Phaser from 'phaser'

// Color palette
const COLORS = {
  sky: 0x8899aa,
  ground: 0x4a4a4a,
  shepherd: 0x2d2d2d,
  stone: 0x666666,
  sling: 0x3d3d3d,
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  create(): void {
    // Set background color
    this.cameras.main.setBackgroundColor(COLORS.sky)

    // Create ground - extends far to the right
    const groundWidth = 20000
    const groundY = this.scale.height - 20

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

    // Draw ground line visually
    const graphics = this.add.graphics()
    graphics.fillStyle(COLORS.ground, 1)
    graphics.fillRect(-100, groundY, groundWidth + 100, 40)
  }
}
