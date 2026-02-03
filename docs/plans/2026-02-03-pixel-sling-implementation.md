# Pixel Shepherd Sling - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimalist browser physics game where players sling stones by holding SPACE to swing and releasing to throw.

**Architecture:** Single Phaser.js scene with Matter.js physics. State machine controls game flow (idle → swinging → flying → resting). Stone orbits shepherd during swing, launches tangentially on release.

**Tech Stack:** Vite, TypeScript, Phaser.js 3 with Matter.js physics

---

## Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`

**Step 1: Create Vite + TypeScript project**

Run:
```bash
cd /Users/devanmcgeer/devan.projects/pixel-sling
npm create vite@latest . -- --template vanilla-ts
```

Select: Overwrite existing files if prompted (only docs/ exists)

**Step 2: Install Phaser.js**

Run:
```bash
npm install phaser
```

**Step 3: Update `vite.config.ts` for Phaser compatibility**

Replace contents of `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
  },
})
```

**Step 4: Replace `index.html` with game container**

Replace contents of `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pixel Shepherd Sling</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: #1a1a2e;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        overflow: hidden;
      }
      #game-container canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <div id="game-container"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Step 5: Replace `src/main.ts` with Phaser bootstrap**

Replace contents of `src/main.ts`:

```typescript
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
      const ground = this.matter.add.rectangle(400, 430, 10000, 20, {
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
```

**Step 6: Delete unused Vite template files**

Run:
```bash
rm -f src/counter.ts src/style.css src/typescript.svg public/vite.svg
```

**Step 7: Run dev server and verify**

Run:
```bash
npm run dev
```

Expected: Browser opens, shows blue sky background, grey stone falls and bounces on ground line.

**Step 8: Commit**

Run:
```bash
git add -A
git commit -m "feat: initialize Vite + Phaser.js project

- Vite with TypeScript template
- Phaser.js 3 with Matter.js physics
- Basic game canvas with test physics"
```

---

## Task 2: Create GameScene Class

**Files:**
- Create: `src/scenes/GameScene.ts`
- Modify: `src/main.ts`

**Step 1: Create GameScene file**

Create `src/scenes/GameScene.ts`:

```typescript
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
```

**Step 2: Update main.ts to use GameScene**

Replace contents of `src/main.ts`:

```typescript
import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: 'game-container',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1 },
      debug: true,
    },
  },
  scene: [GameScene],
}

new Phaser.Game(config)
```

**Step 3: Run and verify**

Run:
```bash
npm run dev
```

Expected: Blue-grey sky, dark ground at bottom, physics debug lines visible.

**Step 4: Commit**

Run:
```bash
git add src/scenes/GameScene.ts src/main.ts
git commit -m "refactor: extract GameScene class

- Separate scene file for better organization
- Define color palette constants
- Create wide ground plane for throwing distance"
```

---

## Task 3: Add Shepherd Placeholder

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Add shepherd graphics to GameScene**

In `src/scenes/GameScene.ts`, add properties and update create():

```typescript
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
  private handPosition!: Phaser.Math.Vector2

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

    // Draw shepherd (stick figure)
    this.shepherdGraphics = this.add.graphics()
    this.drawShepherd(SHEPHERD_X, groundY)

    // Store hand position for sling attachment
    this.handPosition = new Phaser.Math.Vector2(SHEPHERD_X, groundY - 50)
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
```

**Step 2: Run and verify**

Run:
```bash
npm run dev
```

Expected: Stick figure shepherd on left side of screen, arm raised overhead.

**Step 3: Commit**

Run:
```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add shepherd stick figure

- Simple stick figure with raised arm for sling
- Positioned on left side of screen
- Hand position stored for sling attachment point"
```

---

## Task 4: Add Stone with Orbit Mechanic

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Add stone and rotation state**

Replace `src/scenes/GameScene.ts` entirely:

```typescript
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
```

**Step 2: Run and verify**

Run:
```bash
npm run dev
```

Expected:
- Hold SPACE: stone rotates around shepherd's hand, speeding up with each rotation
- Release SPACE: console logs rotation count and final speed
- Stone returns to idle position

**Step 3: Commit**

Run:
```bash
git add src/scenes/GameScene.ts
git commit -m "feat: implement sling rotation mechanic

- Stone orbits shepherd's hand when SPACE held
- Angular speed increases 20% per rotation
- Speed capped at 5x base speed
- State machine: idle <-> swinging"
```

---

## Task 5: Implement Stone Launch and Flight

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Add Matter.js stone body and launch logic**

Replace `src/scenes/GameScene.ts` entirely:

```typescript
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

    // Input
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

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
        // Wait for R key (implemented in next task)
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
```

**Step 2: Run and verify**

Run:
```bash
npm run dev
```

Expected:
- Hold SPACE to swing, release to launch
- Stone flies in arc based on release angle
- Camera follows stone
- Stone bounces and rolls on ground
- Console logs final position when stone stops

**Step 3: Commit**

Run:
```bash
git add src/scenes/GameScene.ts
git commit -m "feat: implement stone launch and flight physics

- Calculate tangent velocity on release
- Create Matter.js body for stone during flight
- Camera follows stone with smooth scrolling
- Detect when stone comes to rest
- State: swinging -> flying -> resting"
```

---

## Task 6: Implement Reset with R Key

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Add R key handler and reset logic**

In `src/scenes/GameScene.ts`, add the R key input and reset method.

Add to class properties:
```typescript
private rKey!: Phaser.Input.Keyboard.Key
```

Add in `create()` after the SPACE key:
```typescript
this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
```

Update the `resting` case in the `switch` statement in `update()`:
```typescript
case 'resting':
  if (this.rKey.isDown) {
    this.resetGame()
  }
  break
```

Add the `resetGame()` method:
```typescript
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
```

**Step 2: Run and verify**

Run:
```bash
npm run dev
```

Expected:
- Throw stone, watch it land
- Press R: camera snaps back to shepherd, stone resets
- Can throw again immediately

**Step 3: Commit**

Run:
```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add R key to reset game

- Press R when stone is resting to reset
- Removes physics body, resets stone position
- Camera returns to shepherd
- Ready for next throw"
```

---

## Task 7: Add Hint Text with Fade

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Add hint text that fades after first throw**

Add to class properties:
```typescript
private hintText!: Phaser.GameObjects.Text
private hasThrown: boolean = false
```

Add in `create()` before input setup:
```typescript
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
```

Update `launchStone()` to fade hint on first throw:
```typescript
// At the end of launchStone(), before setting gameState:
if (!this.hasThrown) {
  this.hasThrown = true
  this.tweens.add({
    targets: this.hintText,
    alpha: 0,
    duration: 1000,
    ease: 'Power2',
  })
}
```

**Step 2: Run and verify**

Run:
```bash
npm run dev
```

Expected:
- Hint text visible at bottom of screen
- After first throw, hint fades out over 1 second
- Hint stays hidden on subsequent throws

**Step 3: Commit**

Run:
```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add hint text with fade on first throw

- Shows controls hint at bottom of screen
- Fixed to camera (doesn't scroll)
- Fades out after first throw
- Minimal zen UI approach"
```

---

## Task 8: Disable Debug Mode and Polish

**Files:**
- Modify: `src/main.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Disable physics debug in main.ts**

In `src/main.ts`, change the physics config:
```typescript
physics: {
  default: 'matter',
  matter: {
    gravity: { x: 0, y: 1 },
    debug: false, // Changed from true
  },
},
```

**Step 2: Fine-tune physics values**

In `src/scenes/GameScene.ts`, update constants for better feel:

```typescript
// Game constants - tuned values
const SHEPHERD_X = 150
const GROUND_Y_OFFSET = 20
const SLING_RADIUS = 45
const BASE_ANGULAR_SPEED = 2.5
const SPEED_INCREASE_PER_ROTATION = 0.25
const LAUNCH_VELOCITY_MULTIPLIER = 180
```

**Step 3: Add small delay before allowing R key**

Update the `resting` case to add a brief pause:

Add to class properties:
```typescript
private restingTime: number = 0
```

Update the flying -> resting transition in `updateFlying()`:
```typescript
if (speed < 0.1 && this.stonePosition.y >= this.groundY - 10) {
  this.gameState = 'resting'
  this.restingTime = 0
}
```

Update the resting case:
```typescript
case 'resting':
  this.restingTime += delta
  if (this.restingTime > 500 && this.rKey.isDown) { // 500ms delay
    this.resetGame()
  }
  break
```

**Step 4: Run and verify**

Run:
```bash
npm run dev
```

Expected:
- No debug lines visible
- Physics feel tighter and more responsive
- Brief pause before R key works after landing

**Step 5: Commit**

Run:
```bash
git add src/main.ts src/scenes/GameScene.ts
git commit -m "polish: disable debug mode and tune physics

- Remove physics debug rendering
- Tune sling radius, speed, and launch multiplier
- Add 500ms delay before reset allowed
- Cleaner visual presentation"
```

---

## Task 9: Final Code Cleanup

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Consolidate all changes into clean final file**

Replace entire `src/scenes/GameScene.ts` with final version:

```typescript
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
```

**Step 2: Run final verification**

Run:
```bash
npm run dev
```

Expected:
- Complete game loop works: idle → swing → fly → rest → reset
- Smooth physics, good feel
- Hint fades after first throw
- No visual glitches

**Step 3: Commit**

Run:
```bash
git add src/scenes/GameScene.ts
git commit -m "refactor: clean up GameScene with organized methods

- Extract setup methods for clarity
- Consolidate all tuned values
- Clean, readable final implementation"
```

---

## Task 10: Build and Test Production

**Files:**
- None (build verification only)

**Step 1: Run production build**

Run:
```bash
cd /Users/devanmcgeer/devan.projects/pixel-sling
npm run build
```

Expected: Build completes without errors, outputs to `dist/` folder.

**Step 2: Preview production build**

Run:
```bash
npm run preview
```

Expected: Game runs identically to dev mode.

**Step 3: Final commit**

Run:
```bash
git add -A
git commit -m "chore: verify production build

Build tested and working."
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Initialize Vite + Phaser.js project |
| 2 | Extract GameScene class |
| 3 | Add shepherd stick figure |
| 4 | Implement sling rotation mechanic |
| 5 | Add stone launch and flight physics |
| 6 | Add R key reset |
| 7 | Add hint text with fade |
| 8 | Disable debug, polish physics |
| 9 | Final code cleanup |
| 10 | Production build verification |
