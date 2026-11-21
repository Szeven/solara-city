// Procedural canvas textures for Solara City. Every texture is drawn at load
// time, so the game ships no image files at all.
import * as THREE from 'three';

function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A building facade: warm plaster with a grid of windows, a few lit.
export function facadeTexture(rng, base, lit) {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < s; y += 8) ctx.fillRect(0, y, s, 1);
    const cols = 6;
    const rows = 10;
    const w = s / cols;
    const h = s / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * w + w * 0.18;
        const y = r * h + h * 0.2;
        ctx.fillStyle = rng.chance(lit) ? '#ffd98a' : '#20303e';
        ctx.fillRect(x, y, w * 0.64, h * 0.55);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(x, y, w * 0.64, 2);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, s - 10, s, 10);
  });
}

// Asphalt with a dashed centre line, tiled along a road segment.
export function roadTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    ctx.fillStyle = '#e8c33a';
    ctx.fillRect(s / 2 - 3, 0, 6, s);
    ctx.fillStyle = 'rgba(232,195,58,0.35)';
    ctx.fillRect(s / 2 - 10, 0, 2, s);
    ctx.fillRect(s / 2 + 8, 0, 2, s);
  }, 1, 4);
}

// Pale concrete sidewalk slabs.
export function sidewalkTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#9aa0a3';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo((i * s) / 4, 0); ctx.lineTo((i * s) / 4, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (i * s) / 4); ctx.lineTo(s, (i * s) / 4); ctx.stroke();
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  }, 8, 8);
}

// Sunlit ocean with slow sparkle.
export function waterTexture() {
  return canvasTexture(256, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#1d7fb8');
    g.addColorStop(0.5, '#156a9e');
    g.addColorStop(1, '#1d8fc4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`;
      const w = 6 + Math.random() * 22;
      ctx.fillRect(Math.random() * s, Math.random() * s, w, 2);
    }
  }, 6, 6);
}

// Flat rooftop with a parapet edge and a vent box or two.
export function roofTexture(rng) {
  return canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#6f6a63';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#57534d';
    ctx.fillRect(8, 8, s - 16, s - 16);
    ctx.fillStyle = '#7d7870';
    ctx.fillRect(20, 24, 26, 18);
    ctx.fillRect(78, 60, 22, 22);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, s, 6);
    ctx.fillRect(0, 0, 6, s);
  });
}

// A glowing rooftop sign texture: big letters on a dark panel, used for the
// SOLARA tower sign in the city centre.
export function rooftopSignTexture(text, color = '#ffc93c') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = color;
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
