import kaboom, { GameObj, Vec2, KaboomCtx } from "kaboom";

// Init Kaboom
const k = kaboom({
  global: false,
  touchToMouse: true,
  canvas: undefined,
  root: document.getElementById("game") as HTMLElement,
  background: [15, 10, 25],
  width: 1280,
  height: 720,
  letterbox: true,
});

// Destructure all Kaboom functions we need
const {
  add, pos, vec2, color, rgb, rect, circle, polygon, area, body, anchor, outline, opacity, z, scale,
  text, fixed, lifespan, rotate, scene, go, onKeyDown, onKeyPress, onKeyRelease, onUpdate, onCollide,
  onCollideEnd, get, destroy, setGravity, camPos, camScale, time, dt, loop, shake, rand, width, height,
  drawPolygon, isKeyDown, isKeyPressed, mousePos
} = k;

// Constants
const GRAVITY = 980;
const MOVE_SPEED = 240;
const JUMP_FORCE = 650;
const GHOST_COLOR = [100, 220, 255];

// Game State
let gameState = {
  levelTimes: new Array(8).fill(0),
  levelCompleted: new Array(8).fill(false),
  totalDeaths: 0,
  bestTimes: new Array(8).fill(Infinity),
  soundEnabled: true,
};

// Load saved progress
function loadProgress() {
  try {
    const saved = localStorage.getItem('quantumFluxProgress');
    if (saved) {
      const data = JSON.parse(saved);
      gameState = { ...gameState, ...data };
      // Ensure bestTimes array is properly initialized
      if (!gameState.bestTimes || !Array.isArray(gameState.bestTimes)) {
        gameState.bestTimes = new Array(8).fill(Infinity);
      }
      // Replace any null values with Infinity
      gameState.bestTimes = gameState.bestTimes.map(t => (t == null || typeof t !== 'number') ? Infinity : t);
    }
  } catch (e) {
    console.log('No saved progress found', e);
  }
}

// Save progress
function saveProgress() {
  try {
    localStorage.setItem('quantumFluxProgress', JSON.stringify(gameState));
  } catch (e) {
    console.log('Failed to save progress');
  }
}

// Procedural Audio System
class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  constructor() {
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      this.audioContext = new (AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;
    }
  }
  
  playJump() {
    if (!gameState.soundEnabled || !this.audioContext || !this.masterGain) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }
  
  playBounce() {
    if (!gameState.soundEnabled || !this.audioContext || !this.masterGain) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }
  
  playDeath() {
    if (!gameState.soundEnabled || !this.audioContext || !this.masterGain) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }
  
  playSuccess() {
    if (!gameState.soundEnabled || !this.audioContext || !this.masterGain) return;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, this.audioContext!.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + i * 0.1 + 0.3);
      osc.start(this.audioContext!.currentTime + i * 0.1);
      osc.stop(this.audioContext!.currentTime + i * 0.1 + 0.3);
    });
  }
  
  playRecord() {
    if (!gameState.soundEnabled || !this.audioContext || !this.masterGain) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }
}

const audioEngine = new AudioEngine();

// Reset corrupted save data
function resetProgress() {
  try {
    localStorage.removeItem('quantumFluxProgress');
    gameState = {
      levelTimes: new Array(8).fill(0),
      levelCompleted: new Array(8).fill(false),
      totalDeaths: 0,
      bestTimes: new Array(8).fill(Infinity),
      soundEnabled: true,
    };
    console.log('Progress reset successfully');
  } catch (e) {
    console.log('Failed to reset progress', e);
  }
}

// Try to load progress, reset if corrupted
try {
  loadProgress();
} catch (e) {
  console.log('Corrupted save data detected, resetting...', e);
  resetProgress();
}

// Jiggle Physics Constants
const SPRING_STIFFNESS = 0.15;
const SPRING_DAMPING = 0.88;
const JIGGLE_AMPLITUDE = 8;
const BOUNCE_ELASTICITY = 0.75;

setGravity(GRAVITY);

// Jiggle Physics System
class JigglePoint {
  pos: Vec2;
  vel: Vec2;
  target: Vec2;
  
  constructor(x: number, y: number) {
    this.pos = vec2(x, y);
    this.vel = vec2(0, 0);
    this.target = vec2(x, y);
  }
  
  update(dt: number, basePos: Vec2, offset: Vec2) {
    this.target = basePos.add(offset);
    const force = this.target.sub(this.pos).scale(SPRING_STIFFNESS);
    this.vel = this.vel.add(force).scale(SPRING_DAMPING);
    this.pos = this.pos.add(this.vel.scale(dt * 60));
  }
}

class SoftBody {
  points: JigglePoint[] = [];
  center: Vec2;
  
  constructor(centerX: number, centerY: number, numPoints: number, radius: number) {
    this.center = vec2(centerX, centerY);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      this.points.push(new JigglePoint(x, y));
    }
  }
  
  update(dt: number, basePos: Vec2, velocity: Vec2) {
    this.center = basePos;
    const velocityInfluence = velocity.scale(0.02);
    
    this.points.forEach((point, i) => {
      const angle = (i / this.points.length) * Math.PI * 2;
      const baseOffset = vec2(
        Math.cos(angle) * JIGGLE_AMPLITUDE,
        Math.sin(angle) * JIGGLE_AMPLITUDE
      );
      point.update(dt, basePos, baseOffset.add(velocityInfluence));
    });
  }
  
  getVertices(): Vec2[] {
    return this.points.map(p => p.pos);
  }
}

// UI helpers
function hud() {
  // Top bar background
  add([
    rect(width(), 80),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0.7),
    fixed(),
    z(999),
  ]);
  
  // Game title - left side
  add([
    text("QUANTUM FLUX", { size: 24 }),
    pos(20, 15),
    color(0, 255, 255),
    fixed(),
    z(1000),
  ]);
  
  // Abilities section - center
  const centerX = width() / 2;
  
  // Ability background panels
  add([
    rect(500, 50),
    pos(centerX - 250, 15),
    color(20, 20, 40),
    opacity(0.8),
    anchor("topleft"),
    fixed(),
    z(999),
  ]);
  
  // Movement ability
  add([
    rect(110, 40),
    pos(centerX - 240, 20),
    color(0, 100, 200),
    opacity(0.6),
    anchor("topleft"),
    fixed(),
    z(1000),
  ]);
  add([
    text("MOVE", { size: 12 }),
    pos(centerX - 185, 28),
    anchor("center"),
    color(255, 255, 255),
    fixed(),
    z(1001),
  ]);
  add([
    text("WASD", { size: 10 }),
    pos(centerX - 185, 45),
    anchor("center"),
    color(150, 200, 255),
    fixed(),
    z(1001),
  ]);
  
  // Jump ability
  add([
    rect(110, 40),
    pos(centerX - 120, 20),
    color(0, 200, 100),
    opacity(0.6),
    anchor("topleft"),
    fixed(),
    z(1000),
  ]);
  add([
    text("JUMP", { size: 12 }),
    pos(centerX - 65, 28),
    anchor("center"),
    color(255, 255, 255),
    fixed(),
    z(1001),
  ]);
  add([
    text("SPACE", { size: 10 }),
    pos(centerX - 65, 45),
    anchor("center"),
    color(150, 255, 200),
    fixed(),
    z(1001),
  ]);
  
  // Record ability
  add([
    rect(110, 40),
    pos(centerX + 10, 20),
    color(200, 0, 200),
    opacity(0.6),
    anchor("topleft"),
    fixed(),
    z(1000),
  ]);
  add([
    text("RECORD", { size: 12 }),
    pos(centerX + 65, 28),
    anchor("center"),
    color(255, 255, 255),
    fixed(),
    z(1001),
  ]);
  add([
    text("Q", { size: 10 }),
    pos(centerX + 65, 45),
    anchor("center"),
    color(255, 150, 255),
    fixed(),
    z(1001),
  ]);
  
  // Deploy Echo ability
  add([
    rect(110, 40),
    pos(centerX + 130, 20),
    color(100, 200, 200),
    opacity(0.6),
    anchor("topleft"),
    fixed(),
    z(1000),
  ]);
  add([
    text("DEPLOY", { size: 12 }),
    pos(centerX + 185, 28),
    anchor("center"),
    color(255, 255, 255),
    fixed(),
    z(1001),
  ]);
  add([
    text("E", { size: 10 }),
    pos(centerX + 185, 45),
    anchor("center"),
    color(150, 255, 255),
    fixed(),
    z(1001),
  ]);
  
  // Quick actions - right side
  add([
    text("R: RESTART | N: SKIP", { size: 12 }),
    pos(width() - 20, 35),
    anchor("right"),
    color(255, 200, 100),
    opacity(0.9),
    fixed(),
    z(1000),
  ]);
}

// Level definitions (tilemaps)
// Legend: 
// = ground, # wall, ^ spike, > exit, @ player spawn
// B bounce pad, J jelly platform, E elastic wall, S slime pool, W wave platform
const LEVELS: string[][] = [
  // Level 1 - Tutorial
  [
    "================================",
    "=..............................=",
    "=.........JJJJ.................=",
    "=......^.......................=",
    "=.........................>....=",
    "=.....B.......====.............=",
    "=..@......==...................=",
    "=SSSS#####==##################=",
    "================================",
  ],
  // Level 2 - Elastic Maze
  [
    "================================",
    "=..............................=",
    "=.........JJJJ.................=",
    "=..@.....E..^E..............>..=",
    "=........E...E.................=",
    "=....B...E...E.....B...........=",
    "=........E.......==............=",
    "=SSSS####==###WWWW############=",
    "================================",
  ],
  // Level 3 - Bounce Challenge
  [
    "================================",
    "=.........JJJJ.................=",
    "=..@.....EEEE............>.....=",
    "=........E..E..................=",
    "=....B...E..E..^...B...........=",
    "=.......==..==.....E...........=",
    "=..............==..E...........=",
    "=SSSS####==###WWWW############=",
    "================================",
  ],
  // Level 4 - Platform Jumper
  [
    "================================",
    "=..............................=",
    "=..@..===..B..===..B..===......=",
    "=..............................=",
    "=JJJJ.===.EEEE.===.WWWW.===....=",
    "=.....^........^.......^.......=",
    "=.....===..B..===..B..===....>.=",
    "=SSSS....SSSS....SSSS....SSSS..=",
    "================================",
  ],
  // Level 5 - Wave Rider
  [
    "================================",
    "=..............................=",
    "=..............................=",
    "=WWWW...WWWW...WWWW...WWWW.....=",
    "=.....E.....E.....E.....E......=",
    "=JJJJ.E.JJJJ.E.JJJJ.E.JJJJ.....=",
    "=..@..^.........^..........>...=",
    "=====###SSSS###SSSS###SSSS#####=",
    "================================",
  ],
  // Level 6 - Bounce Master
  [
    "================================",
    "=..@.SSSS...SSSS...SSSS........=",
    "=....EEEE...EEEE...EEEE........=",
    "=B.......B.......B.......B.....=",
    "====.JJJJ.==JJJJ.==JJJJ.==.....=",
    "=....^.......^.......^.........=",
    "=WWWW.EEEE.WWWW.EEEE.WWWW.....>=",
    "=SSSS....SSSS....SSSS....SSSS..=",
    "================================",
  ],
  // Level 7 - Vertical Ascent
  [
    "================================",
    "=..........................>...=",
    "=.................====.JJJJ....=",
    "=..............B...............=",
    "=...........====.EEEE..........=",
    "=........B.....................=",
    "=.....====.WWWW................=",
    "=..@...........................=",
    "================================",
  ],
  // Level 8 - Final Challenge
  [
    "================================",
    "=..............................=",
    "=EEEE.JJJJ.WWWW.SSSS.EEEE.JJJJ.=",
    "=..@..B.........B.........B..>.=",
    "=WWWW.EEEE.JJJJ.WWWW.EEEE.SSSS.=",
    "=.....^.........^.........^....=",
    "=JJJJ.SSSS.EEEE.JJJJ.WWWW.EEEE.=",
    "=.....B.........B.........B....=",
    "================================",
  ],
];

// Components
function playerComp() {
  const softBody = new SoftBody(0, 0, 12, 14);
  return [
    circle(14),
    color(255, 120, 200),
    area({ collisionIgnore: ["ghost", "jellyClone"] }),
    anchor("center"),
    body({ jumpForce: JUMP_FORCE }),
    outline(3, rgb(255, 80, 150)),
    z(10),
    { 
      speed: MOVE_SPEED, 
      canControl: true, 
      softBody,
      lastVel: vec2(0, 0),
      bounceBoost: 1.0
    },
    "player",
  ];
}

function ghostComp() {
  const softBody = new SoftBody(0, 0, 12, 14);
  return [
    circle(14),
    color(120, 255, 200),
    opacity(0.7),
    area({ collisionIgnore: ["player", "ghost", "jellyClone"] }),
    anchor("center"),
    body({ jumpForce: JUMP_FORCE }),
    outline(2, rgb(80, 200, 150)),
    z(5),
    { softBody, lastVel: vec2(0, 0) },
    "ghost",
    "jellyClone",
  ];
}

function spikeComp() {
  return [
    polygon([vec2(0, -12), vec2(-10, 8), vec2(10, 8)]),
    color(255, 60, 100),
    area(),
    anchor("center"),
    outline(2, rgb(200, 30, 60)),
    { jigglePhase: rand(0, Math.PI * 2) },
    "spike",
  ];
}

function tileStyles(): Record<string, () => any[]> {
  return {
    "=": () => [rect(32, 32), area(), body({ isStatic: true }), color(90, 110, 130)],
    "#": () => [rect(32, 32), area(), body({ isStatic: true }), color(70, 80, 100)],
    ">": () => [rect(28, 28), area(), color(100, 240, 140), outline(2, rgb(20, 60, 30)), anchor("center"), { isExit: true }, "exit"],
    "@": () => [rect(1,1), area(), { spawn: true }],
    ".": () => [],
    // Jiggle Physics Elements
    "B": () => [
      circle(14), 
      area(), 
      color(255, 200, 50), 
      outline(3, rgb(255, 150, 0)),
      anchor("center"),
      { bouncePad: true, bouncePhase: 0, bounceForce: 800 },
      "bouncePad"
    ],
    "J": () => [
      rect(32, 12), 
      area(), 
      color(180, 100, 255), 
      outline(2, rgb(140, 60, 200)),
      anchor("center"),
      { jellyPlatform: true, jiggleOffset: 0, jiggleSpeed: rand(2, 4) },
      "jellyPlatform"
    ],
    "E": () => [
      rect(8, 32), 
      area(), 
      body({ isStatic: true }),
      color(100, 255, 255), 
      outline(2, rgb(50, 200, 200)),
      anchor("center"),
      { elasticWall: true, pushForce: 400 },
      "elasticWall"
    ],
    "S": () => [
      rect(32, 16), 
      area(), 
      color(150, 255, 150), 
      opacity(0.6),
      anchor("center"),
      { slimePool: true, slowFactor: 0.5, wavePhase: rand(0, Math.PI * 2) },
      "slimePool"
    ],
    "W": () => [
      rect(32, 8), 
      area(), 
      color(100, 200, 255), 
      outline(2, rgb(50, 150, 200)),
      anchor("center"),
      { wavePlatform: true, wavePhase: rand(0, Math.PI * 2), waveAmplitude: 20 },
      "wavePlatform"
    ],
  };
}


// Input record structure
type InputFrame = { t: number; left: boolean; right: boolean; jump: boolean };

// Build level
function buildLevel(i: number) {
  const lines = LEVELS[i];
  const TILE = 32;
  const map = add([pos(0, 0)]);
  let spawn = vec2(48, 48);

  const styles = tileStyles();

  lines.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const p = vec2(x * TILE + TILE / 2, y * TILE + TILE / 2);
      if (ch === '^') {
        const s = add([
          ...spikeComp(),
          pos(p.x, p.y + 8),
          scale(1),
        ]);
      } else if (styles[ch]) {
        const comps = styles[ch]!();
        const o = add([pos(p), ...comps]);
        if ((o as any).spawn) {
          spawn = vec2(p.x, p.y - 20);
          destroy(o);
        }
      }
    });
  });

  return { spawn };
}

// Scene management
let currentLevel = 0;
let levelStartTime = 0;
let isPaused = false;

scene("game", (i: number) => {
  setGravity(GRAVITY);
  isPaused = false;
  levelStartTime = time();
  const { spawn } = buildLevel(i);

  const player = add([pos(spawn), ...playerComp()]) as GameObj & { canControl: boolean; softBody: SoftBody; lastVel: Vec2; bounceBoost: number };
  const recorder = createRecorder(player);

  camScale(vec2(1, 1));
  hud();
  
  // Intensity increases with level
  const intensity = Math.min(i / LEVELS.length, 1);
  
  // Pulsing background overlay for intensity
  const bgOverlay = add([
    rect(width() * 2, height() * 2),
    pos(-width() / 2, -height() / 2),
    color(100, 0, 150),
    opacity(0.1 + intensity * 0.15),
    z(-50),
    fixed(),
    { pulsePhase: 0 },
  ]);
  
  bgOverlay.onUpdate(() => {
    const bg = bgOverlay as any;
    bg.pulsePhase += dt() * (2 + intensity * 3);
    (bgOverlay as any).opacity = (0.1 + intensity * 0.15) + Math.sin(bg.pulsePhase) * (0.05 + intensity * 0.1);
  });
  
  // Chromatic aberration simulation - colored edge overlays
  if (intensity > 0.3) {
    const redShift = add([
      rect(width() * 2, height() * 2),
      pos(-width() / 2, -height() / 2),
      color(255, 0, 0),
      opacity(0.03 + intensity * 0.05),
      z(900),
      fixed(),
      { shiftPhase: 0 },
    ]);
    
    redShift.onUpdate(() => {
      const r = redShift as any;
      r.shiftPhase += dt() * 4;
      (redShift as any).opacity = (0.03 + intensity * 0.05) + Math.sin(r.shiftPhase) * 0.02;
    });
    
    const blueShift = add([
      rect(width() * 2, height() * 2),
      pos(-width() / 2, -height() / 2),
      color(0, 100, 255),
      opacity(0.03 + intensity * 0.05),
      z(900),
      fixed(),
      { shiftPhase: Math.PI },
    ]);
    
    blueShift.onUpdate(() => {
      const b = blueShift as any;
      b.shiftPhase += dt() * 4;
      (blueShift as any).opacity = (0.03 + intensity * 0.05) + Math.sin(b.shiftPhase) * 0.02;
    });
  }
  
  // Scanline effect for harder levels
  if (intensity > 0.5) {
    for (let y = 0; y < 30; y++) {
      add([
        rect(width() * 2, 2),
        pos(-width() / 2, y * 24),
        color(0, 255, 255),
        opacity(0.02 + intensity * 0.03),
        z(950),
        fixed(),
      ]);
    }
  }
  
  // Vignette effect
  const vignette = add([
    circle(width() * 0.8),
    pos(width() / 2, height() / 2),
    color(0, 0, 0),
    opacity(0.3 + intensity * 0.2),
    z(980),
    fixed(),
    anchor("center"),
  ]);
  
  // Level difficulty indicator
  add([
    text(`PHASE ${i + 1}/${LEVELS.length} | INTENSITY: ${Math.floor(intensity * 100)}%`, { size: 14 }),
    pos(width() - 12, 12),
    anchor("topright"),
    color(255, intensity * 255, (1 - intensity) * 255),
    opacity(0.8),
    fixed(),
    z(1001),
  ]);
  
  // Timer display - using a simple approach with periodic updates
  let timerText = add([
    text("TIME: 0.0s", { size: 14 }),
    pos(width() / 2, 12),
    anchor("top"),
    color(255, 255, 100),
    opacity(0.9),
    fixed(),
    z(1001),
  ]);
  
  // Update timer periodically
  let lastTimerUpdate = 0;
  onUpdate(() => {
    if (!isPaused) {
      const currentTime = time();
      if (currentTime != null && levelStartTime != null) {
        const elapsed = currentTime - levelStartTime;
        // Update every 0.1 seconds to avoid too many updates
        if (elapsed - lastTimerUpdate > 0.1) {
          lastTimerUpdate = elapsed;
          if (timerText && timerText.exists && timerText.exists()) {
            destroy(timerText);
            timerText = add([
              text(`TIME: ${elapsed.toFixed(1)}s`, { size: 14 }),
              pos(width() / 2, 12),
              anchor("top"),
              color(255, 255, 100),
              opacity(0.9),
              fixed(),
              z(1001),
            ]);
          }
        }
      }
    }
  });
  
  // Best time display
  if (gameState.bestTimes[i] != null && gameState.bestTimes[i] !== Infinity && typeof gameState.bestTimes[i] === 'number') {
    add([
      text(`BEST: ${gameState.bestTimes[i].toFixed(1)}s`, { size: 12 }),
      pos(width() / 2, 30),
      anchor("top"),
      color(100, 255, 100),
      opacity(0.8),
      fixed(),
      z(1001),
    ]);
  }
  
  // Tutorial tooltips for level 1
  if (i === 0 && !gameState.levelCompleted[0]) {
    add([
      text("💡 Use WASD to move and SPACE to jump", { size: 12 }),
      pos(width() / 2, height() - 120),
      anchor("center"),
      color(255, 255, 100),
      opacity(0.9),
      fixed(),
      z(1001),
      lifespan(8),
    ]);
    
    add([
      text("💡 Press Q to record your actions, then E to spawn an echo", { size: 12 }),
      pos(width() / 2, height() - 100),
      anchor("center"),
      color(255, 255, 100),
      opacity(0.9),
      fixed(),
      z(1001),
      lifespan(8),
    ]);
  }

  // Movement controls
  onKeyDown("left", () => { if (player.canControl) player.move(-MOVE_SPEED * player.bounceBoost, 0); });
  onKeyDown("a", () => { if (player.canControl) player.move(-MOVE_SPEED * player.bounceBoost, 0); });
  onKeyDown("right", () => { if (player.canControl) player.move(MOVE_SPEED * player.bounceBoost, 0); });
  onKeyDown("d", () => { if (player.canControl) player.move(MOVE_SPEED * player.bounceBoost, 0); });
  onKeyPress("up", () => { if (player.canControl && (player as any).isGrounded?.()) { player.jump(); audioEngine.playJump(); } });
  onKeyPress("w", () => { if (player.canControl && (player as any).isGrounded?.()) { player.jump(); audioEngine.playJump(); } });
  onKeyPress("space", () => { if (player.canControl && (player as any).isGrounded?.()) { player.jump(); audioEngine.playJump(); } });
  
  // Bounce boost mechanic
  onKeyDown("shift", () => { player.bounceBoost = 1.5; });
  onKeyRelease("shift", () => { player.bounceBoost = 1.0; });

  // Jiggle Physics Interactions
  
  // Bounce Pads
  player.onCollide("bouncePad", (pad: GameObj) => {
    const bounceForce = (pad as any).bounceForce || 800;
    player.jump(bounceForce);
    (pad as any).bouncePhase = Math.PI;
    shake(4);
    audioEngine.playBounce();
    spawnJiggleParticles(player.pos, rgb(255, 200, 50), 15);
  });

  // Jelly Platforms - soft landing
  player.onCollide("jellyPlatform", (plat: GameObj) => {
    const pVel = (player as any).vel || vec2(0, 0);
    if (pVel.y > 0) {
      (plat as any).jiggleOffset = 8;
    }
  });

  // Elastic Walls - push back
  player.onCollide("elasticWall", (wall: GameObj) => {
    const pushDir = player.pos.sub(wall.pos).unit();
    const pushForce = (wall as any).pushForce || 400;
    player.move(pushDir.scale(pushForce * dt()));
    shake(2);
  });

  // Slime Pools - slow movement
  let inSlime = false;
  player.onCollide("slimePool", () => { inSlime = true; });
  player.onCollideEnd("slimePool", () => { inSlime = false; });

  // Wave Platforms - moving platforms
  const wavePlatforms = get("wavePlatform");
  
  player.onCollide("spike", () => {
    audioEngine.playDeath();
    gameState.totalDeaths++;
    saveProgress();
    if (player && player.pos) {
      spawnJiggleParticles(player.pos, rgb(255, 60, 100), 25);
    }
    const levelNum = (typeof i === 'number') ? i : 0;
    go("defeat", levelNum);
  });
  player.onCollide("exit", () => {
    const levelTime = time() - levelStartTime;
    gameState.levelCompleted[i] = true;
    if (levelTime < gameState.bestTimes[i]) {
      gameState.bestTimes[i] = levelTime;
    }
    saveProgress();
    audioEngine.playSuccess();
    spawnJiggleParticles(player.pos, rgb(100, 240, 140), 30);
    nextLevel();
  });

  // Controls for echo mechanic
  onKeyPress("q", () => { recorder.start(5); audioEngine.playRecord(); });
  onKeyPress("e", () => spawnGhostFrom(recorder));
  onKeyPress("r", () => restart());
  onKeyPress("n", () => nextLevel());
  onKeyPress("escape", () => togglePause());
  onKeyPress("p", () => togglePause());
  
  // Pause menu
  let pauseMenu: GameObj | null = null;
  function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
      // Create pause overlay
      pauseMenu = add([
        rect(width(), height()),
        pos(0, 0),
        color(0, 0, 0),
        opacity(0.8),
        fixed(),
        z(2000),
      ]);
      
      add([
        text("⏸ PAUSED", { size: 64 }),
        pos(width() / 2, height() / 2 - 100),
        anchor("center"),
        color(0, 255, 255),
        fixed(),
        z(2001),
        "pauseUI",
      ]);
      
      add([
        text("ESC/P: RESUME", { size: 20 }),
        pos(width() / 2, height() / 2),
        anchor("center"),
        color(255, 255, 255),
        fixed(),
        z(2001),
        "pauseUI",
      ]);
      
      add([
        text("R: RESTART LEVEL", { size: 20 }),
        pos(width() / 2, height() / 2 + 40),
        anchor("center"),
        color(255, 255, 255),
        fixed(),
        z(2001),
        "pauseUI",
      ]);
      
      add([
        text("M: LEVEL SELECT", { size: 20 }),
        pos(width() / 2, height() / 2 + 80),
        anchor("center"),
        color(255, 255, 255),
        fixed(),
        z(2001),
        "pauseUI",
      ]);
      
      add([
        text("S: TOGGLE SOUND", { size: 20 }),
        pos(width() / 2, height() / 2 + 120),
        anchor("center"),
        color(gameState.soundEnabled ? rgb(100, 255, 100) : rgb(255, 100, 100)),
        fixed(),
        z(2001),
        "pauseUI",
      ]);
    } else {
      // Remove pause UI
      if (pauseMenu) destroy(pauseMenu);
      get("pauseUI").forEach(obj => destroy(obj));
    }
  }
  
  onKeyPress("m", () => {
    if (isPaused) {
      go("levelSelect");
    }
  });
  
  onKeyPress("s", () => {
    if (isPaused) {
      gameState.soundEnabled = !gameState.soundEnabled;
      saveProgress();
      togglePause();
      togglePause();
    }
  });

  // Jiggle Physics Update Loop
  player.onUpdate(() => {
    if (isPaused) return;
    
    const dt = 1/60;
    const vel = (player as any).vel || vec2(0, 0);
    
    // Apply slime slowdown
    if (inSlime && (player as any).vel) {
      (player as any).vel = vel.scale(0.7);
    }
    
    // Update soft body jiggle
    player.softBody.update(dt, player.pos, vel);
    player.lastVel = vel;
    
    // Camera follow
    camPos(player.pos);
    
    // Update timer is handled by timerDisplay's own onUpdate below
    
    // Particle trail effect
    if (Math.random() < 0.3 && vel.len() > 100) {
      add([
        circle(rand(2, 4)),
        pos(player.pos.add(vec2(rand(-8, 8), rand(-8, 8)))),
        color(255, 120, 200),
        opacity(0.6),
        z(3),
        lifespan(0.3),
        { vel: vel.scale(-0.1) },
      ]);
    }
  });

  // Render jiggle physics soft body
  player.onDraw(() => {
    const vertices = player.softBody.getVertices();
    if (vertices.length < 3) return;
    
    drawPolygon({
      pts: vertices,
      pos: vec2(0, 0),
      color: rgb(255, 120, 200),
      fill: true,
    });
    
    drawPolygon({
      pts: vertices,
      pos: vec2(0, 0),
      color: rgb(255, 80, 150),
      fill: false,
    });
  });

  // Animate jiggle physics elements
  onUpdate(() => {
    if (isPaused) return;
    const t = time();
    
    // Animate bounce pads
    get("bouncePad").forEach((pad: GameObj) => {
      const phase = (pad as any).bouncePhase || 0;
      (pad as any).bouncePhase = Math.max(0, phase - dt() * 8);
      const scale = 1 + Math.sin(phase) * 0.3;
      pad.scale = vec2(scale, scale);
    });
    
    // Animate jelly platforms
    get("jellyPlatform").forEach((plat: GameObj) => {
      const jiggleSpeed = (plat as any).jiggleSpeed || 3;
      (plat as any).jiggleOffset = Math.max(0, ((plat as any).jiggleOffset || 0) - dt() * 20);
      const offset = Math.sin(t * jiggleSpeed) * 3 + (plat as any).jiggleOffset;
      plat.pos.y += offset * dt() * 10;
      const scaleX = 1 + Math.sin(t * jiggleSpeed * 2) * 0.1;
      const scaleY = 1 - Math.sin(t * jiggleSpeed * 2) * 0.1;
      plat.scale = vec2(scaleX, scaleY);
    });
    
    // Animate elastic walls
    get("elasticWall").forEach((wall: GameObj) => {
      const wobble = Math.sin(t * 4) * 0.05;
      wall.scale = vec2(1 + wobble, 1 - wobble);
    });
    
    // Animate slime pools
    get("slimePool").forEach((pool: GameObj) => {
      const phase = (pool as any).wavePhase || 0;
      (pool as any).wavePhase = phase + dt() * 2;
      const alpha = 0.4 + Math.sin(phase) * 0.2;
      pool.opacity = alpha;
    });
    
    // Animate wave platforms
    get("wavePlatform").forEach((plat: GameObj) => {
      const phase = (plat as any).wavePhase || 0;
      const amplitude = (plat as any).waveAmplitude || 20;
      (plat as any).wavePhase = phase + dt() * 3;
      plat.pos.y += Math.sin(phase) * amplitude * dt();
    });
    
    // Animate spikes with jiggle
    get("spike").forEach((spike: GameObj) => {
      const phase = (spike as any).jigglePhase || 0;
      (spike as any).jigglePhase = phase + dt() * 5;
      const wobble = Math.sin(phase) * 0.1;
      spike.angle = wobble * 10;
    });
  });

  // Update ghosts with jiggle physics
  onUpdate(() => {
    if (isPaused) return;
    get("jellyClone").forEach((ghost: GameObj) => {
      const g = ghost as any;
      if (g.softBody) {
        const vel = g.vel || vec2(0, 0);
        g.softBody.update(1/60, ghost.pos, vel);
        g.lastVel = vel;
      }
    });
  });

  // Render ghosts with jiggle
  get("jellyClone").forEach((ghost: GameObj) => {
    ghost.onDraw(() => {
      const g = ghost as any;
      if (!g.softBody) return;
      const vertices = g.softBody.getVertices();
      if (vertices.length < 3) return;
      
      drawPolygon({
        pts: vertices,
        pos: vec2(0, 0),
        color: rgb(120, 255, 200),
        fill: true,
        opacity: 0.7,
      });
      
      drawPolygon({
        pts: vertices,
        pos: vec2(0, 0),
        color: rgb(80, 200, 150),
        fill: false,
        opacity: 0.7,
      });
    });
  });
});

function startLevel(i: number) {
  if (i >= LEVELS.length) {
    go("victory");
  } else {
    go("game", i);
  }
}

function toggleNearestDoor(plate: GameObj, open: boolean) {
  const doors = get("door");
  let nearest: GameObj | null = null;
  let nd = 999999;
  doors.forEach((d) => {
    const dd = d.pos.dist(plate.pos);
    if (dd < nd) { nd = dd; nearest = d; }
  });
  if (nearest) {
    if (open) {
      (nearest as any).hidden = true;
      (nearest as any).solid = false;
      (nearest as any).use(opacity(0.25));
    } else {
      (nearest as any).hidden = false;
      (nearest as any).solid = true;
      (nearest as any).use(opacity(1));
    }
  }
}

function restart() { startLevel(currentLevel); }
function nextLevel() {
  currentLevel = (currentLevel + 1) % LEVELS.length;
  startLevel(currentLevel);
}

// Jiggle Particle System
function spawnJiggleParticles(position: Vec2, color: any, count: number) {
  // Safety check
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    console.warn('Invalid position passed to spawnJiggleParticles');
    return;
  }
  
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(100, 300);
    const vel = vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);
    const size = rand(3, 8);
    
    const particle = add([
      circle(size),
      pos(position.x + rand(-10, 10), position.y + rand(-10, 10)),
      color,
      opacity(1),
      z(100),
      { vel, life: 1.0, jigglePhase: rand(0, Math.PI * 2) },
      "particle",
    ]);
    
    particle.onUpdate(() => {
      const p = particle as any;
      p.vel.y += GRAVITY * dt() * 0.5;
      particle.pos = particle.pos.add(p.vel.scale(dt()));
      p.life -= dt() * 2;
      particle.opacity = Math.max(0, p.life);
      
      // Jiggle effect
      p.jigglePhase += dt() * 10;
      const jiggle = Math.sin(p.jigglePhase) * 2;
      particle.pos.x += jiggle * dt();
      
      if (p.life <= 0) destroy(particle);
    });
  }
}

// Recorder and ghost
function createRecorder(player: GameObj) {
  let recording: InputFrame[] = [];
  let isRecording = false;
  let startTime = 0;

  function start(durationSec: number) {
    recording = [];
    isRecording = true;
    startTime = time();
    const endAt = startTime + durationSec;
    const ui = add([text("◄ RECORDING TIMELINE ►", { size: 14 }), pos(12, 80), color(255, 0, 100), fixed(), z(1000), "rec_ui"]);
    const t = loop(1/60, () => {
      const tNow = time();
      const frame: InputFrame = {
        t: tNow - startTime,
        left: isKeyDown("left") || isKeyDown("a"),
        right: isKeyDown("right") || isKeyDown("d"),
        jump: isKeyPressed("up") || isKeyPressed("w") || isKeyPressed("space"),
      };
      recording.push(frame);
      if (tNow >= endAt) {
        t.cancel();
        isRecording = false;
        destroy(ui);
        add([text("► TIMELINE CAPTURED | Press E to deploy quantum echo", { size: 13 }), pos(12, 100), color(0, 255, 200), fixed(), z(1000), lifespan(2.5)]);
      }
    });
  }

  function getRecording() { return recording.slice(); }

  return { start, getRecording };
}

function spawnGhostFrom(rec: { getRecording: () => InputFrame[] }) {
  const frames = rec.getRecording();
  if (!frames.length) {
    add([text("⚠ NO TIMELINE DATA | Press Q to record first", { size: 13 }), pos(12, 100), color(255, 150, 0), fixed(), z(1000), lifespan(2.5)]);
    return;
  }

  const spawnAt = camPos();
  const g = add([pos(spawnAt), ...ghostComp()]) as GameObj & { softBody: SoftBody; lastVel: Vec2 };
  
  shake(3);

  let idx = 0;
  const startT = time();
  const runner = loop(1/60, () => {
    const elapsed = time() - startT;
    while (idx < frames.length && frames[idx].t <= elapsed) {
      const f = frames[idx];
      const s = MOVE_SPEED;
      const grounded = g.isGrounded && g.isGrounded();
      if (f.left) g.move(-s, 0);
      if (f.right) g.move(s, 0);
      if (f.jump && grounded) g.jump();
      idx++;
    }
    if (idx >= frames.length) {
      runner.cancel();
    }
  });

  // Ghost jiggle physics interactions
  g.onCollide("bouncePad", (pad: GameObj) => {
    const bounceForce = (pad as any).bounceForce || 800;
    g.jump(bounceForce);
  });
  
  g.onCollide("spike", () => {
    destroy(g);
  });
  
  g.onCollide("exit", () => {
    add([text("✓ QUANTUM ECHO: EXIT REACHED", { size: 13 }), pos(12, 120), color(0, 255, 150), fixed(), z(1000), lifespan(2.5)]);
  });
}

// Victory Scene - All Phases Complete
scene("victory", () => {
  // Rainbow pulsing background
  const bgColors = [
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 0],
    [0, 255, 0],
  ];
  
  let colorIndex = 0;
  const bgPulse = add([
    rect(width(), height()),
    pos(0, 0),
    color(bgColors[0][0], bgColors[0][1], bgColors[0][2]),
    opacity(0.3),
    z(-100),
    { pulsePhase: 0, colorPhase: 0 },
  ]);
  
  bgPulse.onUpdate(() => {
    const bg = bgPulse as any;
    bg.pulsePhase += dt() * 4;
    bg.colorPhase += dt() * 2;
    
    if (bg.colorPhase >= 1) {
      bg.colorPhase = 0;
      colorIndex = (colorIndex + 1) % bgColors.length;
    }
    
    const currentColor = bgColors[colorIndex];
    const nextColor = bgColors[(colorIndex + 1) % bgColors.length];
    const t = bg.colorPhase;
    
    bgPulse.color = rgb(
      currentColor[0] * (1 - t) + nextColor[0] * t,
      currentColor[1] * (1 - t) + nextColor[1] * t,
      currentColor[2] * (1 - t) + nextColor[2] * t
    );
    
    (bgPulse as any).opacity = 0.3 + Math.sin(bg.pulsePhase) * 0.2;
  });
  
  // Celebration particles
  for (let i = 0; i < 100; i++) {
    const particle = add([
      circle(rand(3, 8)),
      pos(rand(0, width()), rand(0, height())),
      color(rand(0, 255), rand(0, 255), rand(0, 255)),
      opacity(rand(0.5, 1)),
      z(5),
      { 
        velX: rand(-200, 200),
        velY: rand(-300, -100),
        rotSpeed: rand(-5, 5),
        life: rand(3, 6)
      },
    ]);
    
    particle.onUpdate(() => {
      const p = particle as any;
      particle.pos.x += p.velX * dt();
      particle.pos.y += p.velY * dt();
      p.velY += 400 * dt();
      p.life -= dt();
      
      if (particle.pos.y > height() + 50) {
        particle.pos.y = -50;
        particle.pos.x = rand(0, width());
        p.velY = rand(-300, -100);
      }
    });
  }
  
  // Victory title
  const title = add([
    text("QUANTUM FLUX", { size: 80 }),
    pos(width() / 2, height() / 2 - 150),
    anchor("center"),
    color(0, 255, 255),
    z(10),
    { glowPhase: 0 },
  ]);
  
  title.onUpdate(() => {
    const t = title as any;
    t.glowPhase += dt() * 5;
    const glow = 200 + Math.sin(t.glowPhase) * 55;
    title.color = rgb(glow, 255, 255);
    const scale = 1 + Math.sin(t.glowPhase * 0.5) * 0.1;
    (title as any).scale = vec2(scale, scale);
  });
  
  add([
    text("STABILIZED", { size: 64 }),
    pos(width() / 2, height() / 2 - 70),
    anchor("center"),
    color(0, 255, 100),
    z(10),
  ]);
  
  // Stats
  add([
    text("═══════════════════════════════", { size: 20 }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(100, 255, 200),
    z(10),
  ]);
  
  add([
    text(`ALL ${LEVELS.length} PHASES COMPLETED`, { size: 24 }),
    pos(width() / 2, height() / 2 + 40),
    anchor("center"),
    color(255, 255, 0),
    z(10),
  ]);
  
  add([
    text("QUANTUM CORE: FULLY OPERATIONAL", { size: 20 }),
    pos(width() / 2, height() / 2 + 80),
    anchor("center"),
    color(0, 255, 150),
    z(10),
  ]);
  
  add([
    text("FLUX MATRIX: SYNCHRONIZED", { size: 20 }),
    pos(width() / 2, height() / 2 + 110),
    anchor("center"),
    color(0, 255, 150),
    z(10),
  ]);
  
  add([
    text("═══════════════════════════════", { size: 20 }),
    pos(width() / 2, height() / 2 + 150),
    anchor("center"),
    color(100, 255, 200),
    z(10),
  ]);
  
  // Return prompt
  const prompt = add([
    text("[ PRESS ENTER TO RETURN TO MENU ]", { size: 24 }),
    pos(width() / 2, height() / 2 + 220),
    anchor("center"),
    color(255, 255, 255),
    opacity(1),
    z(10),
    { blinkPhase: 0 },
  ]);
  
  prompt.onUpdate(() => {
    const p = prompt as any;
    p.blinkPhase += dt() * 3;
    (prompt as any).opacity = 0.5 + Math.sin(p.blinkPhase) * 0.5;
  });
  
  // Energy burst effect
  const burst = add([
    circle(50),
    pos(width() / 2, height() / 2 - 70),
    color(255, 255, 255),
    opacity(0.5),
    anchor("center"),
    z(1),
    { burstPhase: 0 },
  ]);
  
  burst.onUpdate(() => {
    const b = burst as any;
    b.burstPhase += dt() * 3;
    const scale = 1 + Math.sin(b.burstPhase) * 0.5;
    (burst as any).scale = vec2(scale, scale);
    (burst as any).opacity = 0.3 + Math.sin(b.burstPhase * 2) * 0.2;
  });
  
  onKeyPress("enter", () => go("levelSelect"));
  onKeyPress("space", () => go("levelSelect"));
});

// Defeat Scene - System Failure
scene("defeat", (level?: number) => {
  const safeLevel = (level != null && typeof level === 'number') ? level : 0;
  // Dark red pulsing background
  const bgPulse = add([
    rect(width(), height()),
    pos(0, 0),
    color(50, 0, 20),
    opacity(0.8),
    z(-100),
    { pulsePhase: 0 },
  ]);
  
  bgPulse.onUpdate(() => {
    const p = bgPulse as any;
    p.pulsePhase += dt() * 3;
    (bgPulse as any).opacity = 0.6 + Math.sin(p.pulsePhase) * 0.2;
  });
  
  // Glitch effect lines
  for (let i = 0; i < 15; i++) {
    const glitchLine = add([
      rect(width(), rand(2, 6)),
      pos(0, rand(0, height())),
      color(255, 0, 0),
      opacity(rand(0.1, 0.3)),
      z(-50),
      { glitchSpeed: rand(100, 300) },
    ]);
    
    glitchLine.onUpdate(() => {
      const g = glitchLine as any;
      glitchLine.pos.y += g.glitchSpeed * dt();
      if (glitchLine.pos.y > height()) glitchLine.pos.y = -10;
    });
  }
  
  // Main failure message
  add([
    text("⚠ SYSTEM FAILURE ⚠", { size: 64 }),
    pos(width() / 2, height() / 2 - 120),
    anchor("center"),
    color(255, 50, 50),
    z(10),
  ]);
  
  add([
    text("QUANTUM CORE DESTABILIZED", { size: 24 }),
    pos(width() / 2, height() / 2 - 50),
    anchor("center"),
    color(255, 100, 100),
    opacity(0.9),
    z(10),
  ]);
  
  // Stats
  add([
    text(`PHASE: ${safeLevel + 1}`, { size: 20 }),
    pos(width() / 2, height() / 2 + 20),
    anchor("center"),
    color(255, 150, 0),
    z(10),
  ]);
  
  // Error code
  add([
    text(`ERROR CODE: QF-${Math.floor(rand(1000, 9999))}`, { size: 16 }),
    pos(width() / 2, height() / 2 + 60),
    anchor("center"),
    color(200, 200, 200),
    opacity(0.7),
    z(10),
  ]);
  
  // Restart options with blinking
  const restartPrompt = add([
    text("[ R ] RESTART PHASE  |  [ ESC ] RETURN TO MENU", { size: 20 }),
    pos(width() / 2, height() / 2 + 140),
    anchor("center"),
    color(0, 255, 255),
    opacity(1),
    z(10),
    { blinkPhase: 0 },
  ]);
  
  restartPrompt.onUpdate(() => {
    const r = restartPrompt as any;
    r.blinkPhase += dt() * 4;
    (restartPrompt as any).opacity = 0.4 + Math.sin(r.blinkPhase) * 0.6;
  });
  
  // Particle debris
  for (let i = 0; i < 20; i++) {
    const debris = add([
      circle(rand(2, 5)),
      pos(rand(0, width()), rand(0, height())),
      color(255, rand(0, 100), 0),
      opacity(rand(0.3, 0.7)),
      z(5),
      { velX: rand(-50, 50), velY: rand(-100, -20), life: rand(2, 4) },
    ]);
    
    debris.onUpdate(() => {
      const d = debris as any;
      debris.pos.x += d.velX * dt();
      debris.pos.y += d.velY * dt();
      d.velY += 200 * dt();
      d.life -= dt();
      if (d.life <= 0) destroy(debris);
    });
  }
  
  // Controls
  onKeyPress("r", () => go("game", safeLevel));
  onKeyPress("escape", () => go("title"));
});

// Title screen - Futuristic Tech Dashboard
scene("title", () => {
  // Animated background grid
  const gridLines: GameObj[] = [];
  for (let i = 0; i < 20; i++) {
    const line = add([
      rect(width(), 1),
      pos(0, i * 30),
      color(0, 255, 255),
      opacity(0.1),
      z(-10),
      { offset: i * 0.2 },
    ]);
    gridLines.push(line);
  }
  
  // Floating particles
  for (let i = 0; i < 30; i++) {
    const particle = add([
      circle(rand(1, 3)),
      pos(rand(0, width()), rand(0, height())),
      color(0, 255, 255),
      opacity(rand(0.3, 0.8)),
      z(-5),
      { 
        speed: rand(20, 60),
        phase: rand(0, Math.PI * 2),
        glowPhase: rand(0, Math.PI * 2)
      },
    ]);
    
    particle.onUpdate(() => {
      const p = particle as any;
      particle.pos.y -= p.speed * dt();
      if (particle.pos.y < -10) particle.pos.y = height() + 10;
      
      p.glowPhase += dt() * 3;
      particle.opacity = 0.3 + Math.sin(p.glowPhase) * 0.5;
    });
  }
  
  // Main title with glow effect
  const title1 = add([
    text("QUANTUM", { size: 72 }),
    pos(width() / 2, height() / 2 - 120),
    anchor("center"),
    color(0, 255, 255),
    z(10),
    { glowPhase: 0 },
  ]);
  
  const title2 = add([
    text("FLUX", { size: 88 }),
    pos(width() / 2, height() / 2 - 40),
    anchor("center"),
    color(255, 0, 255),
    z(10),
    { glowPhase: Math.PI },
  ]);
  
  // Subtitle with tech styling
  add([
    text("[ SOFT-BODY PHYSICS ENGINE v2.0 ]", { size: 16 }),
    pos(width() / 2, height() / 2 + 30),
    anchor("center"),
    color(100, 255, 200),
    opacity(0.8),
    z(10),
  ]);
  
  // System status indicators
  const statusY = height() / 2 + 70;
  add([
    text("► QUANTUM CORE: ONLINE", { size: 14 }),
    pos(width() / 2 - 150, statusY),
    anchor("left"),
    color(0, 255, 100),
    z(10),
  ]);
  
  add([
    text("► FLUX STABILIZERS: ACTIVE", { size: 14 }),
    pos(width() / 2 - 150, statusY + 25),
    anchor("left"),
    color(0, 255, 100),
    z(10),
  ]);
  
  add([
    text("► TEMPORAL ECHO: READY", { size: 14 }),
    pos(width() / 2 - 150, statusY + 50),
    anchor("left"),
    color(0, 255, 100),
    z(10),
  ]);
  
  // Animated prompt
  const prompt = add([
    text("[ PRESS ENTER TO INITIALIZE ]", { size: 24 }),
    pos(width() / 2, height() / 2 + 160),
    anchor("center"),
    color(255, 255, 0),
    opacity(1),
    z(10),
    { blinkPhase: 0 },
  ]);
  
  // Tech corner decorations
  add([text("╔═══════════", { size: 24 }), pos(20, 20), color(0, 255, 255), opacity(0.5)]);
  add([text("═══════════╗", { size: 24 }), pos(width() - 180, 20), color(0, 255, 255), opacity(0.5)]);
  add([text("╚═══════════", { size: 24 }), pos(20, height() - 40), color(0, 255, 255), opacity(0.5)]);
  add([text("═══════════╝", { size: 24 }), pos(width() - 180, height() - 40), color(0, 255, 255), opacity(0.5)]);
  
  // Central energy core visualization
  const energyCore = add([
    circle(40),
    pos(width() / 2, height() / 2 + 220),
    color(100, 200, 255),
    opacity(0.3),
    anchor("center"),
    z(5),
    { softBody: new SoftBody(0, 0, 16, 40), phase: 0, pulsePhase: 0 },
  ]);
  
  // Orbiting particles around core
  const orbitParticles: GameObj[] = [];
  for (let i = 0; i < 8; i++) {
    const orbitParticle = add([
      circle(4),
      pos(width() / 2, height() / 2 + 220),
      color(255, 0, 255),
      opacity(0.8),
      z(6),
      { angle: (i / 8) * Math.PI * 2, orbitRadius: 60 },
    ]);
    orbitParticles.push(orbitParticle);
  }
  
  // Animations
  onUpdate(() => {
    const t = time();
    
    // Grid animation
    gridLines.forEach((line, i) => {
      const l = line as any;
      line.opacity = 0.05 + Math.sin(t * 2 + l.offset) * 0.05;
    });
    
    // Title glow
    const t1 = title1 as any;
    t1.glowPhase += dt() * 2;
    const glow1 = 200 + Math.sin(t1.glowPhase) * 55;
    title1.color = rgb(0, glow1, 255);
    
    const t2 = title2 as any;
    t2.glowPhase += dt() * 2;
    const glow2 = 200 + Math.sin(t2.glowPhase) * 55;
    title2.color = rgb(255, 0, glow2);
    
    // Prompt blink
    const p = prompt as any;
    p.blinkPhase += dt() * 3;
    (prompt as any).opacity = 0.5 + Math.sin(p.blinkPhase) * 0.5;
    
    // Energy core animation
    const core = energyCore as any;
    core.phase += dt() * 2;
    core.pulsePhase += dt() * 4;
    const pulse = 1 + Math.sin(core.pulsePhase) * 0.3;
    (energyCore as any).scale = vec2(pulse, pulse);
    
    const vel = vec2(Math.cos(core.phase) * 150, Math.sin(core.phase) * 150);
    core.softBody.update(dt(), energyCore.pos, vel);
    
    // Orbit particles
    orbitParticles.forEach((particle, i) => {
      const p = particle as any;
      p.angle += dt() * 2;
      particle.pos.x = width() / 2 + Math.cos(p.angle) * p.orbitRadius;
      particle.pos.y = height() / 2 + 220 + Math.sin(p.angle) * p.orbitRadius;
    });
  });
  
  // Render energy core with soft body
  energyCore.onDraw(() => {
    const core = energyCore as any;
    const vertices = core.softBody.getVertices();
    if (vertices.length < 3) return;
    
    drawPolygon({
      pts: vertices,
      pos: vec2(0, 0),
      color: rgb(100, 200, 255),
      fill: true,
      opacity: 0.3,
    });
    
    drawPolygon({
      pts: vertices,
      pos: vec2(0, 0),
      color: rgb(0, 255, 255),
      fill: false,
      opacity: 0.8,
    });
  });
  
  onKeyPress("enter", () => go("levelSelect"));
  onKeyPress("space", () => go("levelSelect"));
  onKeyPress("l", () => go("levelSelect"));
});

// Level Selection Scene
scene("levelSelect", () => {
  // Background
  add([
    rect(width(), height()),
    pos(0, 0),
    color(10, 5, 20),
    z(-100),
  ]);
  
  // Title
  add([
    text("LEVEL SELECT", { size: 48 }),
    pos(width() / 2, 60),
    anchor("center"),
    color(0, 255, 255),
    z(10),
  ]);
  
  // Stats
  const completedCount = gameState.levelCompleted.filter(c => c).length;
  add([
    text(`COMPLETED: ${completedCount}/${LEVELS.length} | DEATHS: ${gameState.totalDeaths}`, { size: 16 }),
    pos(width() / 2, 110),
    anchor("center"),
    color(255, 255, 100),
    z(10),
  ]);
  
  // Level grid
  const cols = 4;
  const rows = 2;
  const buttonWidth = 140;
  const buttonHeight = 100;
  const spacing = 20;
  const startX = (width() - (cols * buttonWidth + (cols - 1) * spacing)) / 2;
  const startY = 180;
  
  LEVELS.forEach((_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (buttonWidth + spacing);
    const y = startY + row * (buttonHeight + spacing);
    
    const completed = gameState.levelCompleted[i];
    const bestTime = gameState.bestTimes[i];
    
    // Button background
    const button = add([
      rect(buttonWidth, buttonHeight),
      pos(x, y),
      color(completed ? rgb(0, 100, 50) : rgb(40, 40, 60)),
      area(),
      anchor("topleft"),
      z(10),
      { levelIndex: i, hovered: false },
    ]);
    
    // Level number
    add([
      text(`PHASE ${i + 1}`, { size: 20 }),
      pos(x + buttonWidth / 2, y + 20),
      anchor("center"),
      color(255, 255, 255),
      z(11),
    ]);
    
    // Status icon
    add([
      text(completed ? "✓" : "○", { size: 24 }),
      pos(x + buttonWidth / 2, y + 50),
      anchor("center"),
      color(completed ? rgb(0, 255, 100) : rgb(150, 150, 150)),
      z(11),
    ]);
    
    // Best time
    if (bestTime != null && bestTime !== Infinity && typeof bestTime === 'number') {
      add([
        text(`${bestTime.toFixed(1)}s`, { size: 14 }),
        pos(x + buttonWidth / 2, y + 80),
        anchor("center"),
        color(255, 255, 100),
        z(11),
      ]);
    }
    
    // Hover effect
    button.onUpdate(() => {
      const mouse = mousePos();
      const isHovered = mouse.x >= x && mouse.x <= x + buttonWidth &&
                       mouse.y >= y && mouse.y <= y + buttonHeight;
      
      if (isHovered && !button.hovered) {
        button.hovered = true;
        button.color = completed ? rgb(0, 150, 75) : rgb(60, 60, 90);
      } else if (!isHovered && button.hovered) {
        button.hovered = false;
        button.color = completed ? rgb(0, 100, 50) : rgb(40, 40, 60);
      }
    });
    
    // Click handler
    button.onClick(() => {
      currentLevel = i;
      startLevel(i);
    });
    
    // Keyboard shortcuts
    onKeyPress((i + 1) % 10 as unknown as string, () => {
      currentLevel = i;
      startLevel(i);
    });
  });
  
  // Instructions
  add([
    text("Click a level or press 1-8 to start", { size: 16 }),
    pos(width() / 2, height() - 80),
    anchor("center"),
    color(200, 200, 200),
    z(10),
  ]);
  
  add([
    text("ESC: Return to Title", { size: 14 }),
    pos(width() / 2, height() - 50),
    anchor("center"),
    color(150, 150, 150),
    z(10),
  ]);
  
  onKeyPress("escape", () => go("title"));
});

// Expose reset function to window for debugging
(window as any).resetGameProgress = resetProgress;

try {
  go("title");
} catch (e) {
  console.error('Failed to start game:', e);
  // Try to reset and restart
  resetProgress();
  setTimeout(() => {
    try {
      go("title");
    } catch (e2) {
      console.error('Failed to start game after reset:', e2);
    }
  }, 100);
}
