// Solara City — every texture is drawn on a canvas at run time.
// No image files ship with the game.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function texture(c, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A building facade: lit and dark windows on a tinted wall, with a
// darker ground floor. Seeded so each building looks a little different.
export function facadeTexture(seed, base) {
  const c = canvas(128, 256);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  let s = seed * 2654435761 >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 4; col++) {
      const lit = rnd() < 0.55;
      g.fillStyle = lit ? '#ffd98a' : '#22384e';
      g.fillRect(10 + col * 30, 12 + row * 22, 20, 14);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, 224, 128, 32);
  g.fillStyle = '#111';
  g.fillRect(52, 228, 24, 28);
  return texture(c);
}

export function roadTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#33363b';
  g.fillRect(0, 0, 128, 128);
  // Centre dashes along the tile.
  g.fillStyle = '#d8c95a';
  for (let y = 0; y < 128; y += 32) g.fillRect(62, y + 6, 4, 18);
  // Edge lines.
  g.fillStyle = '#e8e8e8';
  g.fillRect(4, 0, 2, 128);
  g.fillRect(122, 0, 2, 128);
  // Speckle for wear.
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 200; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  return texture(c, 1, 1);
}

export function sidewalkTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#9a9a92';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#7c7c74';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 126, 126);
  g.beginPath();
  g.moveTo(64, 0);
  g.lineTo(64, 128);
  g.moveTo(0, 64);
  g.lineTo(128, 64);
  g.stroke();
  return texture(c);
}

export function grassTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#6fae5a';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#5d9c4c' : '#7dbf68';
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 3);
  }
  return texture(c, 8, 8);
}

export function oceanTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#1e6f8e';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    const y = 10 + i * 20 + Math.random() * 8;
    g.moveTo(0, y);
    g.bezierCurveTo(40, y + 6, 80, y - 6, 128, y + 2);
    g.stroke();
  }
  return texture(c, 6, 6);
}

export function sandTexture() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#e8d9a8';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#dcc98f' : '#f2e4bb';
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  return texture(c, 6, 6);
}

// A soft round blob used as a fake shadow under cars and people.
export function blobShadowTexture() {
  const c = canvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return texture(c);
}
