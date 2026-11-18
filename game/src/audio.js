// All sound is synthesized with WebAudio — no audio files, no network.
// Engine hum, a two-tone siren, gunshots, pickup chimes, a mission jingle and a
// laid-back synth loop for the city. Everything starts on the first user gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let musicTimer = null;
  let sirenHigh = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      // Engine: two detuned saws through a lowpass, pitch following speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 55.7;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(lp);
      engineOsc2.connect(lp);
      lp.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();
      // Siren: one triangle that alternates between two notes.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type = 'sine', vol = 0.25, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, freq = 1200) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
  }

  // A slow sunset loop: Am7, F, C, G pads with a soft bass and a hat tick.
  const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [196, 246.9, 293.7]];
  function startMusic() {
    let step = 0;
    const tick = () => {
      if (!ctx || muted) return;
      const chord = CHORDS[Math.floor(step / 4) % 4];
      const note = chord[step % 3];
      blip(note * 2, 0.5, 'triangle', 0.1);
      if (step % 2 === 0) blip(note / 2, 0.7, 'sine', 0.16);
      if (step % 4 === 2) noiseBurst(0.05, 0.03, 6000);
      step += 1;
    };
    musicTimer = window.setInterval(tick, 300);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    engine(speed01, driving) {
      if (!ctx || muted) return;
      const target = driving ? 0.05 + speed01 * 0.11 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 90, ctx.currentTime, 0.1);
      engineOsc2.frequency.setTargetAtTime(55.7 + speed01 * 90, ctx.currentTime, 0.1);
    },
    siren(on) {
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.2);
      if (on) {
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 880 : 660, ctx.currentTime, 0.45);
      }
    },
    shot() {
      noiseBurst(0.14, 0.5, 2400);
      blip(160, 0.08, 'square', 0.2);
    },
    pickup() {
      blip(660, 0.12);
      blip(990, 0.2, 'sine', 0.25, 0.09);
    },
    mission() {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.25, 'triangle', 0.22, i * 0.11));
    },
    fail() {
      [330, 262, 196].forEach((f, i) => blip(f, 0.3, 'sawtooth', 0.14, i * 0.14));
    },
    crash() {
      noiseBurst(0.25, 0.4, 500);
    },
    click() {
      blip(880, 0.05, 'square', 0.12);
    },
  };
}
