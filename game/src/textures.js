// Procedural canvas textures: every surface in Solara City is drawn here,
// no image file is shipped. Each helper returns a THREE.CanvasTexture.

import * as THREE from 'three';

function canvasTexture(width, height, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A building face: lit windows on a coloured wall, with a darker base.
export function buildingTexture(base, floors = 8, cols = 6) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // Subtle vertical shading so faces read as concrete panels.
    for (let x = 0; x < w; x += 32) {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(x, 0, 2, h);
    }
    const cw = w / cols;
    const ch = h / floors;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const lit = ((f * 7 + c * 3) % 5) < 2;
        ctx.fillStyle = lit ? 'rgba(255,214,130,0.9)' : 'rgba(30,42,58,0.85)';
        ctx.fillRect(c * cw + cw * 0.2, f * ch + ch * 0.25, cw * 0.6, ch * 0.5);
      }
    }
    // Ground floor: darker shopfront band.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, h - ch, w, ch);
  });
}

// Asphalt with a dashed centre line and worn edges.
export function roadTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#33363b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 200; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = '#e8d44d';
    ctx.fillRect(w / 2 - 2, 8, 4, 24);
    ctx.fillRect(w / 2 - 2, h - 32, 4, 24);
  });
}

// Pale pavement slabs with seams.
export function sidewalkTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#9a9a92';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
    }
  });
}

// Grass with noise speckles.
export function grassTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#5d8a4a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const g = 110 + Math.floor(Math.random() * 60);
      ctx.fillStyle = `rgba(${g - 40},${g},${g - 70},0.5)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

// Sand with soft ripples.
export function sandTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d9c08a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,90,40,0.25)';
    for (let y = 8; y < h; y += 14) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        ctx.lineTo(x, y + Math.sin(x / 18) * 3);
      }
      ctx.stroke();
    }
  });
}

// Water: deep blue with light streaks.
export function waterTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2e6f8e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(Math.random() * w * 0.4, y);
      ctx.lineTo(w * 0.5 + Math.random() * w * 0.5, y + (Math.random() - 0.5) * 6);
      ctx.stroke();
    }
  });
}
