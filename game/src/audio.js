// All sound is synthesized with WebAudio: engine hum, police siren,
// gunshots, reload clicks, mission jingles and a soft ambient pad. No audio
// file is shipped. The context is created on the first user gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let ambientNodes = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);

    // Engine: two detuned saws through a lowpass, pitch follows speed.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 28;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();

    // Siren: a sine whose pitch wobbles between two tones.
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'sine';
    sirenOsc.frequency.value = 780;
    sirenLfo = ctx.createOscillator();
    sirenLfo.type = 'square';
    sirenLfo.frequency.value = 1.4;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    sirenLfo.connect(lfoGain);
    lfoGain.connect(sirenOsc.frequency);
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    sirenLfo.start();
    return true;
  }

  function noiseBuffer(seconds = 1) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(freq, seconds, type = 'triangle', volume = 0.4, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  return {
    // Call from any user gesture so the context is allowed to start.
    unlock() {
      if (ensure() && !ambientNodes) {
        // Ambient pad: two slow detuned triangles with a breathing gain.
        const o1 = ctx.createOscillator();
        o1.type = 'triangle';
        o1.frequency.value = 110;
        const o2 = ctx.createOscillator();
        o2.type = 'triangle';
        o2.frequency.value = 164.8;
        const padGain = ctx.createGain();
        padGain.gain.value = 0.05;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.025;
        lfo.connect(lfoGain);
        lfoGain.connect(padGain.gain);
        o1.connect(padGain);
        o2.connect(padGain);
        padGain.connect(master);
        o1.start();
        o2.start();
        lfo.start();
        ambientNodes = { o1, o2, lfo };
      }
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    // speed01: 0..1 of top speed. Sets engine pitch and volume.
    setEngine(speed01, throttle) {
      if (!ctx || !engineGain) return;
      const f = 52 + speed01 * 130;
      engineOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.08);
      engineOsc2.frequency.setTargetAtTime(f / 2, ctx.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(320 + speed01 * 900, ctx.currentTime, 0.1);
      const target = throttle ? 0.05 + speed01 * 0.09 : 0.02;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
    },
    setSiren(on) {
      if (!ctx || !sirenGain) return;
      sirenGain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.2);
    },
    shot() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.25);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900;
      band.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      src.connect(band);
      band.connect(gain);
      gain.connect(master);
      src.start(t);
      src.stop(t + 0.2);
      blip(140, 0.1, 'square', 0.25);
    },
    // Low thump for a police ram: filtered noise plus a low sine.
    thud() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.2);
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 180;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      src.connect(low);
      low.connect(gain);
      gain.connect(master);
      src.start(t);
      src.stop(t + 0.2);
      blip(70, 0.15, 'sine', 0.5);
    },
    reload() {
      blip(500, 0.06, 'square', 0.2);
      blip(700, 0.06, 'square', 0.2, 0.18);
    },
    click() {
      blip(880, 0.05, 'triangle', 0.25);
    },
    bust() {
      blip(220, 0.35, 'sawtooth', 0.3);
      blip(165, 0.5, 'sawtooth', 0.3, 0.3);
    },
    jingle() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => blip(f, 0.22, 'triangle', 0.35, i * 0.11));
    },
    update() {
      // Engine and siren are driven by setEngine/setSiren each frame.
    },
  };
}
