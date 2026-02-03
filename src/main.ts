import Phaser from 'phaser'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game-container',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1 },
      debug: true,
    },
  },
  scene: {
    create: function (this: Phaser.Scene) {
      // Ground line
      this.matter.add.rectangle(400, 430, 10000, 20, {
        isStatic: true,
        friction: 0.8,
        restitution: 0.4,
      })

      // Test stone
      this.matter.add.circle(400, 200, 8, {
        restitution: 0.4,
        friction: 0.3,
      })
    },
  },
}

new Phaser.Game(config)
