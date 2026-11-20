// HUD and minimap. The DOM shows cash, stars, health, ammo, speed and
// the current mission line; the minimap canvas draws the road grid, the
// player, police, traffic and the mission objective, north-up.

import { CITY, WANTED } from './config.js';

export class Hud {
  constructor() {
    this.cashEl = document.getElementById('cash');
    this.starsEl = document.getElementById('stars');
    this.healthFill = document.getElementById('healthfill');
    this.missionEl = document.getElementById('mission');
    this.speedEl = document.getElementById('speed');
    this.ammoEl = document.getElementById('ammo');
    this.toastEl = document.getElementById('toast');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = null;
    this.lastCash = -1;
    this.lastStars = -1;
  }

  toast(text, ms = 2600) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), ms);
  }

  update(state) {
    if (state.cash !== this.lastCash) {
      this.cashEl.childNodes[0].textContent = `$${state.cash.toLocaleString('en-US')}`;
      this.lastCash = state.cash;
    }
    if (state.stars !== this.lastStars) {
      let html = '';
      for (let i = 0; i < WANTED.maxStars; i++) {
        html += i < state.stars ? '★' : '<span class="off">★</span>';
      }
      this.starsEl.innerHTML = html;
      this.lastStars = state.stars;
    }
    this.healthFill.style.width = `${Math.max(0, state.health)}%`;
    this.healthFill.style.background = state.health > 50 ? '#37d67a' : state.health > 25 ? '#ffd23f' : '#e5484d';
    // wanted heat as a thin bar under the stars (title attribute for hover)
    this.starsEl.title = state.stars > 0 ? `Wanted: ${state.stars} star${state.stars > 1 ? 's' : ''} — lay low to cool off` : 'Clean — no heat';
    this.missionEl.innerHTML = state.missionHtml;
    this.speedEl.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 2.4)} km/h` : '';
    this.ammoEl.textContent = state.inCar ? '' : `${state.ammo} / ${state.reserve}`;
    this.drawMap(state);
  }

  drawMap(state) {
    const g = this.mapCtx;
    const S = 168;
    const scale = S / 540; // world [-270, 270] -> canvas
    const toX = (x) => S / 2 + x * scale;
    const toY = (z) => S / 2 + z * scale;
    g.clearRect(0, 0, S, S);
    // ocean
    g.fillStyle = '#1d6f8f';
    g.fillRect(0, 0, toX(-250), S);
    // sand
    g.fillStyle = '#e8d29a';
    g.fillRect(toX(-258), 0, toX(-250) - toX(-258), S);
    // land
    g.fillStyle = '#20242c';
    g.fillRect(toX(-250), 0, S - toX(-250), S);
    // roads
    g.strokeStyle = '#565b66';
    g.lineWidth = 3;
    for (const c of CITY.roads) {
      g.beginPath(); g.moveTo(toX(c), 0); g.lineTo(toX(c), S); g.stroke();
      g.beginPath(); g.moveTo(0, toY(c)); g.lineTo(S, toY(c)); g.stroke();
    }
    // mission objective
    if (state.objective) {
      g.fillStyle = '#ffd23f';
      g.beginPath();
      g.arc(toX(state.objective.x), toY(state.objective.z), 6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#000';
      g.lineWidth = 2;
      g.stroke();
    }
    // traffic (grey dots)
    g.fillStyle = 'rgba(200,200,200,0.8)';
    for (const c of state.traffic) {
      g.fillRect(toX(c.x) - 1, toY(c.z) - 1, 2, 2);
    }
    // police (blue/red dots)
    for (const c of state.police) {
      g.fillStyle = '#3a86ff';
      g.beginPath();
      g.arc(toX(c.x), toY(c.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    // player (white triangle, heading up = north)
    const px = toX(state.player.x), py = toY(state.player.z);
    g.save();
    g.translate(px, py);
    g.rotate(Math.atan2(state.player.headingX, -state.player.headingZ));
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath();
    g.fill();
    g.restore();
    // view cone edge
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(px, py, 9, 0, Math.PI * 2);
    g.stroke();
  }
}
