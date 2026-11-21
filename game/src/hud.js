// HUD for Solara City: cash, wanted stars, health, ammo, speed, mission line,
// messages, and a live minimap drawn on a 2D canvas.
import { ROADS } from './city.js';

export class Hud {
  constructor() {
    this.el = {
      cash: document.getElementById('cash'),
      stars: document.getElementById('stars'),
      healthFill: document.getElementById('health-fill'),
      ammo: document.getElementById('ammo'),
      speed: document.getElementById('speed'),
      mission: document.getElementById('mission-line'),
      message: document.getElementById('message'),
      minimap: document.getElementById('minimap'),
      crosshair: document.getElementById('crosshair'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
    this.messageT = 0;
    // Full-screen red flash for damage, created here so the page needs no
    // extra markup for it.
    this.damageEl = document.createElement('div');
    this.damageEl.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none;background:radial-gradient(ellipse at center, transparent 55%, rgba(255,0,0,0.45) 100%);opacity:0;transition:opacity .3s;';
    document.body.appendChild(this.damageEl);
  }

  showDamage() {
    this.damageEl.style.opacity = '1';
    setTimeout(() => {
      this.damageEl.style.opacity = '0';
    }, 180);
  }

  showMessage(text, seconds = 4) {
    this.el.message.textContent = text;
    this.el.message.style.opacity = '1';
    this.messageT = seconds;
  }

  update(dt, state) {
    this.el.cash.textContent = `$${state.cash.toLocaleString('en-US')}`;
    this.el.stars.textContent = '★'.repeat(state.stars) + '☆'.repeat(5 - state.stars);
    this.el.stars.style.color = state.stars > 0 ? '#ff5252' : '#888888';
    this.el.healthFill.style.width = `${Math.max(0, state.health)}%`;
    this.el.healthFill.style.background = state.health > 50 ? '#4caf50' : state.health > 25 ? '#ff9800' : '#f44336';
    this.el.ammo.textContent = state.reloading ? 'RELOADING…' : `${state.ammo} / ∞`;
    this.el.speed.textContent = state.inCar ? `${Math.round(state.speedKmh)} km/h` : '';
    this.el.mission.textContent = state.missionLabel;
    this.el.crosshair.style.display = state.inCar ? 'none' : 'block';
    if (this.messageT > 0) {
      this.messageT -= dt;
      if (this.messageT <= 0) this.el.message.style.opacity = '0';
    }
    this.drawMinimap(state);
  }

  drawMinimap(state) {
    const ctx = this.mapCtx;
    const S = 180;
    const scale = S / 560;
    const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
    ctx.fillStyle = '#0d2733';
    ctx.fillRect(0, 0, S, S);
    // Ocean on the west edge.
    ctx.fillStyle = '#156a9e';
    ctx.fillRect(0, 0, (S / 2 - 250 * scale), S);
    // Roads.
    ctx.strokeStyle = '#3a3f45';
    ctx.lineWidth = 4;
    for (const r of ROADS) {
      const [x1] = toMap(r, 0);
      ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, S); ctx.stroke();
      const [, z1] = toMap(0, r);
      ctx.beginPath(); ctx.moveTo(0, z1); ctx.lineTo(S, z1); ctx.stroke();
    }
    // Mission marker.
    if (state.missionMarker) {
      const [mx, mz] = toMap(state.missionMarker.x, state.missionMarker.z);
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath(); ctx.arc(mx, mz, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, mz, 9, 0, Math.PI * 2); ctx.stroke();
    }
    // Police cars.
    ctx.fillStyle = '#ff4444';
    for (const p of state.police) {
      const [px, pz] = toMap(p.x, p.z);
      ctx.beginPath(); ctx.arc(px, pz, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Traffic cars.
    ctx.fillStyle = '#ffffff';
    for (const c of state.cars) {
      const [cx, cz] = toMap(c.x, c.z);
      ctx.fillRect(cx - 1.5, cz - 1.5, 3, 3);
    }
    // Player arrow.
    const [px, pz] = toMap(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)));
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
