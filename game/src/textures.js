// Procedural canvas textures for Solara City. Nothing is loaded from a
// file: every facade, road, sand and sign is drawn once at boot into a
// canvas and handed to three.js as a CanvasTexture.

import * as THREE from '../vendor/three.module.min.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Deterministic pseudo-random from an integer seed (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A building facade: base colour, a grid of windows (some lit), a darker
// ground floor with a door and a shop awning stripe.
export function facadeTexture(seed, base) {
  const rand = rng(seed);
  const c = canvas(256, 512);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  // subtle vertical grime
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(0,0,0,${0.02 + rand() * 0.05})`;
    g.fillRect(rand() * 256, 0, 2 + rand() * 6, 512);
  }
  // windows: 6 columns x 12 rows
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 14 + col * 40;
      const y = 14 + row * 36;
      const lit = rand() < 0.28;
      g.fillStyle = lit ? '#ffd98a' : (rand() < 0.5 ? '#20262e' : '#3a4a5c');
      g.fillRect(x, y, 26, 22);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x, y, 26, 3);
    }
  }
  // ground floor
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 452, 256, 60);
  g.fillStyle = '#11151a';
  g.fillRect(108, 468, 40, 44);
  g.fillStyle = ['#ff2e88', '#2ee6ff', '#ffd23f'][seed % 3];
  g.fillRect(0, 448, 256, 6);
  // rooftop plant: a small AC box and a railing line at the very top
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(20, 0, 60, 10);
  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.fillRect(0, 10, 256, 2);
  return toTexture(c);
}

// Asphalt with a dashed centre line and worn patches.
export function roadTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#2b2f36';
  g.fillRect(0, 0, 128, 128);
  const rand = rng(7);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${rand() * 0.05})`;
    g.fillRect(rand() * 128, rand() * 128, 2, 2);
  }
  g.fillStyle = '#d8c33a';
  g.fillRect(62, 8, 4, 44);
  g.fillRect(62, 72, 4, 44);
  return toTexture(c);
}

// Warm sand with speckles and a few shells.
export function sandTexture() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#e8d29a';
  g.fillRect(0, 0, 256, 256);
  const rand = rng(21);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(120,90,40,0.18)' : 'rgba(255,250,220,0.25)';
    g.fillRect(rand() * 256, rand() * 256, 2, 2);
  }
  return toTexture(c);
}

// Ocean: deep blue-green with moving-looking wave streaks baked in.
export function oceanTexture() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#1d6f8f';
  g.fillRect(0, 0, 256, 256);
  const rand = rng(99);
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.05 + rand() * 0.12})`;
    g.lineWidth = 1 + rand() * 2;
    g.beginPath();
    const y = rand() * 256;
    g.moveTo(rand() * 100, y);
    g.bezierCurveTo(80, y + rand() * 12 - 6, 160, y + rand() * 12 - 6, 256, y);
    g.stroke();
  }
  return toTexture(c);
}

// A glowing neon sign texture with big readable text.
export function signTexture(text, color) {
  const c = canvas(512, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#0d0d14';
  g.fillRect(0, 0, 512, 128);
  g.font = 'bold 64px "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = color;
  g.fillText(text, 256, 66);
  g.shadowBlur = 8;
  g.fillStyle = '#ffffff';
  g.fillText(text, 256, 66);
  return toTexture(c);
}

// A palm frond sprite (drawn once, stamped on planes in the world).
export function palmTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.strokeStyle = '#2f7a33';
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    g.beginPath();
    g.moveTo(64, 64);
    g.quadraticCurveTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34, 64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58 + 12);
    g.stroke();
  }
  g.fillStyle = '#5a3a22';
  g.beginPath();
  g.arc(64, 64, 7, 0, Math.PI * 2);
  g.fill();
  return toTexture(c);
}
