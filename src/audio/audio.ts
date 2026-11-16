/**
 * Procedural Web Audio for Nova's Moon Mission.
 * One module for React + Phaser. No downloaded sound files.
 *
 * Unlock after the first user gesture (Start mission). Master default 0.5.
 * SFX stay within ~6 dB of the ambient bed. Rate-limited to 4 plays / second / id.
 */

export type SfxId =
  | "uiClick"
  | "uiHover"
  | "toggleOn"
  | "toggleOff"
  | "success"
  | "resourceUp"
  | "resourceDown"
  | "powerHum"
  | "waterTrickle"
  | "airHiss"
  | "plantSparkle"
  | "footstep"
  | "door"
  | "typewriter"
  | "stormAlert"
  | "stormHit"
  | "shelterClose"
  | "dayStart"
  | "dayEnd"
  | "missionSuccess"
  | "missionFail";

const MUTE_KEY = "nova-mute";
const MASTER_DEFAULT = 0.72;
/** Ambient bed gain (pre-master). Soft pad under everything. */
const AMBIENT_GAIN = 0.18;
/** Loudest SFX relative to ambient: +6 dB ≈ ×2. */
const SFX_CEILING = AMBIENT_GAIN * 2;
const MAX_PER_SEC = 4;
const WINDOW_MS = 1000;

type PlayOpts = { when?: number };

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* */
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private unlocked = false;
  private muted = loadMuted();
  private masterVol = MASTER_DEFAULT;
  private ducked = false;
  private hidden = false;
  private ambientNodes: { stop: () => void } | null = null;
  private recent: Map<SfxId, number[]> = new Map();
  private listeners = new Set<() => void>();
  private visibilityBound = false;

  /** Subscribe to mute / unlock changes (for React mute button). */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  isUnlocked() {
    return this.unlocked;
  }

  isMuted() {
    return this.muted;
  }

  getMasterVolume() {
    return this.masterVol;
  }

  /**
   * Call from the first user gesture (Start mission / Got it).
   * Creates AudioContext and starts the quiet ambient pad.
   */
  unlock(): void {
    if (typeof window === "undefined") return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this.unlocked = true;
    this.bindVisibility();
    this.applyGains();
    this.startAmbient();
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveMuted(muted);
    this.applyGains();
    if (!muted && this.unlocked) {
      void this.ctx?.resume();
      this.startAmbient();
    } else if (muted) {
      this.stopAmbient();
    }
    this.emit();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMasterVolume(v: number): void {
    this.masterVol = clamp01(v);
    this.applyGains();
  }

  /** Lower music bed while Read aloud is speaking. */
  setSpeechDuck(on: boolean): void {
    this.ducked = on;
    this.applyGains();
  }

  play(id: SfxId, _opts?: PlayOpts): void {
    if (!this.unlocked || this.muted || this.hidden) return;
    if (!this.allow(id)) return;
    this.ensureCtx();
    if (!this.ctx || !this.sfxBus) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();

    const g = this.gainFor(id);
    const t0 = this.ctx.currentTime + 0.001;
    switch (id) {
      case "uiClick":
        this.blip(t0, 720, 0.05, g * 0.7, "sine");
        break;
      case "uiHover":
        this.blip(t0, 980, 0.03, g * 0.35, "sine");
        break;
      case "toggleOn":
        this.blip(t0, 440, 0.06, g * 0.65, "triangle");
        this.blip(t0 + 0.05, 660, 0.07, g * 0.55, "triangle");
        break;
      case "toggleOff":
        this.blip(t0, 520, 0.05, g * 0.5, "triangle");
        this.blip(t0 + 0.05, 360, 0.07, g * 0.4, "triangle");
        break;
      case "success":
        this.chime(t0, [523, 659, 784], g * 0.7);
        break;
      case "resourceUp":
        this.blip(t0, 600, 0.06, g * 0.55, "sine");
        this.blip(t0 + 0.04, 800, 0.07, g * 0.45, "sine");
        break;
      case "resourceDown":
        this.blip(t0, 400, 0.07, g * 0.5, "sine");
        this.blip(t0 + 0.05, 280, 0.09, g * 0.4, "sine");
        break;
      case "powerHum":
        this.hum(t0, 90, 0.35, g * 0.55);
        break;
      case "waterTrickle":
        this.noiseBurst(t0, 0.22, g * 0.4, 1800, 0.3);
        break;
      case "airHiss":
        this.noiseBurst(t0, 0.28, g * 0.35, 3200, 0.55);
        break;
      case "plantSparkle":
        this.chime(t0, [880, 1320], g * 0.45);
        break;
      case "footstep":
        this.noiseBurst(t0, 0.045, g * 0.28, 400, 0.15);
        break;
      case "door":
        this.blip(t0, 180, 0.08, g * 0.5, "square");
        this.noiseBurst(t0 + 0.02, 0.1, g * 0.25, 600, 0.2);
        break;
      case "typewriter":
        this.noiseBurst(t0, 0.018, g * 0.22, 2500, 0.4);
        break;
      case "stormAlert":
        this.pulseTone(t0, 320, 0.9, g * 0.5);
        break;
      case "stormHit":
        this.rumble(t0, 1.1, g * 0.65);
        break;
      case "shelterClose":
        this.blip(t0, 140, 0.12, g * 0.55, "triangle");
        this.noiseBurst(t0 + 0.05, 0.15, g * 0.3, 500, 0.2);
        break;
      case "dayStart":
        this.chime(t0, [392, 523, 659], g * 0.6);
        break;
      case "dayEnd":
        this.chime(t0, [523, 440, 349], g * 0.55);
        break;
      case "missionSuccess":
        this.chime(t0, [392, 523, 659, 784, 988], g * 0.75);
        break;
      case "missionFail":
        this.blip(t0, 300, 0.2, g * 0.55, "sawtooth");
        this.blip(t0 + 0.18, 220, 0.28, g * 0.5, "sawtooth");
        break;
      default:
        break;
    }
  }

  private gainFor(id: SfxId): number {
    // Relative to ambient; never exceed SFX_CEILING.
    const table: Record<SfxId, number> = {
      uiClick: 0.55,
      uiHover: 0.35,
      toggleOn: 0.65,
      toggleOff: 0.55,
      success: 0.85,
      resourceUp: 0.6,
      resourceDown: 0.55,
      powerHum: 0.7,
      waterTrickle: 0.6,
      airHiss: 0.55,
      plantSparkle: 0.55,
      footstep: 0.4,
      door: 0.65,
      typewriter: 0.3,
      stormAlert: 0.7,
      stormHit: 0.95,
      shelterClose: 0.7,
      dayStart: 0.8,
      dayEnd: 0.75,
      missionSuccess: 1,
      missionFail: 0.9,
    };
    return Math.min(SFX_CEILING, AMBIENT_GAIN * (table[id] ?? 0.6) * 2);
  }

  private allow(id: SfxId): boolean {
    const now = performance.now();
    const list = this.recent.get(id) ?? [];
    const fresh = list.filter((t) => now - t < WINDOW_MS);
    if (fresh.length >= MAX_PER_SEC) {
      this.recent.set(id, fresh);
      return false;
    }
    fresh.push(now);
    this.recent.set(id, fresh);
    return true;
  }

  private ensureCtx() {
    if (this.ctx) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyGains();
  }

  private applyGains() {
    if (!this.master || !this.musicBus || !this.sfxBus) return;
    const silent = this.muted || this.hidden || !this.unlocked;
    this.master.gain.value = silent ? 0 : this.masterVol;
    this.musicBus.gain.value = this.ducked ? 0.28 : 1;
    this.sfxBus.gain.value = 1;
  }

  private bindVisibility() {
    if (this.visibilityBound || typeof document === "undefined") return;
    this.visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.hidden;
      this.applyGains();
      if (document.hidden) {
        void this.ctx?.suspend();
      } else if (this.unlocked && !this.muted) {
        void this.ctx?.resume();
        this.startAmbient();
      }
    });
  }

  private startAmbient() {
    if (!this.ctx || !this.musicBus || this.muted || this.hidden) return;
    if (this.ambientNodes) return;
    const ctx = this.ctx;
    const bus = this.musicBus;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 480;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = AMBIENT_GAIN;

    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 110;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 164.5;
    const o3 = ctx.createOscillator();
    o3.type = "triangle";
    o3.frequency.value = 55;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    o1.connect(filter);
    o2.connect(filter);
    o3.connect(filter);
    filter.connect(gain);
    gain.connect(bus);

    const t = ctx.currentTime;
    o1.start(t);
    o2.start(t);
    o3.start(t);
    lfo.start(t);

    this.ambientNodes = {
      stop: () => {
        try {
          o1.stop();
          o2.stop();
          o3.stop();
          lfo.stop();
        } catch {
          /* */
        }
        try {
          gain.disconnect();
          filter.disconnect();
        } catch {
          /* */
        }
      },
    };
  }

  private stopAmbient() {
    this.ambientNodes?.stop();
    this.ambientNodes = null;
  }

  private blip(
    t0: number,
    freq: number,
    dur: number,
    gain: number,
    type: OscillatorType,
  ) {
    if (!this.ctx || !this.sfxBus) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private chime(t0: number, freqs: number[], gain: number) {
    freqs.forEach((f, i) => {
      this.blip(t0 + i * 0.09, f, 0.22, gain * (1 - i * 0.08), "sine");
    });
  }

  private hum(t0: number, freq: number, dur: number, gain: number) {
    if (!this.ctx || !this.sfxBus) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private pulseTone(t0: number, freq: number, dur: number, gain: number) {
    if (!this.ctx || !this.sfxBus) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const a = t0 + (i / steps) * dur;
      g.gain.exponentialRampToValueAtTime(gain * 0.85, a + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0002, a + dur / steps - 0.02);
    }
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private rumble(t0: number, dur: number, gain: number) {
    if (!this.ctx || !this.sfxBus) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  private noiseBurst(
    t0: number,
    dur: number,
    gain: number,
    cutoff: number,
    q: number,
  ) {
    if (!this.ctx || !this.sfxBus) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, Math.max(1, bufferSize), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }
}

/** Shared singleton used by React UI and Phaser scenes. */
export const audio = new AudioEngine();
