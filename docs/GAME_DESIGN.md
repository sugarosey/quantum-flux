# Quantum Flux - Game Design Document

## Overview
**Quantum Flux** is a 2D platformer featuring soft-body jiggle physics and time-echo mechanics. Players navigate through 8 progressively challenging levels using quantum clones of themselves.

## Core Concept
Record your movements for 5 seconds, then spawn a "quantum echo" that replays your actions. Use these echoes to solve puzzles, trigger mechanisms, and reach the exit.

## Unique Selling Points
1. **Soft-Body Jiggle Physics** - Characters are squishy blobs with spring-damped physics
2. **Time-Echo Mechanic** - Clone yourself to solve temporal puzzles
3. **Dynamic Physics Elements** - Bounce pads, jelly platforms, elastic walls, slime pools, wave platforms
4. **Progressive Intensity** - Visual effects intensify with difficulty

## Game Mechanics

### Movement
- **Walk**: WASD or Arrow Keys
- **Jump**: Space, W, or Up Arrow
- **Boost**: Hold Shift for 1.5x speed

### Time-Echo System
- **Record (Q)**: Capture 5 seconds of input at 60fps
- **Deploy (E)**: Spawn quantum echo that replays recording
- **Unlimited Echoes**: Spawn multiple clones simultaneously

### Physics Elements

| Element | Symbol | Effect |
|---------|--------|--------|
| Bounce Pad | B | Launch with 800 force |
| Jelly Platform | J | Wobbly, compresses on landing |
| Elastic Wall | E | Pushes player away |
| Slime Pool | S | Reduces speed by 50% |
| Wave Platform | W | Moves in sine wave pattern |
| Spike | ^ | Instant death |
| Exit | > | Level complete |

## Level Progression

### Phase 1: Tutorial
- Introduces basic movement and physics
- Simple bounce pad and jelly platform

### Phase 2-3: Elastic Maze
- Elastic walls create navigation challenges
- Multiple physics elements combined

### Phase 4-6: Platform Jumper
- Precision jumping required
- Complex timing with wave platforms

### Phase 7-8: Final Challenge
- All physics elements combined
- Maximum difficulty and intensity

## Visual Design

### Color Palette
- **Player**: Pink/Magenta (255, 120, 200)
- **Ghost**: Cyan/Green (120, 255, 200)
- **Bounce Pads**: Orange (255, 200, 50)
- **Jelly Platforms**: Purple (180, 100, 255)
- **Elastic Walls**: Cyan (100, 255, 255)
- **Slime Pools**: Light Green (150, 255, 150)
- **Wave Platforms**: Blue (100, 200, 255)

### Effects
- Chromatic aberration (intensity > 30%)
- Scanlines (intensity > 50%)
- Vignette (dynamic opacity)
- Pulsing background
- Particle systems

## Technical Implementation

### Jiggle Physics
```typescript
- Spring stiffness: 0.15
- Damping: 0.88
- Amplitude: 8 pixels
- 12-point soft body mesh
- 60fps update rate
```

### Performance
- Target: 60 FPS
- Resolution: 1280x720
- Letterbox scaling for all screens

## Win/Lose Conditions

### Victory
- Complete all 8 phases
- Rainbow celebration scene
- Stats display

### Defeat
- Hit spike hazard
- Glitch effect scene
- Restart or return to menu

## Future Enhancements
- Sound effects and music
- More levels (10-15 total)
- Leaderboard/speedrun timer
- Level editor
- Mobile touch controls
