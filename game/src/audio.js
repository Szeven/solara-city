// Synthesized WebAudio sound for Solara City. Nothing is loaded from disk:
// engine hum, sirens, gunfire and UI blips are all oscillators and noise.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.ready = false;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (this.ready) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.buildEngine();
      this.buildSiren();
      this.ready = true;
      return true;
    } catch (err) {
      return false;
    }
  }

  buildEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 28;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter);
    this.engineOsc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    this.engineOsc2.start();
  }

  buildSiren() {
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 720;
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.type = 'square';
    this.sirenLfo.frequency.value = 0.9;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    this.sirenLfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.sirenLfo.start();
  }

  // speed01: 0..1, on: whether the player is driving.
  setEngine(speed01, on) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const target = on ? 0.05 + speed01 * 0.11 : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(52 + speed01 * 165, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(26 + speed01 * 80, t, 0.1);
  }

  setSiren(on) {
    if (!this.ready) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
  }

  noiseBurst(duration, volume, filterFreq) {
    if (!this.ready) return;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  blip(freq, duration, volume, type = 'sine') {
    if (!this.ready) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  shot() {
    this.noiseBurst(0.16, 0.5, 2400);
    this.blip(140, 0.1, 0.25, 'square');
  }

  pickup() {
    this.blip(660, 0.09, 0.22);
    setTimeout(() => this.blip(990, 0.12, 0.22), 80);
  }

  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.16, 0.22), i * 110);
    });
  }

  busted() {
    [392, 330, 262].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.22, 0.2, 'triangle'), i * 160);
    });
  }

  click() {
    this.blip(880, 0.05, 0.15);
  }

  // Short horn honk, used when traffic is cut off.
  horn() {
    this.blip(370, 0.18, 0.16, 'square');
    setTimeout(() => this.blip(466, 0.18, 0.16, 'square'), 30);
  }

  setMuted(muted) {
    if (!this.ready) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }
}
