# Hackathon Submission - Quantum Flux

## Project Information

**Game Title**: Quantum Flux  
**Category**: Game Development - Free Choice  
**Team/Developer**: [Your Name/Team Name]  
**Development Time**: 24 hours  
**Engine**: Kaboom.js v3000 (JavaScript game library)  
**Framework**: Vite + TypeScript  

## Project Description

Quantum Flux is a 2D platformer featuring advanced soft-body jiggle physics and time-echo mechanics. Players navigate through 8 challenging levels by recording their movements and spawning quantum echoes that replay their actions.

### Key Innovation
The game combines real-time soft-body physics simulation with temporal mechanics, creating unique puzzle-solving opportunities where players must coordinate with past versions of themselves.

## Features Implemented

### ✅ Core Mechanics
- [x] Smooth platformer movement (WASD/Arrows)
- [x] Jump mechanics with ground detection
- [x] Time-echo recording system (5-second capture at 60fps)
- [x] Quantum echo spawning and replay
- [x] 8 complete levels with progressive difficulty

### ✅ Advanced Physics
- [x] Soft-body jiggle physics (spring-damped system)
- [x] Bounce pads with elastic force
- [x] Jelly platforms with compression
- [x] Elastic walls with push-back
- [x] Slime pools with movement slowdown
- [x] Wave platforms with sine motion
- [x] Spike hazards with wobble animation

### ✅ Visual Effects
- [x] Chromatic aberration overlay
- [x] CRT scanline effect
- [x] Dynamic vignette
- [x] Pulsing backgrounds
- [x] Particle systems (celebration, debris, glitch)
- [x] Custom soft-body polygon rendering

### ✅ UI/UX
- [x] Futuristic HUD with ability cards
- [x] Animated title screen with energy core
- [x] Victory scene with rainbow effects
- [x] Defeat scene with glitch aesthetics
- [x] Level difficulty indicators

### ✅ Game Flow
- [x] Title screen → Gameplay → Victory/Defeat
- [x] Level progression system
- [x] Restart and skip functionality
- [x] Multiple scene management

## Technical Stack

```json
{
  "Engine": "Kaboom.js v3000",
  "Language": "TypeScript",
  "Build Tool": "Vite v5.0",
  "Physics": "Custom soft-body spring system",
  "Rendering": "Canvas 2D with custom polygon drawing"
}
```

## Code Statistics

- **Total Lines**: 1,452
- **Main Game Logic**: ~800 lines
- **Physics System**: ~200 lines
- **UI/Scenes**: ~450 lines
- **Classes**: JigglePoint, SoftBody
- **Scenes**: title, game, victory, defeat

## Asset Attribution

### Code
- **Game Engine**: Kaboom.js (MIT License) - https://kaboomjs.com/
- **Development**: 100% original code written during hackathon
- **AI Assistance**: Cascade AI used for code generation and debugging

### Assets
- **Graphics**: All procedurally generated (no external sprites)
- **Audio**: None (time constraint)
- **Fonts**: Kaboom.js default font

## How to Run

### Prerequisites
```bash
Node.js 18+ and npm
```

### Installation
```bash
cd time-echo-platformer
npm install
```

### Development
```bash
npm run dev
# Opens at http://localhost:5173
```

### Production Build
```bash
npm run build
npm run preview
```

## Controls

| Action | Keys |
|--------|------|
| Move Left | A or Left Arrow |
| Move Right | D or Right Arrow |
| Jump | Space, W, or Up Arrow |
| Speed Boost | Hold Shift |
| Record Timeline | Q |
| Deploy Echo | E |
| Restart Phase | R |
| Skip Phase | N |
| Return to Menu | ESC |

## Gameplay Video Script (1 minute)

**0:00-0:10** - Title screen showcase with animated effects  
**0:10-0:20** - Basic movement and jumping demonstration  
**0:20-0:35** - Time-echo recording and deployment  
**0:35-0:45** - Physics elements showcase (bounce, jelly, elastic)  
**0:45-0:55** - Level completion and progression  
**0:55-1:00** - Victory screen and credits  

## Challenges Overcome

1. **Soft-Body Physics**: Implemented custom spring-damped system for realistic jiggle
2. **Input Recording**: Captured 60fps input frames with precise timing
3. **Performance**: Optimized polygon rendering for multiple soft bodies
4. **Visual Polish**: Added progressive intensity effects without frame drops

## Future Improvements

- Add sound effects and background music
- Implement speedrun timer and leaderboard
- Create level editor for community content
- Add mobile touch controls
- Expand to 15-20 levels

## Links

- **Repository**: [GitHub URL if applicable]
- **Live Demo**: [Deployment URL if applicable]
- **Video Demo**: [YouTube/Drive link]

## Credits

- **Development**: [Your Name]
- **AI Assistant**: Cascade (Windsurf IDE)
- **Game Engine**: Kaboom.js by Replit
- **Inspiration**: Braid, Celeste, Portal

---

**Built with ❤️ in 24 hours for [Hackathon Name]**
