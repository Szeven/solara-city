// Solara City — all sound is synthesized with WebAudio.
// No audio files ship with the game.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOn = false;
    this.sirenNodes = null;
    this.musicTimer = null;
  }

  // Must be called from a user gesture (click / key) the first time.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startMusic();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // A short filtered noise burst (gunshot, thud, pickup blip base).
  burst(freq, dur, vol, type = 'square') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.3), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  click() {
    this.burst(880, 0.06, 0.12, 'sine');
  }

  gunshot() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    // Crack: white noise through a high-pass, very short.
    const len = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(gain);
    gain.connect(this.master);
    src.start(t);
    this.burst(160, 0.1, 0.25);
  }

  pickup() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.3);
    });
  }

  thud() {
    this.burst(90, 0.25, 0.4, 'sine');
  }

  busted() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [392, 311, 233].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.3, t + i * 0.25 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.4);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t + i * 0.25);
      osc.stop(t + i * 0.25 + 0.45);
    });
  }

  // A looping engine hum whose pitch follows speed. Call every frame.
  engine(speedRatio, inCar) {
    if (!this.ctx) return;
    if (!inCar || speedRatio < 0.02) {
      if (this.engineOsc) {
        try { this.engineOsc.stop(); } catch (e) { /* already stopped */ }
        this.engineOsc = null;
        this.engineGain = null;
      }
      return;
    }
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.04;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    this.engineOsc.frequency.value = 60 + speedRatio * 160;
    this.engineGain.gain.value = 0.03 + speedRatio * 0.05;
  }

  // Two-tone police siren while wanted >= 1.
  siren(on) {
    if (!this.ctx) return;
    if (on === this.sirenOn) return;
    this.sirenOn = on;
    if (!on) {
      if (this.sirenNodes) {
        try { this.sirenNodes.osc.stop(); } catch (e) { /* already stopped */ }
        this.sirenNodes = null;
      }
      return;
    }
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 0.7;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.frequency.value = 950;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.sirenNodes = { osc, lfo };
  }

  // A slow, mellow synth pad loop for the title and free roam.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const notes = [220, 261.63, 329.63, 392, 440, 329.63, 261.63, 196];
    let i = 0;
    const playNote = () => {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i % notes.length];
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 1.7);
      i++;
    };
    this.musicTimer = window.setInterval(playNote, 900);
  }
}
