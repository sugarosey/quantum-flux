# Credits & Attribution

## Development

**Game Developer**: [Your Name]  
**Development Time**: 24 hours  
**Hackathon**: [Hackathon Name]  
**Date**: October 2025  

## Tools & Technologies

### Game Engine
- **Kaboom.js v3000** - MIT License
  - JavaScript game library by Replit
  - https://kaboomjs.com/
  - Used for: Core game engine, rendering, physics, input handling

### Development Stack
- **TypeScript** - Apache 2.0 License
  - Type-safe JavaScript superset
  - Used for: All game code and type definitions

- **Vite** - MIT License
  - Fast build tool and dev server
  - https://vitejs.dev/
  - Used for: Development server, hot reload, production builds

- **Node.js & npm** - MIT License
  - JavaScript runtime and package manager
  - Used for: Dependency management and build scripts

## AI Assistance

- **Cascade AI** (Windsurf IDE)
  - Code generation and scaffolding
  - Debugging and optimization
  - Documentation writing
  - Used throughout development for pair programming

## Assets

### Graphics
- **All visual assets**: Procedurally generated
  - No external sprites or images used
  - All shapes rendered using Kaboom.js primitives
  - Custom polygon rendering for soft-body physics

### Audio
- **No audio assets used**
  - Time constraints prevented audio implementation
  - Future versions will include procedural sound effects

### Fonts
- **Kaboom.js Default Font**
  - Built-in monospace font
  - Used for all text rendering

## Code Attribution

### Original Code (100%)
All game logic, physics systems, and visual effects were written during the hackathon period:

- **Soft-Body Physics System** (lines 38-88)
  - Custom spring-damped jiggle physics
  - JigglePoint and SoftBody classes
  
- **Time-Echo Recorder** (lines 858-890)
  - Input frame capture at 60fps
  - Temporal replay system

- **Game Scenes** (lines 495-1449)
  - Title, game, victory, defeat scenes
  - All UI and visual effects

- **Physics Elements** (lines 399-454)
  - Bounce pads, jelly platforms, elastic walls
  - Slime pools, wave platforms

### Third-Party Libraries
- **Kaboom.js**: Core game engine functions
  - `add()`, `pos()`, `color()`, `rect()`, `circle()`, etc.
  - Physics: `body()`, `area()`, collision detection
  - Input: `onKeyDown()`, `onKeyPress()`
  - Rendering: `drawPolygon()`, camera functions

## Inspiration

### Game Design
- **Braid** - Time manipulation mechanics
- **Celeste** - Tight platformer controls
- **Portal** - Puzzle-solving with clones
- **Super Meat Boy** - Challenging platformer design

### Visual Style
- **Tron** - Neon cyberpunk aesthetic
- **Synthwave** - Retro-futuristic color palette
- **Glitch Art** - Digital distortion effects

## Special Thanks

- **Replit Team** - For creating Kaboom.js
- **Hackathon Organizers** - For the opportunity
- **Open Source Community** - For amazing tools
- **Beta Testers** - [Add names if applicable]

## License

This project is licensed under the **MIT License**:

```
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Disclaimer

This game was created for educational and competition purposes. All mechanics and code are original implementations. No plagiarism or unauthorized copying was involved in the development process.

---

**Built with passion in 24 hours** 🚀
