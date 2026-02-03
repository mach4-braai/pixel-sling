# Pixel Shepherd Sling - Design Document

## Overview

A minimalist browser-based physics game inspired by Foddy's Cricket. The player
controls a shepherd slinging a stone - hold SPACE to swing and build momentum,
release to throw. The stone follows a ballistic arc, bounces and rolls across
a flat plain until it comes to rest. No score, no progression - pure zen.

## Core Concept

**Genre:** Physics-based skill game
**Platform:** Web browser (HTML5)
**Controls:** Single button (SPACE to swing/release, R to reset)
**Style:** Stark minimalist pixel art

### The Experience

1. Shepherd stands on the left side of the screen
2. Player holds SPACE - stone begins rotating overhead
3. Each rotation builds momentum (sling speeds up)
4. Player releases SPACE - stone launches tangentially
5. Stone arcs through the air, bounces and rolls to rest
6. Camera follows the stone, showing final position
7. Player presses R when ready to throw again

No numbers. No leaderboards. Just the meditative act of slinging stones.

## Technical Stack

- **Phaser.js 3** with Matter.js physics (built-in)
- **Vite** for development server and bundling
- **TypeScript** for type safety
- No additional dependencies

## Project Structure

```
pixel-sling/
├── src/
│   ├── main.ts           # Phaser game config, entry point
│   ├── scenes/
│   │   └── GameScene.ts  # Main (only) scene
│   ├── objects/
│   │   ├── Shepherd.ts   # Shepherd sprite and sling logic
│   │   └── Stone.ts      # Projectile with physics body
│   └── utils/
│       └── physics.ts    # Momentum calculations
├── public/
│   └── assets/           # Minimal pixel sprites
├── index.html
└── package.json
```

## Game States

| State | Description | Input |
|-------|-------------|-------|
| **Idle** | Shepherd ready, stone at rest | SPACE to start swing |
| **Swinging** | Stone rotating, momentum building | Release SPACE to throw |
| **Flying** | Stone in air/bouncing/rolling | None (wait for rest) |
| **Resting** | Stone stopped, camera on final position | R to reset |

## Physics Model

### Sling Rotation

- Stone orbits shepherd at fixed radius (~50 pixels)
- Initial rotation: ~1 rotation per 2 seconds
- Each full rotation increases angular velocity by ~20%
- Maximum speed capped after 5-6 rotations
- Visual feedback: sling cord stretches slightly with speed

### Release Mechanics

- Launch velocity = tangent to rotation circle at release point
- Launch angle determined by stone position at release moment
- Optimal release: stone moving upward at ~45 degrees

### Post-Release Physics

- **Gravity:** Standard downward acceleration
- **Bounce:** Restitution ~0.4 (loses 60% energy on ground contact)
- **Friction:** Rolling friction slows horizontal movement
- **Sleep:** Stone stops when velocity drops below threshold

## Visual Design

### Color Palette (5 colors)

| Element | Color |
|---------|-------|
| Background (sky) | Muted grey-blue |
| Ground | Dark brown-grey |
| Shepherd | Black/deep brown |
| Stone | Medium grey |
| Sling cord | Dark line |

### Shepherd

- Simple stick figure, ~32 pixels tall
- Arm raised overhead during swing
- Static pose (no walk animation needed)
- Positioned on left side, facing right

### Stone

- Small circle, ~8 pixels diameter
- No rotation sprite needed

### Ground

- Single horizontal line
- Extends infinitely rightward
- No terrain features - pure flat plane

### UI

- "SPACE to swing, R to reset" hint on first load
- Fades after first throw
- No other UI elements (zen experience)

## Camera Behavior

- Starts centered on shepherd (left side of view)
- Follows stone after release with smooth lerp
- Stays on final resting position until reset
- Snaps back to shepherd on R press

## Implementation Phases

### Phase 1: Foundation

- Initialize Vite + TypeScript + Phaser.js project
- Create GameScene with Matter.js physics
- Draw ground plane and shepherd placeholder
- Configure camera bounds

### Phase 2: Core Mechanic

- Implement stone rotation around shepherd's hand
- SPACE hold starts rotation, track rotation count
- Increase angular velocity per rotation
- Release calculates tangent velocity, applies to stone

### Phase 3: Physics Polish

- Add gravity and ground collision
- Tune restitution and friction values
- Implement stone sleep detection
- Smooth camera follow

### Phase 4: Controls and Reset

- R key resets stone to shepherd
- Camera returns to shepherd on reset
- Proper input state management

### Phase 5: Visual Polish

- Replace placeholders with pixel sprites
- Render sling cord line
- Add first-time hint text with fade
- Final physics tuning

## Reference

- Inspiration: [Foddy's Cricket](https://www.foddy.net/Cricket.html)
- Same philosophy: simple controls, physics-based challenge, pure skill expression
