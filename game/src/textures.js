// Procedural textures, drawn on canvases at boot: every facade, road, sidewalk,
// stretch of sand and wave of ocean comes from here, so the game ships no image
// files and loads nothing from the network.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function makeTexture(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A building face: coloured plaster, a grid of windows, a shop band at street level. */
export function facadeTexture(base, glass, seed) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const shade = g.createLinearGradient(0, 0, 256, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.16)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  shade.addColorStop(1, 'rgba(0,0,0,0.16)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 256, 256);
  const cols = 6;
  const rows = 9;
  const ww = 256 / cols;
  const wh = 256 / rows;
  for (let r = 1; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lit = ((seed * 31 + r * 7 + col * 13) % 10) < 6;
      g.fillStyle = lit ? glass : '#20242c';
      g.fillRect(col * ww + 6, r * wh + 5, ww - 12, wh - 11);
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.fillRect(col * ww + 6, r * wh + 5, ww - 12, 3);
    }
  }
  g.fillStyle = 'rgba(18,16,22,0.88)';
  g.fillRect(0, 0, 256, 22);
  g.fillStyle = '#ffd23a';
  g.font = 'bold 13px sans-serif';
  g.textAlign = 'center';
  g.fillText(seed % 2 ? 'TACOS · CAFE' : '24 HOUR MART', 128, 15);
  return makeTexture(c);
}

/** Asphalt with a dashed yellow centre line along the texture's x axis. */
export function roadTexture() {
  const c = makeCanvas(256, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#3a3f46';
  g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`;
    g.fillRect(Math.random() * 256, Math.random() * 64, 2, 2);
  }
  g.fillStyle = '#e8d23a';
  for (let x = 0; x < 256; x += 64) g.fillRect(x, 30, 32, 4);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(0, 2, 256, 2);
  g.fillRect(0, 60, 256, 2);
  return makeTexture(c, 4, 1);
}

/** Sidewalk slabs with dark joints. */
export function sidewalkTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#9aa0a8';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    g.beginPath();
    g.moveTo(i * 32, 0);
    g.lineTo(i * 32, 128);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * 32);
    g.lineTo(128, i * 32);
    g.stroke();
  }
  return makeTexture(c, 6, 6);
}

/** Sand with speckles for the beach strip. */
export function sandTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#e8d29a';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(120,90,40,${0.08 + Math.random() * 0.15})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  return makeTexture(c, 10, 10);
}

/** Ocean surface: blue with soft white wave streaks. */
export function oceanTexture() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#2a7fa8';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    const y = Math.random() * 256;
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 6);
    g.stroke();
  }
  return makeTexture(c, 8, 8);
}

/** A palm frond sprite, drawn once and reused on crossed planes. */
export function palmTexture() {
  const c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = '#2a7a3a';
  g.lineWidth = 7;
  g.lineCap = 'round';
  for (let a = 0; a < 7; a++) {
    const ang = -Math.PI / 2 + (a - 3) * 0.42;
    g.beginPath();
    g.moveTo(64, 118);
    g.quadraticCurveTo(64 + Math.cos(ang) * 34, 118 + Math.sin(ang) * 44, 64 + Math.cos(ang) * 58, 118 + Math.sin(ang) * 62);
    g.stroke();
  }
  g.fillStyle = '#5a3a1a';
  g.fillRect(60, 96, 8, 32);
  return makeTexture(c);
}

/** A soft white cloud sprite. */
export function cloudTexture() {
  const c = makeCanvas(256, 128);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.92)';
  for (const [x, y, r] of [[70, 80, 34], [120, 62, 44], [175, 82, 36], [105, 88, 40], [150, 90, 38]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return makeTexture(c);
}

export { PALETTE };
