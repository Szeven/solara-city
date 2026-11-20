// Solara City — the HUD: cash, stars, health, ammo, speed, mission line,
// the minimap, and the title / pause / busted / wasted overlays.
import { CITY, MISSIONS } from './config.js';

export class Hud {
  constructor() {
    this.cashEl = document.getElementById('cash');
    this.starsEl = document.getElementById('stars');
    this.healthEl = document.getElementById('health-fill');
    this.ammoEl = document.getElementById('ammo');
    this.speedEl = document.getElementById('speed');
    this.missionEl = document.getElementById('mission');
    this.toastEl = document.getElementById('toast');
    this.minimap = document.getElementById('minimap');
    this.mm = this.minimap.getContext('2d');
    this.titleEl = document.getElementById('title');
    this.pauseEl = document.getElementById('pause');
    this.bustedEl = document.getElementById('busted');
    this.wastedEl = document.getElementById('wasted');
    this.toastTimer = null;
    this.buildJobList();
  }

  buildJobList() {
    const list = document.getElementById('job-list');
    if (!list) return;
    list.innerHTML = '';
    for (const m of MISSIONS) {
      const b = document.createElement('button');
      b.className = 'job';
      b.innerHTML = `<b>${m.id}. ${m.name}</b> — $${m.pay}<br><span>${m.brief}</span>`;
      b.addEventListener('click', () => window.__game?.startJob(m.id));
      list.appendChild(b);
    }
  }

  showOnly(el) {
    for (const o of [this.titleEl, this.pauseEl, this.bustedEl, this.wastedEl]) {
      if (o) o.style.display = o === el ? 'flex' : 'none';
    }
  }

  showTitle() { this.showOnly(this.titleEl); }
  showPause() { this.showOnly(this.pauseEl); }
  showBusted() { this.showOnly(this.bustedEl); }
  showWasted() { this.showOnly(this.wastedEl); }
  hideAll() { this.showOnly(null); }

  toast(msg, seconds = 3) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastEl.style.opacity = '0'; }, seconds * 1000);
  }

  update(game) {
    const p = game.player;
    if (this.cashEl) this.cashEl.textContent = `$${p.cash.toLocaleString('en-US')}`;
    if (this.starsEl) {
      const s = game.wanted.stars;
      this.starsEl.textContent = '★'.repeat(s) + '☆'.repeat(5 - s);
      this.starsEl.style.color = s >= 3 ? '#ff5a4e' : s >= 1 ? '#ffd23f' : '#888';
    }
    if (this.healthEl) {
      this.healthEl.style.width = `${Math.max(0, p.health)}%`;
      this.healthEl.style.background = p.health > 50 ? '#4caf50' : p.health > 25 ? '#ff9800' : '#f44336';
    }
    if (this.ammoEl) this.ammoEl.textContent = `AMMO ${p.ammo} / ${p.reserve}`;
    if (this.speedEl) {
      const kmh = Math.round(Math.abs(p.speed) * 3.6);
      this.speedEl.textContent = p.inCar ? `${kmh} km/h` : '';
    }
    if (this.missionEl) this.missionEl.textContent = game.missions.label();
    this.drawMinimap(game);
  }

  drawMinimap(game) {
    const g = this.mm;
    const S = 150;
    const scale = S / (CITY.bounds * 2 + 40);
    const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#0d1b26';
    g.fillRect(0, 0, S, S);
    // Ocean on the west edge.
    g.fillStyle = '#1e6f8e';
    const [ox] = toMap(CITY.oceanX, 0);
    g.fillRect(0, 0, Math.max(0, ox), S);
    // Roads.
    g.strokeStyle = '#4a4f55';
    g.lineWidth = 3;
    for (const r of CITY.roads) {
      const [x1, y1] = toMap(r, -CITY.bounds);
      const [x2, y2] = toMap(r, CITY.bounds);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      const [x3, y3] = toMap(-CITY.bounds, r);
      const [x4, y4] = toMap(CITY.bounds, r);
      g.beginPath(); g.moveTo(x3, y3); g.lineTo(x4, y4); g.stroke();
    }
    // Mission target.
    const target = game.missions.currentTarget();
    if (target) {
      const [mx, my] = toMap(target.x, target.z);
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(mx, my, 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#ffd23f';
      g.beginPath(); g.arc(mx, my, 8 + Math.sin(Date.now() / 300) * 2, 0, Math.PI * 2); g.stroke();
    }
    // Traffic (grey) and police (blue).
    g.fillStyle = '#9aa0a6';
    for (const car of game.traffic.cars) {
      if (car.isPolice) continue;
      const [cx, cy] = toMap(car.x, car.z);
      g.fillRect(cx - 1, cy - 1, 2, 2);
    }
    g.fillStyle = '#3f8cff';
    for (const car of game.police.cruisers) {
      const [cx, cy] = toMap(car.x, car.z);
      g.beginPath(); g.arc(cx, cy, 2.5, 0, Math.PI * 2); g.fill();
    }
    // Player arrow.
    const [px, py] = toMap(game.player.x, game.player.z);
    g.save();
    g.translate(px, py);
    g.rotate(Math.atan2(Math.sin(game.player.yaw), Math.cos(game.player.yaw)) + Math.PI);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill();
    g.restore();
  }
}
