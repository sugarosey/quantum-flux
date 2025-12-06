import kaboom, { GameObj, Vec2, KaboomCtx } from "kaboom";

// Init Kaboom with enhanced settings for extreme smoothness
const k = kaboom({
  global: false,
  touchToMouse: true,
  canvas: undefined,
  root: document.getElementById("game") as HTMLElement,
  background: [8, 5, 18],
  width: 1280,
  height: 720,
  letterbox: true,
  crisp: false, // Enable anti-aliasing
  stretch: true,
  maxFPS: 144, // High framerate for smoothness
});

// Destructure all Kaboom functions we need
const {
  add, pos, vec2, color, rgb, rect, circle, polygon, area, body, anchor, outline, opacity, z, scale,
  text, fixed, lifespan, rotate, scene, go, onKeyDown, onKeyPress, onKeyRelease, onUpdate, onCollide,
  onCollideEnd, get, destroy, setGravity, camPos, camScale, time, dt, loop, shake, rand, width, height,
  drawPolygon, isKeyDown, isKeyPressed, mousePos, drawCircle, drawRect, drawLine
} = k;

// Constants - Enhanced for smoother feel
const GRAVITY = 1100;
const MOVE_SPEED = 280;
const JUMP_FORCE = 720;
const GHOST_COLOR = [100, 220, 255];

// Smooth easing functions
const ease = {
  outQuad: (t: number) => t * (2 - t),
  outCubic: (t: number) => (--t) * t * t + 1,
  outElastic: (t: number) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  outBack: (t: number) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  inQuad: (t: number) => t * t,
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounceOut: (t: number) => {
    const n1 = 7.5625; const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  elastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

// Screen Transition System for smooth scene changes
class ScreenTransition {
  private overlay: GameObj | null = null;
  private isTransitioning: boolean = false;
  
  fadeIn(duration: number = 0.5, callback?: () => void) {
    if (this.overlay) destroy(this.overlay);
    
    this.overlay = add([
      rect(width() * 2, height() * 2),
      pos(-width() / 2, -height() / 2),
      color(0, 0, 0),
      opacity(1),
      z(10000),
      fixed(),
      { fadeTime: 0, duration, callback },
      "screenFade"
    ]);
    
    this.overlay.onUpdate(() => {
      const o = this.overlay as any;
      o.fadeTime += dt();
      const progress = Math.min(1, o.fadeTime / o.duration);
      this.overlay!.opacity = 1 - ease.outQuad(progress);
      
      if (progress >= 1) {
        if (o.callback) o.callback();
        destroy(this.overlay!);
        this.overlay = null;
      }
    });
  }
  
  fadeOut(duration: number = 0.5, callback?: () => void) {
    if (this.overlay) destroy(this.overlay);
    this.isTransitioning = true;
    
    this.overlay = add([
      rect(width() * 2, height() * 2),
      pos(-width() / 2, -height() / 2),
      color(0, 0, 0),
      opacity(0),
      z(10000),
      fixed(),
      { fadeTime: 0, duration, callback },
      "screenFade"
    ]);
    
    this.overlay.onUpdate(() => {
      const o = this.overlay as any;
      o.fadeTime += dt();
      const progress = Math.min(1, o.fadeTime / o.duration);
      this.overlay!.opacity = ease.inQuad(progress);
      
      if (progress >= 1) {
        this.isTransitioning = false;
        if (o.callback) o.callback();
      }
    });
  }
  
  wipeIn(duration: number = 0.6) {
    // Horizontal wipe reveal
    const wipeBar = add([
      rect(width() * 2, height() * 2),
      pos(0, -height() / 2),
      color(8, 5, 18),
      opacity(1),
      z(10000),
      fixed(),
      anchor("left"),
      { wipeTime: 0, duration },
      "wipeTransition"
    ]);
    
    wipeBar.onUpdate(() => {
      const w = wipeBar as any;
      w.wipeTime += dt();
      const progress = Math.min(1, w.wipeTime / w.duration);
      wipeBar.pos.x = -width() * 2 * ease.outCubic(progress);
      
      if (progress >= 1) {
        destroy(wipeBar);
      }
    });
  }
  
  circleReveal(centerX: number, centerY: number, duration: number = 0.8) {
    // This creates a growing circle that reveals the scene
    // Simulated with shrinking overlay
    for (let i = 0; i < 20; i++) {
      const delay = i * 0.02;
      const ring = add([
        circle(width()),
        pos(centerX, centerY),
        color(8, 5, 18),
        opacity(1),
        z(9999 - i),
        fixed(),
        anchor("center"),
        { revealTime: -delay, duration, startScale: 2 },
        "circleReveal"
      ]);
      
      ring.onUpdate(() => {
        const r = ring as any;
        r.revealTime += dt();
        if (r.revealTime < 0) return;
        
        const progress = Math.min(1, r.revealTime / r.duration);
        const scaleVal = r.startScale * (1 - ease.outQuart(progress));
        (ring as any).scale = vec2(scaleVal, scaleVal);
        ring.opacity = progress < 0.9 ? 1 : 1 - (progress - 0.9) * 10;
        
        if (progress >= 1) {
          destroy(ring);
        }
      });
    }
  }
}

const screenTransition = new ScreenTransition();

// Smooth camera system
class SmoothCamera {
  private targetPos: Vec2 = vec2(0, 0);
  private currentPos: Vec2 = vec2(0, 0);
  private targetScale: number = 1;
  private currentScale: number = 1;
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.92;
  private followSpeed: number = 8;
  private scaleSpeed: number = 4;
  private impulseOffset: Vec2 = vec2(0, 0);
  private impulseDecay: number = 0.85;
  
  setTarget(pos: Vec2) {
    this.targetPos = pos;
  }
  
  setScale(scale: number) {
    this.targetScale = scale;
  }
  
  addShake(intensity: number) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }
  
  addImpulse(dir: Vec2, force: number) {
    this.impulseOffset = this.impulseOffset.add(dir.scale(force));
  }
  
  update(deltaTime: number) {
    // Smooth position interpolation
    const posDiff = this.targetPos.sub(this.currentPos);
    this.currentPos = this.currentPos.add(posDiff.scale(this.followSpeed * deltaTime));
    
    // Smooth scale interpolation
    const scaleDiff = this.targetScale - this.currentScale;
    this.currentScale += scaleDiff * this.scaleSpeed * deltaTime;
    
    // Apply shake
    let shakeOffset = vec2(0, 0);
    if (this.shakeIntensity > 0.1) {
      shakeOffset = vec2(
        (Math.random() - 0.5) * this.shakeIntensity * 2,
        (Math.random() - 0.5) * this.shakeIntensity * 2
      );
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }
    
    // Decay impulse
    this.impulseOffset = this.impulseOffset.scale(this.impulseDecay);
    
    // Apply to camera
    const finalPos = this.currentPos.add(shakeOffset).add(this.impulseOffset);
    camPos(finalPos);
    camScale(vec2(this.currentScale, this.currentScale));
  }
  
  getPosition(): Vec2 {
    return this.currentPos;
  }
}

const smoothCamera = new SmoothCamera();

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

// Advanced Procedural Audio System with layered sounds
class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  constructor() {
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      this.audioContext = new (AudioContext || (window as any).webkitAudioContext)();
      
      // Create compressor for smooth audio
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;
      this.compressor.connect(this.audioContext.destination);
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.compressor);
      this.masterGain.gain.value = 0.4;
      
      // Create reverb impulse response
      this.createReverb();
    }
  }
  
  private createReverb() {
    if (!this.audioContext || !this.masterGain) return;
    const length = this.audioContext.sampleRate * 1.5;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    this.reverbNode = this.audioContext.createConvolver();
    this.reverbNode.buffer = impulse;
    
    const reverbGain = this.audioContext.createGain();
    reverbGain.gain.value = 0.15;
    this.reverbNode.connect(reverbGain);
    reverbGain.connect(this.masterGain);
  }
  
  private createOscillator(type: OscillatorType = 'sine'): [OscillatorNode, GainNode] | null {
    if (!this.audioContext || !this.masterGain) return null;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.masterGain);
    if (this.reverbNode) {
      const reverbSend = this.audioContext.createGain();
      reverbSend.gain.value = 0.3;
      osc.connect(reverbSend);
      reverbSend.connect(this.reverbNode);
    }
    return [osc, gain];
  }
  
  playJump() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    // Main jump sound - layered
    const main = this.createOscillator('sine');
    if (main) {
      const [osc, gain] = main;
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(650, t + 0.12);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    }
    
    // High frequency layer for brightness
    const high = this.createOscillator('triangle');
    if (high) {
      const [osc2, gain2] = high;
      osc2.frequency.setValueAtTime(560, t);
      osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      gain2.gain.setValueAtTime(0.08, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc2.start(t);
      osc2.stop(t + 0.08);
    }
  }
  
  playBounce() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    // Bouncy boing sound
    const main = this.createOscillator('sine');
    if (main) {
      const [osc, gain] = main;
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.2);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    }
    
    // Sub bass thump
    const sub = this.createOscillator('sine');
    if (sub) {
      const [osc2, gain2] = sub;
      osc2.frequency.setValueAtTime(80, t);
      osc2.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      gain2.gain.setValueAtTime(0.4, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc2.start(t);
      osc2.stop(t + 0.1);
    }
  }
  
  playDeath() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    // Dramatic descending sound
    const main = this.createOscillator('sawtooth');
    if (main) {
      const [osc, gain] = main;
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    }
    
    // Noise burst
    if (this.audioContext && this.masterGain) {
      const bufferSize = this.audioContext.sampleRate * 0.3;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.15, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      noise.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.3);
    }
  }
  
  playSuccess() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    
    notes.forEach((freq, i) => {
      const main = this.createOscillator('sine');
      if (main) {
        const [osc, gain] = main;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.4);
      }
      
      // Harmonic layer
      const harm = this.createOscillator('triangle');
      if (harm) {
        const [osc2, gain2] = harm;
        osc2.frequency.value = freq * 2;
        gain2.gain.setValueAtTime(0.08, t + i * 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
        osc2.start(t + i * 0.12);
        osc2.stop(t + i * 0.12 + 0.3);
      }
    });
  }
  
  playRecord() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    // Digital recording beep
    for (let i = 0; i < 3; i++) {
      const beep = this.createOscillator('square');
      if (beep) {
        const [osc, gain] = beep;
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.05);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.05);
      }
    }
  }
  
  playLand() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    const thump = this.createOscillator('sine');
    if (thump) {
      const [osc, gain] = thump;
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }
  
  playSlide() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    const slide = this.createOscillator('sine');
    if (slide) {
      const [osc, gain] = slide;
      osc.frequency.setValueAtTime(200 + Math.random() * 100, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }
  
  playAmbient(intensity: number) {
    if (!gameState.soundEnabled || !this.audioContext || !this.masterGain) return;
    const t = this.audioContext.currentTime;
    
    // Low drone
    const drone = this.createOscillator('sine');
    if (drone) {
      const [osc, gain] = drone;
      osc.frequency.value = 55 + intensity * 20;
      gain.gain.setValueAtTime(0.02 + intensity * 0.02, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2);
      osc.start(t);
      osc.stop(t + 2);
    }
  }
  
  // Enhanced dash/boost sound
  playDash() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    const whoosh = this.createOscillator('sine');
    if (whoosh) {
      const [osc, gain] = whoosh;
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    }
    
    // Noise layer for whoosh
    if (this.audioContext && this.masterGain) {
      const bufferSize = this.audioContext.sampleRate * 0.15;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin(i / bufferSize * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.3;
      }
      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.value = 0.1;
      noise.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.15);
    }
  }
  
  // Wall slide sound
  playWallSlide() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    const scrape = this.createOscillator('sawtooth');
    if (scrape) {
      const [osc, gain] = scrape;
      osc.frequency.setValueAtTime(80 + Math.random() * 40, t);
      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  }
  
  // Collect/pickup sound
  playCollect() {
    if (!gameState.soundEnabled || !this.audioContext) return;
    const t = this.audioContext.currentTime;
    
    const notes = [880, 1100, 1320];
    notes.forEach((freq, i) => {
      const bell = this.createOscillator('sine');
      if (bell) {
        const [osc, gain] = bell;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.2);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.2);
      }
    });
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

// Jiggle Physics Constants - Enhanced for extreme smoothness
const SPRING_STIFFNESS = 0.18;
const SPRING_DAMPING = 0.85;
const JIGGLE_AMPLITUDE = 10;
const BOUNCE_ELASTICITY = 0.8;
const TRAIL_LENGTH = 20;
const PARTICLE_POOL_SIZE = 200;

setGravity(GRAVITY);

// Advanced Particle System with object pooling
class ParticlePool {
  private particles: GameObj[] = [];
  private active: Set<GameObj> = new Set();
  
  spawn(position: Vec2, particleColor: any, velocity: Vec2, life: number, size: number) {
    let particle = this.particles.find(p => !this.active.has(p));
    
    if (!particle) {
      particle = add([
        circle(size),
        pos(position),
        particleColor,
        opacity(1),
        z(100),
        { vel: velocity, life, maxLife: life, size, active: true },
        "pooledParticle",
      ]);
      this.particles.push(particle);
    } else {
      particle.pos = position;
      (particle as any).vel = velocity;
      (particle as any).life = life;
      (particle as any).maxLife = life;
      (particle as any).size = size;
      particle.opacity = 1;
    }
    
    this.active.add(particle);
    return particle;
  }
  
  update() {
    this.active.forEach(particle => {
      const p = particle as any;
      if (!p.life || p.life <= 0) {
        this.active.delete(particle);
        particle.opacity = 0;
        return;
      }
      
      p.vel.y += GRAVITY * dt() * 0.3;
      particle.pos = particle.pos.add(p.vel.scale(dt()));
      p.life -= dt();
      
      const lifeRatio = p.life / p.maxLife;
      particle.opacity = lifeRatio;
      const scaleVal = lifeRatio * 0.5 + 0.5;
      (particle as any).scale = vec2(scaleVal, scaleVal);
    });
  }
}

const particlePool = new ParticlePool();

// Motion Trail System
class MotionTrail {
  private positions: Vec2[] = [];
  private colors: any[] = [];
  private maxLength: number;
  
  constructor(maxLength: number = TRAIL_LENGTH) {
    this.maxLength = maxLength;
  }
  
  addPoint(position: Vec2, trailColor: any) {
    this.positions.unshift(position.clone());
    this.colors.unshift(trailColor);
    
    if (this.positions.length > this.maxLength) {
      this.positions.pop();
      this.colors.pop();
    }
  }
  
  draw() {
    for (let i = 1; i < this.positions.length; i++) {
      const alpha = 1 - (i / this.positions.length);
      const thickness = (1 - i / this.positions.length) * 8 + 2;
      
      drawLine({
        p1: this.positions[i - 1],
        p2: this.positions[i],
        width: thickness,
        color: this.colors[i],
        opacity: alpha * 0.6,
      });
    }
  }
  
  clear() {
    this.positions = [];
    this.colors = [];
  }
}

// Jiggle Physics System - Enhanced
class JigglePoint {
  pos: Vec2;
  vel: Vec2;
  target: Vec2;
  prevPos: Vec2;
  
  constructor(x: number, y: number) {
    this.pos = vec2(x, y);
    this.vel = vec2(0, 0);
    this.target = vec2(x, y);
    this.prevPos = vec2(x, y);
  }
  
  update(deltaTime: number, basePos: Vec2, offset: Vec2) {
    this.prevPos = this.pos.clone();
    this.target = basePos.add(offset);
    const force = this.target.sub(this.pos).scale(SPRING_STIFFNESS);
    this.vel = this.vel.add(force).scale(SPRING_DAMPING);
    // Use verlet-style integration for smoother motion
    const newPos = this.pos.add(this.vel.scale(deltaTime * 60));
    this.pos = newPos;
  }
}

class SoftBody {
  points: JigglePoint[] = [];
  center: Vec2;
  trail: MotionTrail;
  squashStretch: number = 1;
  targetSquash: number = 1;
  
  constructor(centerX: number, centerY: number, numPoints: number, radius: number) {
    this.center = vec2(centerX, centerY);
    this.trail = new MotionTrail(15);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      this.points.push(new JigglePoint(x, y));
    }
  }
  
  update(deltaTime: number, basePos: Vec2, velocity: Vec2) {
    this.center = basePos;
    const velocityInfluence = velocity.scale(0.025);
    
    // Squash and stretch based on velocity
    const verticalVel = velocity.y;
    const horizontalVel = Math.abs(velocity.x);
    
    if (verticalVel > 200) {
      this.targetSquash = 0.7; // Falling - stretch vertically
    } else if (verticalVel < -200) {
      this.targetSquash = 1.3; // Rising - squash
    } else {
      this.targetSquash = 1 + horizontalVel * 0.001;
    }
    
    // Smooth interpolation to target squash
    this.squashStretch += (this.targetSquash - this.squashStretch) * 8 * deltaTime;
    
    this.points.forEach((point, i) => {
      const angle = (i / this.points.length) * Math.PI * 2;
      const squashX = 1 / Math.sqrt(this.squashStretch);
      const squashY = this.squashStretch;
      const baseOffset = vec2(
        Math.cos(angle) * JIGGLE_AMPLITUDE * squashX,
        Math.sin(angle) * JIGGLE_AMPLITUDE * squashY
      );
      point.update(deltaTime, basePos, baseOffset.add(velocityInfluence));
    });
    
    // Add trail point
    this.trail.addPoint(basePos, rgb(255, 120, 200));
  }
  
  getVertices(): Vec2[] {
    return this.points.map(p => p.pos);
  }
  
  drawTrail() {
    this.trail.draw();
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
  const softBody = new SoftBody(0, 0, 16, 16);
  return [
    circle(16),
    color(255, 120, 200),
    area({ collisionIgnore: ["ghost", "jellyClone"] }),
    anchor("center"),
    body({ jumpForce: JUMP_FORCE }),
    outline(4, rgb(255, 80, 150)),
    z(10),
    { 
      speed: MOVE_SPEED, 
      canControl: true, 
      softBody,
      lastVel: vec2(0, 0),
      bounceBoost: 1.0,
      trail: new MotionTrail(20),
      wasGrounded: false,
      coyoteTime: 0,
      jumpBufferTime: 0,
      dashCooldown: 0,
      glowIntensity: 0,
      stretchFactor: 1,
    },
    "player",
  ];
}

function ghostComp() {
  const softBody = new SoftBody(0, 0, 16, 14);
  return [
    circle(14),
    color(120, 255, 200),
    opacity(0.75),
    area({ collisionIgnore: ["player", "ghost", "jellyClone"] }),
    anchor("center"),
    body({ jumpForce: JUMP_FORCE }),
    outline(3, rgb(80, 200, 150)),
    z(5),
    { softBody, lastVel: vec2(0, 0), trail: new MotionTrail(12), glowPhase: 0 },
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
    "=": () => [rect(32, 32), area(), body({ isStatic: true }), color(80, 100, 120), outline(1, rgb(60, 80, 100))],
    "#": () => [rect(32, 32), area(), body({ isStatic: true }), color(60, 70, 90), outline(1, rgb(40, 50, 70))],
    ">": () => [rect(28, 28), area(), color(100, 240, 140), outline(3, rgb(20, 120, 60)), anchor("center"), { isExit: true, glowPhase: 0, pulseScale: 1 }, "exit"],
    "@": () => [rect(1,1), area(), { spawn: true }],
    ".": () => [],
    // Enhanced Jiggle Physics Elements
    "B": () => [
      circle(16), 
      area(), 
      color(255, 180, 50), 
      outline(4, rgb(255, 120, 0)),
      anchor("center"),
      { bouncePad: true, bouncePhase: 0, bounceForce: 900, glowIntensity: 0, pulsePhase: rand(0, Math.PI * 2) },
      "bouncePad"
    ],
    "J": () => [
      rect(32, 14), 
      area(), 
      color(180, 100, 255), 
      outline(3, rgb(140, 60, 200)),
      anchor("center"),
      { jellyPlatform: true, jiggleOffset: 0, jiggleSpeed: rand(2, 4), wobblePhase: rand(0, Math.PI * 2) },
      "jellyPlatform"
    ],
    "E": () => [
      rect(10, 32), 
      area(), 
      body({ isStatic: true }),
      color(100, 255, 255), 
      outline(3, rgb(50, 200, 200)),
      anchor("center"),
      { elasticWall: true, pushForce: 500, chargeLevel: 0, pulsePhase: rand(0, Math.PI * 2) },
      "elasticWall"
    ],
    "S": () => [
      rect(32, 18), 
      area(), 
      color(100, 255, 150), 
      opacity(0.7),
      anchor("center"),
      { slimePool: true, slowFactor: 0.5, wavePhase: rand(0, Math.PI * 2), bubbleTimer: 0 },
      "slimePool"
    ],
    "W": () => [
      rect(32, 10), 
      area(), 
      color(100, 180, 255), 
      outline(2, rgb(50, 130, 200)),
      anchor("center"),
      { wavePlatform: true, wavePhase: rand(0, Math.PI * 2), waveAmplitude: 25, baseY: 0 },
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
let ambientTimer = 0;

scene("game", (i: number) => {
  setGravity(GRAVITY);
  isPaused = false;
  levelStartTime = time();
  ambientTimer = 0;
  const { spawn } = buildLevel(i);

  const player = add([pos(spawn), ...playerComp()]) as GameObj & { 
    canControl: boolean; 
    softBody: SoftBody; 
    lastVel: Vec2; 
    bounceBoost: number;
    trail: MotionTrail;
    wasGrounded: boolean;
    coyoteTime: number;
    jumpBufferTime: number;
    dashCooldown: number;
    glowIntensity: number;
    stretchFactor: number;
  };
  const recorder = createRecorder(player);

  // Initialize smooth camera
  smoothCamera.setTarget(spawn);
  camScale(vec2(1, 1));
  hud();
  
  // Intensity increases with level - affects visuals and audio
  const intensity = Math.min(i / LEVELS.length, 1);
  
  // Enhanced pulsing background with gradient effect
  const bgOverlay = add([
    rect(width() * 3, height() * 3),
    pos(-width(), -height()),
    color(80 + intensity * 40, 0, 120 + intensity * 30),
    opacity(0.12 + intensity * 0.12),
    z(-50),
    fixed(),
    { pulsePhase: 0, colorPhase: 0 },
  ]);
  
  // Floating background particles for atmosphere
  for (let p = 0; p < 25 + intensity * 25; p++) {
    const bgParticle = add([
      circle(rand(1, 3)),
      pos(rand(0, width()), rand(0, height())),
      color(rand(100, 200), rand(100, 255), 255),
      opacity(rand(0.1, 0.4)),
      z(-40),
      fixed(),
      { 
        driftSpeed: rand(10, 40),
        wobblePhase: rand(0, Math.PI * 2),
        wobbleSpeed: rand(1, 3),
        baseX: rand(0, width()),
      },
      "bgParticle"
    ]);
    
    bgParticle.onUpdate(() => {
      const bp = bgParticle as any;
      bp.wobblePhase += dt() * bp.wobbleSpeed;
      bgParticle.pos.y -= bp.driftSpeed * dt();
      bgParticle.pos.x = bp.baseX + Math.sin(bp.wobblePhase) * 30;
      
      if (bgParticle.pos.y < -20) {
        bgParticle.pos.y = height() + 20;
        bp.baseX = rand(0, width());
      }
    });
  }
  
  bgOverlay.onUpdate(() => {
    const bg = bgOverlay as any;
    bg.pulsePhase += dt() * (1.5 + intensity * 2);
    bg.colorPhase += dt() * 0.5;
    
    const pulse = Math.sin(bg.pulsePhase) * 0.5 + 0.5;
    (bgOverlay as any).opacity = (0.1 + intensity * 0.1) + pulse * (0.08 + intensity * 0.08);
    
    // Subtle color shift
    const r = 80 + intensity * 40 + Math.sin(bg.colorPhase) * 20;
    const b = 120 + intensity * 30 + Math.cos(bg.colorPhase * 0.7) * 20;
    bgOverlay.color = rgb(r, 0, b);
  });
  
  // Enhanced chromatic aberration with smooth animation
  if (intensity > 0.25) {
    const redShift = add([
      rect(width() * 3, height() * 3),
      pos(-width(), -height()),
      color(255, 30, 60),
      opacity(0.02 + intensity * 0.04),
      z(900),
      fixed(),
      { shiftPhase: 0, offsetX: 0 },
    ]);
    
    redShift.onUpdate(() => {
      const r = redShift as any;
      r.shiftPhase += dt() * 3;
      r.offsetX = Math.sin(r.shiftPhase) * 3;
      redShift.pos.x = -width() + r.offsetX;
      (redShift as any).opacity = (0.02 + intensity * 0.04) + Math.sin(r.shiftPhase * 1.5) * 0.015;
    });
    
    const blueShift = add([
      rect(width() * 3, height() * 3),
      pos(-width(), -height()),
      color(60, 100, 255),
      opacity(0.02 + intensity * 0.04),
      z(900),
      fixed(),
      { shiftPhase: Math.PI, offsetX: 0 },
    ]);
    
    blueShift.onUpdate(() => {
      const b = blueShift as any;
      b.shiftPhase += dt() * 3;
      b.offsetX = Math.sin(b.shiftPhase) * -3;
      blueShift.pos.x = -width() + b.offsetX;
      (blueShift as any).opacity = (0.02 + intensity * 0.04) + Math.sin(b.shiftPhase * 1.5) * 0.015;
    });
  }
  
  // Enhanced scanline effect for harder levels - animated
  if (intensity > 0.4) {
    for (let y = 0; y < 40; y++) {
      const scanline = add([
        rect(width() * 2, 1),
        pos(-width() / 2, y * 18),
        color(0, 255, 255),
        opacity(0.015 + intensity * 0.02),
        z(950),
        fixed(),
        { scanPhase: y * 0.3 }
      ]);
      
      scanline.onUpdate(() => {
        const s = scanline as any;
        s.scanPhase += dt() * 2;
        scanline.opacity = (0.015 + intensity * 0.02) * (0.5 + Math.sin(s.scanPhase) * 0.5);
      });
    }
  }
  
  // Enhanced vignette with breathing effect
  const vignette = add([
    circle(width() * 0.9),
    pos(width() / 2, height() / 2),
    color(0, 0, 0),
    opacity(0.25 + intensity * 0.15),
    z(980),
    fixed(),
    anchor("center"),
    { breathePhase: 0 }
  ]);
  
  vignette.onUpdate(() => {
    const v = vignette as any;
    v.breathePhase += dt() * 1.2;
    vignette.opacity = (0.25 + intensity * 0.15) + Math.sin(v.breathePhase) * 0.08;
    const breatheScale = 1 + Math.sin(v.breathePhase * 0.5) * 0.05;
    (vignette as any).scale = vec2(breatheScale, breatheScale);
  });
  
  // Level difficulty indicator with glow
  const phaseIndicator = add([
    text(`⚡ PHASE ${i + 1}/${LEVELS.length} | INTENSITY: ${Math.floor(intensity * 100)}%`, { size: 14 }),
    pos(width() - 15, 15),
    anchor("topright"),
    color(255, 200 - intensity * 100, 100 + (1 - intensity) * 155),
    opacity(0.9),
    fixed(),
    z(1001),
    { glowPhase: 0 }
  ]);
  
  phaseIndicator.onUpdate(() => {
    const pi = phaseIndicator as any;
    pi.glowPhase += dt() * 4;
    const glow = 0.7 + Math.sin(pi.glowPhase) * 0.3;
    phaseIndicator.opacity = glow;
  });
  
  // Enhanced Timer display with smooth updates
  let timerText = add([
    text("⏱ 0.00s", { size: 16 }),
    pos(width() / 2, 15),
    anchor("top"),
    color(255, 255, 120),
    opacity(0.95),
    fixed(),
    z(1001),
  ]);
  
  let displayedTime = 0;
  onUpdate(() => {
    if (!isPaused) {
      const currentTime = time();
      if (currentTime != null && levelStartTime != null) {
        const elapsed = currentTime - levelStartTime;
        // Smooth time interpolation
        displayedTime += (elapsed - displayedTime) * 15 * dt();
        
        if (timerText && timerText.exists && timerText.exists()) {
          destroy(timerText);
          timerText = add([
            text(`⏱ ${displayedTime.toFixed(2)}s`, { size: 16 }),
            pos(width() / 2, 15),
            anchor("top"),
            color(255, 255, 120),
            opacity(0.95),
            fixed(),
            z(1001),
          ]);
        }
      }
    }
  });
  
  // Best time display with trophy icon
  if (gameState.bestTimes[i] != null && gameState.bestTimes[i] !== Infinity && typeof gameState.bestTimes[i] === 'number') {
    add([
      text(`🏆 BEST: ${gameState.bestTimes[i].toFixed(2)}s`, { size: 13 }),
      pos(width() / 2, 38),
      anchor("top"),
      color(100, 255, 100),
      opacity(0.85),
      fixed(),
      z(1001),
    ]);
  }
  
  // Enhanced tutorial tooltips for level 1 with fade animation
  if (i === 0 && !gameState.levelCompleted[0]) {
    const tip1 = add([
      text("💡 Use WASD to move and SPACE to jump", { size: 13 }),
      pos(width() / 2, height() - 110),
      anchor("center"),
      color(255, 255, 150),
      opacity(0),
      fixed(),
      z(1001),
      { fadeIn: 0 }
    ]);
    
    tip1.onUpdate(() => {
      const t = tip1 as any;
      t.fadeIn = Math.min(1, t.fadeIn + dt() * 2);
      tip1.opacity = ease.outQuad(t.fadeIn) * 0.95;
    });
    
    const tip2 = add([
      text("💡 Press Q to record, then E to spawn your quantum echo!", { size: 13 }),
      pos(width() / 2, height() - 85),
      anchor("center"),
      color(255, 255, 150),
      opacity(0),
      fixed(),
      z(1001),
      { fadeIn: -0.5 }
    ]);
    
    tip2.onUpdate(() => {
      const t = tip2 as any;
      t.fadeIn = Math.min(1, t.fadeIn + dt() * 2);
      tip2.opacity = ease.outQuad(Math.max(0, t.fadeIn)) * 0.95;
    });
    
    // Auto-hide after 10 seconds
    loop(10, () => {
      if (tip1.exists()) destroy(tip1);
      if (tip2.exists()) destroy(tip2);
    });
  }

  // Enhanced movement controls with coyote time and jump buffering
  const moveAccel = 15; // Smooth acceleration
  let targetMoveDir = 0;
  let currentMoveVel = 0;
  
  onKeyDown("left", () => { if (player.canControl) targetMoveDir = -1; });
  onKeyDown("a", () => { if (player.canControl) targetMoveDir = -1; });
  onKeyDown("right", () => { if (player.canControl) targetMoveDir = 1; });
  onKeyDown("d", () => { if (player.canControl) targetMoveDir = 1; });
  
  onKeyRelease("left", () => { if (targetMoveDir === -1) targetMoveDir = 0; });
  onKeyRelease("a", () => { if (targetMoveDir === -1) targetMoveDir = 0; });
  onKeyRelease("right", () => { if (targetMoveDir === 0 || targetMoveDir === 1) targetMoveDir = 0; });
  onKeyRelease("d", () => { if (targetMoveDir === 0 || targetMoveDir === 1) targetMoveDir = 0; });
  
  // Handle movement in update for smoother acceleration
  onUpdate(() => {
    if (isPaused || !player.canControl) return;
    
    // Smooth movement acceleration
    const targetVel = targetMoveDir * MOVE_SPEED * player.bounceBoost;
    currentMoveVel += (targetVel - currentMoveVel) * moveAccel * dt();
    
    if (Math.abs(currentMoveVel) > 1) {
      player.move(currentMoveVel, 0);
    }
    
    // Coyote time - allow jump shortly after leaving ground
    const isGrounded = (player as any).isGrounded?.();
    if (isGrounded) {
      player.coyoteTime = 0.12;
      
      // Landing effect
      if (!player.wasGrounded) {
        audioEngine.playLand();
        player.stretchFactor = 0.7;
        smoothCamera.addShake(2);
        spawnLandingParticles(player.pos);
      }
    } else {
      player.coyoteTime = Math.max(0, player.coyoteTime - dt());
    }
    player.wasGrounded = isGrounded;
    
    // Jump buffer - remember jump input
    player.jumpBufferTime = Math.max(0, player.jumpBufferTime - dt());
    
    // Smooth stretch factor
    player.stretchFactor += (1 - player.stretchFactor) * 8 * dt();
  });
  
  const tryJump = () => {
    if (!player.canControl) return;
    
    const canJump = player.coyoteTime > 0 || (player as any).isGrounded?.();
    
    if (canJump) {
      player.jump();
      audioEngine.playJump();
      player.coyoteTime = 0;
      player.jumpBufferTime = 0;
      player.stretchFactor = 1.3;
      smoothCamera.addImpulse(vec2(0, -1), 8);
      spawnJumpParticles(player.pos);
    } else {
      // Buffer the jump attempt
      player.jumpBufferTime = 0.1;
    }
  };
  
  onKeyPress("up", tryJump);
  onKeyPress("w", tryJump);
  onKeyPress("space", tryJump);
  
  // Check jump buffer when landing
  onUpdate(() => {
    if (player.jumpBufferTime > 0 && (player as any).isGrounded?.()) {
      tryJump();
    }
  });
  
  // Enhanced bounce boost with visual feedback
  onKeyDown("shift", () => { 
    player.bounceBoost = 1.6;
    player.glowIntensity = 0.5;
  });
  onKeyRelease("shift", () => { 
    player.bounceBoost = 1.0;
    player.glowIntensity = 0;
  });

  // Enhanced Jiggle Physics Interactions
  
  // Bounce Pads - juicier effect
  player.onCollide("bouncePad", (pad: GameObj) => {
    const bounceForce = (pad as any).bounceForce || 900;
    player.jump(bounceForce);
    (pad as any).bouncePhase = Math.PI * 1.5;
    (pad as any).glowIntensity = 1;
    smoothCamera.addShake(6);
    smoothCamera.addImpulse(vec2(0, -1), 15);
    audioEngine.playBounce();
    spawnBounceParticles(player.pos, pad.pos);
  });

  // Jelly Platforms - squish effect
  player.onCollide("jellyPlatform", (plat: GameObj) => {
    const pVel = (player as any).vel || vec2(0, 0);
    if (pVel.y > 50) {
      (plat as any).jiggleOffset = Math.min(pVel.y * 0.03, 15);
      smoothCamera.addShake(1);
    }
  });

  // Elastic Walls - enhanced push back
  player.onCollide("elasticWall", (wall: GameObj) => {
    const pushDir = player.pos.sub(wall.pos).unit();
    const pushForce = (wall as any).pushForce || 500;
    const pVel = (player as any).vel || vec2(0, 0);
    
    // Apply push with velocity consideration
    player.move(pushDir.scale(pushForce * 2 * dt()));
    (wall as any).chargeLevel = 1;
    smoothCamera.addShake(3);
    smoothCamera.addImpulse(pushDir, 10);
    
    // Spawn elastic particles
    for (let p = 0; p < 5; p++) {
      particlePool.spawn(
        wall.pos.add(vec2(rand(-8, 8), rand(-16, 16))),
        color(100, 255, 255),
        pushDir.scale(rand(100, 200)),
        0.4,
        rand(2, 4)
      );
    }
  });

  // Slime Pools - slow movement with bubble particles
  let inSlime = false;
  player.onCollide("slimePool", () => { 
    inSlime = true; 
    if (Math.random() < 0.3) {
      audioEngine.playSlide();
    }
  });
  player.onCollideEnd("slimePool", () => { inSlime = false; });

  // Wave Platforms - store base Y for smooth movement
  get("wavePlatform").forEach((plat: GameObj) => {
    (plat as any).baseY = plat.pos.y;
  });
  
  // Enhanced spike collision with dramatic effect
  player.onCollide("spike", () => {
    audioEngine.playDeath();
    gameState.totalDeaths++;
    saveProgress();
    
    if (player && player.pos) {
      // Dramatic death particles
      spawnDeathParticles(player.pos);
    }
    
    smoothCamera.addShake(15);
    const levelNum = (typeof i === 'number') ? i : 0;
    go("defeat", levelNum);
  });
  
  // Enhanced exit collision with celebration
  player.onCollide("exit", () => {
    const levelTime = time() - levelStartTime;
    gameState.levelCompleted[i] = true;
    
    const isNewRecord = levelTime < gameState.bestTimes[i];
    if (isNewRecord) {
      gameState.bestTimes[i] = levelTime;
    }
    
    saveProgress();
    audioEngine.playSuccess();
    
    // Victory particles
    spawnVictoryParticles(player.pos);
    smoothCamera.addShake(5);
    
    // Show record notification
    if (isNewRecord) {
      add([
        text("🏆 NEW RECORD!", { size: 28 }),
        pos(player.pos.x, player.pos.y - 50),
        anchor("center"),
        color(255, 215, 0),
        z(1000),
        lifespan(1.5),
        { fadeSpeed: 0 }
      ]);
    }
    
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

  // Enhanced Jiggle Physics Update Loop with Smooth Camera
  player.onUpdate(() => {
    if (isPaused) return;
    
    const deltaTime = dt();
    const vel = (player as any).vel || vec2(0, 0);
    
    // Apply slime slowdown with smooth transition
    if (inSlime && (player as any).vel) {
      const slowFactor = 0.7;
      (player as any).vel = vel.scale(slowFactor);
      
      // Spawn slime bubble particles occasionally
      if (Math.random() < 0.1) {
        add([
          circle(rand(2, 5)),
          pos(player.pos.x + rand(-12, 12), player.pos.y + rand(5, 15)),
          color(100, 255, 150),
          opacity(0.6),
          z(8),
          { vel: vec2(rand(-20, 20), rand(-80, -40)), life: rand(0.4, 0.8) },
          "slimeBubble",
        ]).onUpdate(function(this: GameObj) {
          const b = this as any;
          b.life -= deltaTime;
          this.pos.y += b.vel.y * deltaTime;
          this.pos.x += b.vel.x * deltaTime;
          b.vel.y -= 50 * deltaTime; // Float up
          this.opacity = b.life * 0.8;
          if (b.life <= 0) destroy(this);
        });
      }
    }
    
    // Update soft body jiggle with squash/stretch
    player.softBody.update(deltaTime, player.pos, vel);
    player.lastVel = vel;
    
    // Smooth Camera Follow with the enhanced camera system
    smoothCamera.setTarget(player.pos);
    smoothCamera.update(deltaTime);
    
    // Dynamic camera zoom based on speed
    const speedRatio = Math.min(vel.len() / 500, 1);
    const targetZoom = 1 - speedRatio * 0.08; // Zoom out slightly when fast
    smoothCamera.setScale(targetZoom);
    
    // Enhanced particle trail effect with color variation
    const speed = vel.len();
    if (speed > 80) {
      const trailChance = Math.min(0.6, speed / 500);
      if (Math.random() < trailChance) {
        // Main trail particles
        const trailHue = (time() * 50) % 60; // Slight color shift over time
        add([
          circle(rand(2, 5)),
          pos(player.pos.add(vec2(rand(-10, 10), rand(-10, 10)))),
          color(255, 120 + trailHue, 200 + (60 - trailHue)),
          opacity(0.7),
          z(3),
          scale(1),
          { vel: vel.scale(-0.08), life: 0.35, shrinkRate: 2.5 },
          "trailParticle",
        ]).onUpdate(function(this: GameObj) {
          const p = this as any;
          p.life -= deltaTime;
          this.pos = this.pos.add(p.vel.scale(deltaTime));
          p.vel = p.vel.scale(0.92); // Smooth slowdown
          const lifeRatio = Math.max(0, p.life / 0.35);
          this.opacity = ease.outQuad(lifeRatio) * 0.7;
          const shrink = lifeRatio;
          (this as any).scale = vec2(shrink, shrink);
          if (p.life <= 0) destroy(this);
        });
      }
      
      // Sparkle trail for high speed
      if (speed > 200 && Math.random() < 0.15) {
        add([
          circle(rand(1, 2)),
          pos(player.pos.add(vec2(rand(-15, 15), rand(-15, 15)))),
          color(255, 255, 255),
          opacity(1),
          z(4),
          { life: 0.2, twinklePhase: rand(0, Math.PI * 2) },
          "sparkleTrail",
        ]).onUpdate(function(this: GameObj) {
          const s = this as any;
          s.life -= deltaTime * 4;
          s.twinklePhase += deltaTime * 20;
          this.opacity = s.life * (0.5 + Math.sin(s.twinklePhase) * 0.5);
          if (s.life <= 0) destroy(this);
        });
      }
    }
    
    // Update player glow intensity smoothly
    const targetGlow = player.bounceBoost > 1.2 ? 0.6 : 0;
    player.glowIntensity += (targetGlow - player.glowIntensity) * 8 * deltaTime;
  });

  // Enhanced Render jiggle physics soft body with glow and multiple layers
  player.onDraw(() => {
    const vertices = player.softBody.getVertices();
    if (vertices.length < 3) return;
    
    // Outer glow layer (when boosting or moving fast)
    const vel = (player as any).vel || vec2(0, 0);
    const speed = vel.len();
    const glowAmount = Math.max(player.glowIntensity, speed / 800);
    
    if (glowAmount > 0.1) {
      // Multiple glow layers for smooth falloff
      for (let layer = 3; layer >= 1; layer--) {
        const glowScale = 1 + layer * 0.15 * glowAmount;
        const glowVertices = vertices.map(v => v.scale(glowScale));
        drawPolygon({
          pts: glowVertices,
          pos: vec2(0, 0),
          color: rgb(255, 150, 220),
          fill: true,
          opacity: (0.15 / layer) * glowAmount,
        });
      }
    }
    
    // Core body with gradient effect simulation
    drawPolygon({
      pts: vertices,
      pos: vec2(0, 0),
      color: rgb(255, 120, 200),
      fill: true,
    });
    
    // Inner highlight for 3D effect
    const innerVertices = vertices.map(v => v.scale(0.7));
    drawPolygon({
      pts: innerVertices,
      pos: vec2(-2, -2),
      color: rgb(255, 200, 240),
      fill: true,
      opacity: 0.4,
    });
    
    // Outline with variable thickness based on squash
    const outlineThickness = 3 + Math.abs(1 - player.stretchFactor) * 2;
    drawPolygon({
      pts: vertices,
      pos: vec2(0, 0),
      color: rgb(255, 80, 150),
      fill: false,
      opacity: 1,
    });
    
    // Eye/face effect - simple dot for character
    const eyeOffset = vec2(vel.x * 0.02, -4 + vel.y * 0.01);
    drawCircle({
      pos: eyeOffset,
      radius: 4,
      color: rgb(255, 255, 255),
      opacity: 0.9,
    });
    drawCircle({
      pos: eyeOffset.add(vec2(vel.x * 0.01, 0)),
      radius: 2,
      color: rgb(80, 40, 80),
      opacity: 1,
    });
  });

  // Enhanced Animate jiggle physics elements with visual juice
  onUpdate(() => {
    if (isPaused) return;
    const t = time();
    const deltaTime = dt();
    
    // Animate bounce pads with glow and particles
    get("bouncePad").forEach((pad: GameObj) => {
      const p = pad as any;
      const phase = p.bouncePhase || 0;
      const pulsePhase = p.pulsePhase || 0;
      
      // Smooth decay of bounce animation
      p.bouncePhase = Math.max(0, phase - deltaTime * 6);
      p.pulsePhase = pulsePhase + deltaTime * 4;
      p.glowIntensity = Math.max(0, (p.glowIntensity || 0) - deltaTime * 3);
      
      // Scale with elastic bounce
      const bounceScale = phase > 0 ? 1 + ease.bounceOut(phase / Math.PI) * 0.4 : 1;
      const pulseScale = 1 + Math.sin(pulsePhase) * 0.08;
      pad.scale = vec2(bounceScale * pulseScale, bounceScale * pulseScale);
      
      // Color pulse
      const brightness = 180 + Math.sin(pulsePhase * 2) * 40 + p.glowIntensity * 75;
      pad.color = rgb(255, brightness, 50);
    });
    
    // Animate jelly platforms with wobble
    get("jellyPlatform").forEach((plat: GameObj) => {
      const p = plat as any;
      const jiggleSpeed = p.jiggleSpeed || 3;
      const wobblePhase = p.wobblePhase || 0;
      
      // Smooth jiggle decay
      p.jiggleOffset = Math.max(0, (p.jiggleOffset || 0) * (1 - deltaTime * 8));
      p.wobblePhase = wobblePhase + deltaTime * jiggleSpeed;
      
      // Organic wobble movement
      const wobbleY = Math.sin(wobblePhase) * 2 + Math.sin(wobblePhase * 2.3) * 1;
      plat.pos.y += (wobbleY + p.jiggleOffset) * deltaTime * 8;
      
      // Squash and stretch
      const squash = p.jiggleOffset * 0.02;
      const breathe = Math.sin(wobblePhase * 1.5) * 0.06;
      plat.scale = vec2(1 + breathe + squash * 0.5, 1 - breathe - squash);
      
      // Color shimmer
      const shimmer = Math.sin(wobblePhase * 3) * 30;
      plat.color = rgb(180 + shimmer, 100, 255);
    });
    
    // Animate elastic walls with energy pulse
    get("elasticWall").forEach((wall: GameObj) => {
      const w = wall as any;
      const pulsePhase = w.pulsePhase || 0;
      
      w.pulsePhase = pulsePhase + deltaTime * 5;
      w.chargeLevel = Math.max(0, (w.chargeLevel || 0) - deltaTime * 4);
      
      // Stretchy wobble
      const wobbleX = Math.sin(pulsePhase) * 0.08;
      const wobbleY = Math.sin(pulsePhase * 1.3) * 0.05;
      const chargeStretch = w.chargeLevel * 0.3;
      wall.scale = vec2(1 + wobbleX + chargeStretch, 1 + wobbleY);
      
      // Glow effect on charge
      const glow = 200 + Math.sin(pulsePhase * 2) * 55 + w.chargeLevel * 55;
      wall.color = rgb(100, glow, glow);
    });
    
    // Animate slime pools with bubbling effect
    get("slimePool").forEach((pool: GameObj) => {
      const p = pool as any;
      const phase = p.wavePhase || 0;
      
      p.wavePhase = phase + deltaTime * 2.5;
      p.bubbleTimer = (p.bubbleTimer || 0) + deltaTime;
      
      // Opacity wave
      const alpha = 0.5 + Math.sin(phase) * 0.15 + Math.sin(phase * 2.7) * 0.1;
      pool.opacity = alpha;
      
      // Surface ripple scale
      const ripple = 1 + Math.sin(phase * 3) * 0.03;
      pool.scale = vec2(ripple, 1);
      
      // Spawn bubbles occasionally
      if (p.bubbleTimer > 0.3 + Math.random() * 0.5) {
        p.bubbleTimer = 0;
        const bubbleX = pool.pos.x + rand(-14, 14);
        add([
          circle(rand(2, 4)),
          pos(bubbleX, pool.pos.y - 5),
          color(100, 255, 150),
          opacity(0.5),
          z(6),
          { life: rand(0.5, 1), wobblePhase: rand(0, Math.PI * 2) },
          "poolBubble",
        ]).onUpdate(function(this: GameObj) {
          const b = this as any;
          b.life -= deltaTime;
          b.wobblePhase += deltaTime * 8;
          this.pos.y -= 40 * deltaTime;
          this.pos.x += Math.sin(b.wobblePhase) * 15 * deltaTime;
          this.opacity = b.life * 0.5;
          if (b.life <= 0) destroy(this);
        });
      }
    });
    
    // Animate wave platforms with smooth sinusoidal motion
    get("wavePlatform").forEach((plat: GameObj) => {
      const p = plat as any;
      const phase = p.wavePhase || 0;
      const amplitude = p.waveAmplitude || 25;
      
      p.wavePhase = phase + deltaTime * 2.5;
      
      // Smooth wave motion
      const waveOffset = Math.sin(phase) * amplitude;
      const prevWave = Math.sin(phase - deltaTime * 2.5) * amplitude;
      plat.pos.y += (waveOffset - prevWave);
      
      // Tilt based on wave direction
      const waveDir = Math.cos(phase);
      plat.angle = waveDir * 8;
      
      // Color shift based on height
      const heightFactor = (Math.sin(phase) + 1) / 2;
      plat.color = rgb(100 + heightFactor * 50, 180, 255);
    });
    
    // Animate spikes with menacing jiggle
    get("spike").forEach((spike: GameObj) => {
      const s = spike as any;
      const phase = s.jigglePhase || 0;
      
      s.jigglePhase = phase + deltaTime * 6;
      
      // Threatening wobble
      const wobble = Math.sin(phase) * 8 + Math.sin(phase * 2.3) * 4;
      spike.angle = wobble;
      
      // Pulsing scale
      const pulse = 1 + Math.sin(phase * 1.5) * 0.05;
      spike.scale = vec2(pulse, pulse);
      
      // Color pulse for danger feel
      const danger = 200 + Math.sin(phase * 2) * 55;
      spike.color = rgb(255, 60, danger - 100);
    });
    
    // Animate exit with beckoning effect
    get("exit").forEach((exit: GameObj) => {
      const e = exit as any;
      e.glowPhase = (e.glowPhase || 0) + deltaTime * 4;
      
      // Pulsing scale
      const pulse = 1 + Math.sin(e.glowPhase) * 0.15;
      exit.scale = vec2(pulse, pulse);
      
      // Rotating glow
      exit.angle = Math.sin(e.glowPhase * 0.5) * 5;
      
      // Beckoning particles
      if (Math.random() < 0.1) {
        const angle = rand(0, Math.PI * 2);
        const dist = rand(30, 50);
        add([
          circle(rand(2, 4)),
          pos(exit.pos.x + Math.cos(angle) * dist, exit.pos.y + Math.sin(angle) * dist),
          color(100, 240 + rand(0, 15), 140),
          opacity(0.8),
          z(9),
          { life: 0.5, targetX: exit.pos.x, targetY: exit.pos.y },
          "exitParticle",
        ]).onUpdate(function(this: GameObj) {
          const p = this as any;
          p.life -= deltaTime * 2;
          // Move toward exit
          this.pos.x += (p.targetX - this.pos.x) * 4 * deltaTime;
          this.pos.y += (p.targetY - this.pos.y) * 4 * deltaTime;
          this.opacity = p.life * 0.8;
          if (p.life <= 0) destroy(this);
        });
      }
    });
  });

  // Enhanced Update ghosts with jiggle physics and visual effects
  onUpdate(() => {
    if (isPaused) return;
    const deltaTime = dt();
    
    get("jellyClone").forEach((ghost: GameObj) => {
      const g = ghost as any;
      if (g.softBody) {
        const vel = g.vel || vec2(0, 0);
        g.softBody.update(deltaTime, ghost.pos, vel);
        g.lastVel = vel;
        g.glowPhase = (g.glowPhase || 0) + deltaTime * 3;
        
        // Ghost trail particles
        if (Math.random() < 0.2 && vel.len() > 50) {
          add([
            circle(rand(2, 4)),
            pos(ghost.pos.add(vec2(rand(-8, 8), rand(-8, 8)))),
            color(120, 255, 200),
            opacity(0.4),
            z(4),
            { life: 0.25 },
            "ghostTrail",
          ]).onUpdate(function(this: GameObj) {
            const t = this as any;
            t.life -= deltaTime * 4;
            this.opacity = t.life * 0.4;
            if (t.life <= 0) destroy(this);
          });
        }
      }
    });
  });

  // Enhanced Render ghosts with jiggle and ethereal glow
  get("jellyClone").forEach((ghost: GameObj) => {
    ghost.onDraw(() => {
      const g = ghost as any;
      if (!g.softBody) return;
      const vertices = g.softBody.getVertices();
      if (vertices.length < 3) return;
      
      // Ethereal outer glow
      const glowPhase = g.glowPhase || 0;
      const glowPulse = 0.3 + Math.sin(glowPhase) * 0.15;
      
      for (let layer = 2; layer >= 1; layer--) {
        const glowScale = 1 + layer * 0.12;
        const glowVertices = vertices.map(v => v.scale(glowScale));
        drawPolygon({
          pts: glowVertices,
          pos: vec2(0, 0),
          color: rgb(100, 255, 200),
          fill: true,
          opacity: (glowPulse / layer) * 0.3,
        });
      }
      
      // Core body
      drawPolygon({
        pts: vertices,
        pos: vec2(0, 0),
        color: rgb(120, 255, 200),
        fill: true,
        opacity: 0.75,
      });
      
      // Inner highlight
      const innerVertices = vertices.map(v => v.scale(0.65));
      drawPolygon({
        pts: innerVertices,
        pos: vec2(-1, -1),
        color: rgb(180, 255, 230),
        fill: true,
        opacity: 0.3,
      });
      
      // Outline
      drawPolygon({
        pts: vertices,
        pos: vec2(0, 0),
        color: rgb(80, 200, 150),
        fill: false,
        opacity: 0.8,
      });
      
      // Ghost eye
      const vel = g.vel || vec2(0, 0);
      const eyeOffset = vec2(vel.x * 0.015, -3 + vel.y * 0.008);
      drawCircle({
        pos: eyeOffset,
        radius: 3,
        color: rgb(200, 255, 230),
        opacity: 0.8,
      });
    });
  });
});

function startLevel(i: number) {
  if (i >= LEVELS.length) {
    go("victory");
    screenTransition.fadeIn(0.6);
  } else {
    go("game", i);
    screenTransition.fadeIn(0.4);
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
function spawnJiggleParticles(position: Vec2, colorVal: any, count: number) {
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
      colorVal,
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

// Enhanced Jump Particles - burst upward with sparkles
function spawnJumpParticles(position: Vec2) {
  if (!position) return;
  
  // Main jump burst
  for (let i = 0; i < 12; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * 1.2; // Spread downward
    const speed = rand(150, 350);
    const vel = vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);
    
    const particle = add([
      circle(rand(3, 6)),
      pos(position.x + rand(-12, 12), position.y + 10),
      color(255, 120 + rand(0, 80), 200 + rand(0, 55)),
      opacity(1),
      z(90),
      scale(1),
      { vel, life: 0.5, rotSpeed: rand(-10, 10) },
      "jumpParticle",
    ]);
    
    particle.onUpdate(() => {
      const p = particle as any;
      p.vel.y += GRAVITY * dt() * 0.4;
      p.vel = p.vel.scale(0.98); // Smooth drag
      particle.pos = particle.pos.add(p.vel.scale(dt()));
      p.life -= dt() * 2;
      const lifeRatio = Math.max(0, p.life * 2);
      particle.opacity = ease.outQuad(lifeRatio);
      (particle as any).scale = vec2(lifeRatio, lifeRatio);
      if (p.life <= 0) destroy(particle);
    });
  }
  
  // Sparkle ring
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sparkle = add([
      circle(2),
      pos(position.x + Math.cos(angle) * 20, position.y + 5 + Math.sin(angle) * 8),
      color(255, 255, 255),
      opacity(1),
      z(95),
      { life: 0.3, startAngle: angle },
      "sparkle",
    ]);
    
    sparkle.onUpdate(() => {
      const s = sparkle as any;
      s.life -= dt() * 4;
      const expand = 1 + (1 - s.life / 0.3) * 1.5;
      sparkle.pos.x = position.x + Math.cos(s.startAngle) * 20 * expand;
      sparkle.pos.y = position.y + 5 + Math.sin(s.startAngle) * 8 * expand;
      sparkle.opacity = s.life / 0.3;
      if (s.life <= 0) destroy(sparkle);
    });
  }
}

// Landing Particles - impact effect with dust
function spawnLandingParticles(position: Vec2) {
  if (!position) return;
  
  // Impact dust clouds
  for (let i = 0; i < 10; i++) {
    const dir = i < 5 ? -1 : 1;
    const speed = rand(80, 180);
    const particle = add([
      circle(rand(4, 8)),
      pos(position.x + rand(-5, 5), position.y + 12),
      color(180, 160, 140),
      opacity(0.7),
      z(85),
      scale(1),
      { vel: vec2(dir * speed, rand(-30, -80)), life: 0.4 },
      "dustParticle",
    ]);
    
    particle.onUpdate(() => {
      const p = particle as any;
      p.vel.y += GRAVITY * dt() * 0.2;
      p.vel.x *= 0.95;
      particle.pos = particle.pos.add(p.vel.scale(dt()));
      p.life -= dt() * 2.5;
      const lifeRatio = Math.max(0, p.life / 0.4);
      particle.opacity = lifeRatio * 0.7;
      const growScale = 1 + (1 - lifeRatio) * 1.5;
      (particle as any).scale = vec2(growScale, growScale);
      if (p.life <= 0) destroy(particle);
    });
  }
  
  // Impact ring
  const ring = add([
    circle(5),
    pos(position.x, position.y + 14),
    color(255, 255, 255),
    opacity(0.5),
    z(84),
    anchor("center"),
    { life: 0.2 },
    "impactRing",
  ]);
  
  ring.onUpdate(() => {
    const r = ring as any;
    r.life -= dt() * 5;
    const expand = ease.outQuad(1 - r.life / 0.2) * 40 + 5;
    (ring as any).scale = vec2(expand / 5, 0.3);
    ring.opacity = r.life / 0.2 * 0.5;
    if (r.life <= 0) destroy(ring);
  });
}

// Death Particles - dramatic explosion
function spawnDeathParticles(position: Vec2) {
  if (!position) return;
  
  // Main explosion burst
  for (let i = 0; i < 30; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(200, 500);
    const particle = add([
      circle(rand(4, 10)),
      pos(position.x, position.y),
      color(255, rand(50, 150), rand(50, 100)),
      opacity(1),
      z(150),
      scale(1),
      { 
        vel: vec2(Math.cos(angle) * speed, Math.sin(angle) * speed), 
        life: rand(0.6, 1.2),
        rotPhase: rand(0, Math.PI * 2),
        drag: rand(0.96, 0.99)
      },
      "deathParticle",
    ]);
    
    particle.onUpdate(() => {
      const p = particle as any;
      p.vel.y += GRAVITY * dt() * 0.6;
      p.vel = p.vel.scale(p.drag);
      particle.pos = particle.pos.add(p.vel.scale(dt()));
      p.life -= dt();
      p.rotPhase += dt() * 8;
      const lifeRatio = Math.max(0, p.life);
      particle.opacity = ease.outQuad(lifeRatio);
      const pulse = 1 + Math.sin(p.rotPhase) * 0.2;
      (particle as any).scale = vec2(lifeRatio * pulse, lifeRatio * pulse);
      if (p.life <= 0) destroy(particle);
    });
  }
  
  // Shockwave rings
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.1;
    loop(delay + 0.01, () => {
      const ring = add([
        circle(10),
        pos(position.x, position.y),
        color(255, 100, 50),
        opacity(0.8),
        z(145),
        anchor("center"),
        { life: 0.4, maxRadius: 80 + i * 30 },
        "shockwave",
      ]);
      
      ring.onUpdate(() => {
        const r = ring as any;
        r.life -= dt() * 2.5;
        const expand = ease.outQuad(1 - r.life / 0.4) * r.maxRadius + 10;
        (ring as any).scale = vec2(expand / 10, expand / 10);
        ring.opacity = (r.life / 0.4) * 0.8;
        if (r.life <= 0) destroy(ring);
      });
    });
  }
  
  // Glitch rectangles
  for (let i = 0; i < 8; i++) {
    const glitch = add([
      rect(rand(20, 60), rand(3, 8)),
      pos(position.x + rand(-50, 50), position.y + rand(-50, 50)),
      color(255, 0, rand(100, 200)),
      opacity(0.8),
      z(160),
      { life: 0.2 + rand(0, 0.2), flickerPhase: 0 },
      "glitchRect",
    ]);
    
    glitch.onUpdate(() => {
      const g = glitch as any;
      g.life -= dt() * 3;
      g.flickerPhase += dt() * 30;
      glitch.opacity = (g.life > 0 ? 1 : 0) * (Math.sin(g.flickerPhase) > 0 ? 0.8 : 0.2);
      glitch.pos.x += rand(-100, 100) * dt();
      if (g.life <= 0) destroy(glitch);
    });
  }
}

// Victory Particles - celebration burst
function spawnVictoryParticles(position: Vec2) {
  if (!position) return;
  
  const colors = [
    rgb(0, 255, 255),
    rgb(255, 0, 255),
    rgb(255, 255, 0),
    rgb(0, 255, 100),
    rgb(255, 150, 0),
  ];
  
  // Confetti burst
  for (let i = 0; i < 40; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(250, 450);
    const particleColor = colors[Math.floor(rand(0, colors.length))];
    
    const confetti = add([
      rect(rand(6, 12), rand(3, 6)),
      pos(position.x, position.y),
      particleColor,
      opacity(1),
      z(200),
      rotate(rand(0, 360)),
      anchor("center"),
      { 
        vel: vec2(Math.cos(angle) * speed, Math.sin(angle) * speed - 200), 
        life: rand(1.5, 2.5),
        rotSpeed: rand(-500, 500),
        flutter: rand(2, 5)
      },
      "confetti",
    ]);
    
    confetti.onUpdate(() => {
      const c = confetti as any;
      c.vel.y += GRAVITY * dt() * 0.4;
      c.vel.x += Math.sin(time() * c.flutter) * 50 * dt(); // Flutter
      c.vel = c.vel.scale(0.995);
      confetti.pos = confetti.pos.add(c.vel.scale(dt()));
      confetti.angle += c.rotSpeed * dt();
      c.life -= dt();
      confetti.opacity = Math.min(1, c.life);
      if (c.life <= 0) destroy(confetti);
    });
  }
  
  // Star burst
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const star = add([
      circle(6),
      pos(position.x, position.y),
      color(255, 255, 100),
      opacity(1),
      z(205),
      anchor("center"),
      { angle, speed: 300, life: 0.6 },
      "victoryStar",
    ]);
    
    star.onUpdate(() => {
      const s = star as any;
      s.life -= dt() * 1.5;
      const dist = (1 - s.life / 0.6) * 150;
      star.pos.x = position.x + Math.cos(s.angle) * dist;
      star.pos.y = position.y + Math.sin(s.angle) * dist;
      star.opacity = s.life / 0.6;
      const shrink = s.life / 0.6;
      (star as any).scale = vec2(shrink, shrink);
      if (s.life <= 0) destroy(star);
    });
  }
}

// Bounce Particles - spring effect
function spawnBounceParticles(playerPos: Vec2, padPos: Vec2) {
  if (!playerPos || !padPos) return;
  
  // Circular burst from pad
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const particle = add([
      circle(rand(3, 6)),
      pos(padPos.x, padPos.y - 10),
      color(255, 180 + rand(0, 75), 50),
      opacity(1),
      z(95),
      { 
        vel: vec2(Math.cos(angle) * rand(100, 200), Math.sin(angle) * rand(100, 200) - 150), 
        life: 0.5 
      },
      "bounceParticle",
    ]);
    
    particle.onUpdate(() => {
      const p = particle as any;
      p.vel.y += GRAVITY * dt() * 0.3;
      particle.pos = particle.pos.add(p.vel.scale(dt()));
      p.life -= dt() * 2;
      particle.opacity = ease.outQuad(Math.max(0, p.life * 2));
      if (p.life <= 0) destroy(particle);
    });
  }
  
  // Energy arc trail from pad to player
  const arcPoints = 8;
  for (let i = 0; i < arcPoints; i++) {
    const t = i / arcPoints;
    const arcX = padPos.x + (playerPos.x - padPos.x) * t;
    const arcY = padPos.y + (playerPos.y - padPos.y) * t - Math.sin(t * Math.PI) * 40;
    
    const arcParticle = add([
      circle(4 - t * 3),
      pos(arcX, arcY),
      color(255, 220, 100),
      opacity(1 - t * 0.5),
      z(94),
      { life: 0.3 + t * 0.2 },
      "arcParticle",
    ]);
    
    arcParticle.onUpdate(() => {
      const a = arcParticle as any;
      a.life -= dt() * 3;
      arcParticle.opacity = a.life;
      if (a.life <= 0) destroy(arcParticle);
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
