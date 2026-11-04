import type { Sfx } from '../game/ops';

const PROGRESSIONS = [
  [
    [53, 57, 60, 64],
    [50, 53, 57, 60],
    [55, 58, 62, 65],
    [48, 52, 55, 58],
  ],
  [
    [58, 62, 65, 69],
    [57, 60, 64, 67],
    [55, 58, 62, 65],
    [48, 52, 55, 58, 62],
  ],
];
const PENTA = [0, 2, 4, 7, 9];

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfxBus!: GainNode;
  ambience!: GainNode;
  filter!: BiquadFilterNode;
  reverb!: ConvolverNode;
  wet!: GainNode;
  private nextBeat = 0;
  private beat = 0;
  private hum: AudioBufferSourceNode | null = null;
  volume = { master: 0.8, music: 0.55, sfx: 0.8 };
  decay = 0;
  inCeiling = false;
  night = false;
  muted = false;

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 6000;
    this.filter.Q.value = 0.6;
    this.filter.connect(this.master);
    this.music = ctx.createGain();
    this.music.connect(this.filter);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.35;
    this.music.connect(this.reverb);
    this.reverb.connect(this.wet);
    this.wet.connect(this.filter);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0;
    this.ambience.connect(this.master);
    this.startHum();
    this.applyVolume();
    this.nextBeat = ctx.currentTime + 0.1;
    window.setInterval(() => this.schedule(), 50);
  }

  applyVolume() {
    if (!this.ctx) return;
    const m = this.muted ? 0 : this.volume.master;
    this.master.gain.setTargetAtTime(m, this.ctx.currentTime, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volume.sfx, this.ctx.currentTime, 0.05);
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  private startHum() {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    src.connect(lp);
    lp.connect(this.ambience);
    src.start();
    this.hum = src;
  }

  setScene(opts: { inCeiling: boolean; night: boolean; decay: number; open: boolean }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.inCeiling = opts.inCeiling;
    this.night = opts.night;
    this.decay = opts.decay;
    this.filter.frequency.setTargetAtTime(opts.inCeiling ? 520 : 7000, t, 0.25);
    this.wet.gain.setTargetAtTime(0.3 + opts.decay * 0.5, t, 0.5);
    const musicLevel = opts.open ? (opts.inCeiling ? 0.95 : 0.55) : opts.night ? 0 : 0.22;
    this.music.gain.setTargetAtTime(musicLevel * this.volume.music, t, 0.8);
    this.ambience.gain.setTargetAtTime(opts.night ? (opts.inCeiling ? 0.12 : 0.07) : opts.inCeiling ? 0.05 : 0.02, t, 0.8);
    if (this.hum) this.hum.playbackRate.setTargetAtTime(opts.inCeiling ? 0.8 : 1, t, 0.5);
  }

  private schedule() {
    const ctx = this.ctx!;
    const tempo = 78 - this.decay * 16;
    const spb = 60 / tempo / 2;
    while (this.nextBeat < ctx.currentTime + 0.25) {
      this.playStep(this.beat, this.nextBeat, spb);
      this.nextBeat += spb;
      this.beat++;
    }
  }

  private detune() {
    return Math.pow(2, (-this.decay * 1.6) / 12);
  }

  private playStep(step: number, time: number, spb: number) {
    if (this.music.gain.value < 0.005) return;
    const bar = Math.floor(step / 8);
    const prog = PROGRESSIONS[Math.floor(bar / 4) % PROGRESSIONS.length];
    const chord = prog[bar % 4];
    const pos = step % 8;
    const dt = this.detune();
    if (pos === 0) chord.forEach((n, i) => this.ep(midi(n) * dt, time + i * 0.012, spb * 7.5, 0.05));
    if (pos === 5 && Math.random() < 0.6) chord.slice(1).forEach((n) => this.ep(midi(n) * dt, time, spb * 2, 0.03));
    if (pos === 0 || pos === 4 || (pos === 6 && Math.random() < 0.4)) {
      const root = chord[0] - 12 + (pos === 4 ? 7 : 0);
      this.bass(midi(root) * dt, time, spb * 1.8);
    }
    if (pos % 2 === 1) this.shaker(time, pos === 3 || pos === 7 ? 0.035 : 0.018);
    if (Math.random() < 0.28 && pos !== 0) {
      const base = chord[0] + 12;
      const n = base + PENTA[Math.floor(Math.random() * PENTA.length)] + (Math.random() < 0.3 ? 12 : 0);
      this.vibe(midi(n) * dt, time, spb * 3);
    }
  }

  private ep(freq: number, time: number, dur: number, gain: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const mod = ctx.createGain();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    o2.type = 'sine';
    o2.frequency.value = freq * 2.001;
    mod.gain.value = freq * 0.9;
    o2.connect(mod);
    mod.connect(o.frequency);
    mod.gain.setValueAtTime(freq * 0.9, time);
    mod.gain.exponentialRampToValueAtTime(freq * 0.05, time + 0.6);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
    o.connect(g);
    g.connect(this.music);
    o.start(time);
    o2.start(time);
    o.stop(time + dur + 0.05);
    o2.stop(time + dur + 0.05);
  }

  private bass(freq: number, time: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.09, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    o.connect(g);
    g.connect(this.music);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  private vibe(freq: number, time: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const trem = ctx.createOscillator();
    const tg = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    trem.frequency.value = 5.5;
    tg.gain.value = 0.012;
    trem.connect(tg);
    tg.connect(g.gain);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.035, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, time + dur);
    o.connect(g);
    g.connect(this.music);
    o.start(time);
    trem.start(time);
    o.stop(time + dur + 0.05);
    trem.stop(time + dur + 0.05);
  }

  private noiseBuf: AudioBuffer | null = null;
  private noise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  private shaker(time: number, gain: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0005, time + 0.06);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.music);
    src.start(time);
    src.stop(time + 0.08);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slide?: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(dur: number, freq: number, gain: number, delay = 0) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  play(name: Sfx) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'chime':
        this.tone(midi(76), 1.2, 'sine', 0.12);
        this.tone(midi(72), 1.6, 'sine', 0.12, 0.38);
        this.tone(midi(67), 1.8, 'sine', 0.1, 0.76);
        break;
      case 'coin':
        this.tone(1568, 0.08, 'square', 0.04);
        this.tone(2093, 0.25, 'square', 0.04, 0.07);
        break;
      case 'cash':
        this.burst(0.12, 3000, 0.12);
        this.tone(2637, 0.4, 'triangle', 0.08, 0.08);
        this.tone(3136, 0.5, 'triangle', 0.06, 0.12);
        break;
      case 'build':
        this.burst(0.08, 400, 0.25);
        this.tone(110, 0.12, 'sine', 0.2);
        break;
      case 'demolish':
        this.burst(0.25, 800, 0.2);
        this.tone(180, 0.2, 'sawtooth', 0.05, 0, 60);
        break;
      case 'alert':
        this.tone(880, 0.18, 'square', 0.05);
        this.tone(660, 0.3, 'square', 0.05, 0.2);
        break;
      case 'spotted':
        this.tone(1200, 0.1, 'square', 0.07);
        this.tone(1200, 0.1, 'square', 0.07, 0.15);
        this.tone(1600, 0.25, 'square', 0.07, 0.3);
        break;
      case 'caught':
        this.tone(392, 0.4, 'sawtooth', 0.07);
        this.tone(311, 0.4, 'sawtooth', 0.07, 0.35);
        this.tone(262, 0.9, 'sawtooth', 0.07, 0.7);
        break;
      case 'escape':
        this.tone(523, 0.12, 'triangle', 0.08);
        this.tone(784, 0.3, 'triangle', 0.08, 0.1);
        break;
      case 'click':
        this.tone(1800, 0.03, 'square', 0.025);
        break;
      case 'phone':
        for (let i = 0; i < 3; i++) this.tone(1318, 0.07, 'square', 0.035, i * 0.12);
        break;
      case 'squeak':
        this.tone(1800, 0.15, 'sine', 0.08, 0, 2600);
        this.tone(2200, 0.2, 'sine', 0.07, 0.18, 1500);
        break;
      case 'bad':
        this.tone(220, 0.5, 'triangle', 0.1, 0, 140);
        break;
      case 'good':
        this.tone(659, 0.15, 'triangle', 0.07);
        this.tone(784, 0.15, 'triangle', 0.07, 0.1);
        this.tone(1047, 0.35, 'triangle', 0.07, 0.2);
        break;
      case 'levelup':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'square', 0.045, i * 0.09));
        this.tone(1047, 0.8, 'square', 0.05, 0.3);
        this.tone(784, 0.8, 'triangle', 0.06, 0.3);
        this.tone(659, 0.8, 'triangle', 0.05, 0.3);
        this.burst(0.35, 6000, 0.04, 0.3);
        [2093, 2637, 3136, 4186].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.03, 0.5 + i * 0.07));
        break;
      case 'climb':
        this.burst(0.05, 1200, 0.1);
        this.burst(0.05, 1000, 0.1, 0.12);
        break;
      case 'huh':
        this.tone(300, 0.25, 'sine', 0.06, 0, 420);
        break;
    }
  }
}

export const audio = new AudioEngine();
