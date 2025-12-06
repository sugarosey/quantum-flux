# Quantum - flux

A fast TypeScript + Vite + Kaboom.js prototype built for a 24hr hackathon. Core mechanic: record your actions for 5 seconds, then spawn a time-echo clone that replays them to help solve platforming puzzles (e.g., hold pressure plates to open doors).

## Run Locally (Windows)

- Prereq: Node.js 18+ and npm
- Install deps:

```bash
npm install
```

- Start dev server:

```bash
npm run dev
```

- Build production:

```bash
npm run build && npm run preview
```

The app will open on http://localhost:5173

## Features

### Core Gameplay
- **Time Echo Mechanic**: Record your actions for 5 seconds, then spawn a quantum echo clone that replays them
- **Soft-Body Physics**: Advanced jiggle physics system with spring dynamics
- **8 Challenging Levels**: Progressive difficulty with unique puzzle designs

### Enhanced Features
- **🎵 Procedural Audio**: Dynamic sound effects for jumps, bounces, deaths, and victories
- **⏱️ Time Tracking**: Track your completion time for each level with best time records
- **💾 Progress Saving**: Automatic save system using localStorage
- **🎮 Level Selection**: Visual level select menu with completion status and best times
- **⏸️ Pause Menu**: Full pause functionality with options and sound toggle
- **💡 Tutorial System**: Helpful tooltips for first-time players
- **✨ Particle Effects**: Dynamic particle trails and visual feedback
- **📊 Statistics**: Track total deaths and level completion across sessions

### Physics Elements
- **Bounce Pads**: Launch yourself with explosive force
- **Jelly Platforms**: Soft, wobbly platforms that cushion your landing
- **Elastic Walls**: Push you back with spring force
- **Slime Pools**: Slow your movement
- **Wave Platforms**: Moving platforms that oscillate
- **Spikes**: Deadly obstacles with jiggle animation

## Controls

### Movement
- Move: A/D or Left/Right
- Jump: W/Up or Space
- Sprint: Hold Shift (1.5x speed boost)

### Time Echo Mechanic
- Record: Q (5 seconds)
- Spawn Echo: E

### Game Controls
- Pause: ESC or P
- Reset Level: R
- Next Level: N (debug)
- Level Select: M (when paused) or L (from title)

### Pause Menu Options
- Resume: ESC or P
- Restart Level: R
- Level Select: M
- Toggle Sound: S

## Notes

- No external art/audio assets used; everything is programmatic.
- Engine: [Kaboom.js](https://kaboomjs.com/) (ESM)
- Tooling: Vite + TypeScript
- AI assistance: Code and content generated with Cascade (this AI), then iterated manually.

## Attribution

- Kaboom.js is MIT licensed by Replit/Kaboom contributors.
- This project is MIT licensed.

## License

MIT
#
