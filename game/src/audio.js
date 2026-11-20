// Synthesized sound for Solara City. No audio files: every sound is
// built from WebAudio oscillators and noise buffers at run time, and the
// whole synth stays silent until the player first interacts (browsers
// require a user gesture before audio starts).

let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let padNodes = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  startPad();
}

function noiseBuffer(seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// A soft synth pad that hums under the city, two detuned triangles.
function startPad() {
  const gain = ctx.createGain();
  gain.gain.value = 0.045;
  gain.connect(master);
  padNodes = [];
  for (const freq of [110, 164.8, 220.5]) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    o.detune.value = Math.random() * 6 - 3;
    o.connect(gain);
    o.start();
    padNodes.push(o);
  }
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g);
  g.connect(master);
  o.start();
  o.stop(ctx.currentTime + dur + 0.02);
}

export function playClick() { blip(660, 0.07, 'square', 0.12); }
export function playPickup() { blip(520, 0.12, 'sine', 0.25, 880); setTimeout(() => blip(880, 0.16, 'sine', 0.22, 1320), 90); }
export function playCash() { blip(988, 0.1, 'sine', 0.22); setTimeout(() => blip(1319, 0.18, 'sine', 0.22), 80); }
export function playReload() { blip(300, 0.08, 'square', 0.12, 180); setTimeout(() => blip(420, 0.08, 'square', 0.12, 260), 140); }
export function playEmpty() { blip(140, 0.06, 'square', 0.14); }
export function playHorn() { blip(370, 0.28, 'sawtooth', 0.12); blip(466, 0.28, 'sawtooth', 0.1); }

export function playGunshot() {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.16);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.14);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
  src.stop(ctx.currentTime + 0.16);
}

export function playCrash() {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start();
  src.stop(ctx.currentTime + 0.3);
  blip(90, 0.2, 'sine', 0.3, 45);
}

// Continuous engine hum whose pitch follows the car's speed (0..1).
export function setEngine(speed01, inCar) {
  if (!ctx) return;
  if (!inCar) {
    if (engineOsc) { engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }
    return;
  }
  if (!engineOsc) {
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }
  engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.08);
  engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.06, ctx.currentTime, 0.08);
}

// Two-tone police siren, on while any police car is chasing.
export function setSiren(on) {
  if (!ctx) return;
  if (!on) {
    if (sirenOsc) sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    return;
  }
  if (!sirenOsc) {
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    // alternate 700 / 950 Hz every 0.45 s
    let high = false;
    setInterval(() => {
      if (!sirenOsc) return;
      high = !high;
      sirenOsc.frequency.setTargetAtTime(high ? 950 : 700, ctx.currentTime, 0.05);
    }, 450);
  }
  sirenGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.2);
}
