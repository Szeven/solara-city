// HUD: cash, wanted stars, health, ammo, speed, mission line, toast
// messages, title / pause / busted screens, and a live minimap drawn on a
// 2D canvas.

export function createHud(callbacks) {
  const el = (id) => document.getElementById(id);
  const cashEl = el('hud-cash');
  const starsEl = el('hud-stars');
  const healthFill = el('hud-health-fill');
  const ammoEl = el('hud-ammo');
  const speedEl = el('hud-speed');
  const missionEl = el('hud-mission');
  const toastEl = el('hud-toast');
  const map = el('minimap');
  const mapCtx = map.getContext('2d');
  const titleEl = el('title-screen');
  const pauseEl = el('pause-screen');
  const bustedEl = el('busted-screen');
  const bustedText = el('busted-text');

  let toastTimer = 0;
  const toastQueue = [];

  // Title screen job buttons.
  document.querySelectorAll('[data-mission]').forEach((btn) => {
    btn.addEventListener('click', () => {
      callbacks.onStartMission(Number(btn.dataset.mission));
    });
  });
  el('btn-freeroam')?.addEventListener('click', () => callbacks.onFreeRoam());
  el('btn-continue')?.addEventListener('click', () => callbacks.onContinue());
  el('btn-resume')?.addEventListener('click', () => callbacks.onResume());
  el('btn-restart')?.addEventListener('click', () => callbacks.onRestart());

  function drawMinimap(s) {
    const W = map.width;
    const H = map.height;
    const span = 560; // world -280..280
    const toX = (x) => ((x + span / 2) / span) * W;
    const toY = (z) => ((z + span / 2) / span) * H;
    mapCtx.clearRect(0, 0, W, H);
    mapCtx.fillStyle = '#10151c';
    mapCtx.fillRect(0, 0, W, H);
    // Ocean west.
    mapCtx.fillStyle = '#245a75';
    mapCtx.fillRect(0, 0, toX(-225), H);
    // Roads.
    mapCtx.strokeStyle = '#3a3f46';
    mapCtx.lineWidth = 3;
    for (const line of s.roadLines) {
      mapCtx.beginPath();
      mapCtx.moveTo(toX(-225), toY(line));
      mapCtx.lineTo(toX(225), toY(line));
      mapCtx.stroke();
      mapCtx.beginPath();
      mapCtx.moveTo(toX(line), toY(-225));
      mapCtx.lineTo(toX(line), toY(225));
      mapCtx.stroke();
    }
    // Buildings.
    mapCtx.fillStyle = '#565d66';
    for (const c of s.colliders) {
      mapCtx.fillRect(toX(c.minX), toY(c.minZ), toX(c.maxX) - toX(c.minX), toY(c.maxZ) - toY(c.minZ));
    }
    // Traffic.
    mapCtx.fillStyle = '#9aa2ad';
    for (const car of s.cars) {
      mapCtx.fillRect(toX(car.pos.x) - 1.5, toY(car.pos.z) - 1.5, 3, 3);
    }
    // Cops.
    mapCtx.fillStyle = '#3b82f6';
    for (const cop of s.cops) {
      mapCtx.beginPath();
      mapCtx.arc(toX(cop.pos.x), toY(cop.pos.z), 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Mission marker.
    if (s.missionTarget) {
      const pulse = 4 + Math.sin(performance.now() / 240) * 1.5;
      mapCtx.fillStyle = '#ffd34d';
      mapCtx.beginPath();
      mapCtx.arc(toX(s.missionTarget.x), toY(s.missionTarget.z), pulse, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Player arrow.
    const px = toX(s.playerPos.x);
    const py = toY(s.playerPos.z);
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(Math.atan2(Math.sin(s.playerHeading), Math.cos(s.playerHeading)) + Math.PI);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6);
    mapCtx.lineTo(4.5, 5);
    mapCtx.lineTo(-4.5, 5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  return {
    update(s, dt) {
      cashEl.textContent = `$${Math.floor(s.cash).toLocaleString('en-US')}`;
      let stars = '';
      for (let i = 0; i < 5; i++) stars += i < s.stars ? '★' : '☆';
      starsEl.textContent = stars;
      starsEl.className = s.stars > 0 ? 'stars hot' : 'stars';
      healthFill.style.width = `${Math.max(0, s.health)}%`;
      healthFill.style.background = s.health > 50 ? '#58b368' : s.health > 25 ? '#e0a92e' : '#d95f4b';
      ammoEl.textContent = s.reloading ? 'RELOADING…' : `AMMO ${s.ammo} / 12`;
      speedEl.textContent = s.inCar ? `${Math.round(Math.abs(s.speedKmh))} km/h` : '';
      missionEl.textContent = s.missionText || 'Free Roam — press 1-4 for a job, E to steal a car';
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) {
          const next = toastQueue.shift();
          if (next) {
            toastEl.textContent = next.text;
            toastTimer = next.seconds;
          } else {
            toastEl.textContent = '';
          }
        }
      }
      drawMinimap(s);
    },
    toast(text, seconds = 3) {
      // A toast already showing queues behind it instead of being lost.
      if (toastTimer > 0) {
        toastQueue.push({ text, seconds });
        return;
      }
      toastEl.textContent = text;
      toastTimer = seconds;
    },
    showTitle(save) {
      titleEl.style.display = 'flex';
      map.style.display = 'none';
      const cont = el('btn-continue');
      if (cont) cont.style.display = save ? 'block' : 'none';
      const sub = el('title-save');
      if (sub && save) {
        sub.textContent = `Continue — $${Math.floor(save.cash).toLocaleString('en-US')}, ${save.done.length} job${save.done.length === 1 ? '' : 's'} done`;
      }
    },
    hideTitle() {
      titleEl.style.display = 'none';
      map.style.display = 'block';
    },
    showPause(show) {
      pauseEl.style.display = show ? 'flex' : 'none';
    },
    showBusted(cashLost) {
      bustedText.textContent =
        cashLost > 0
          ? `The police booked you. Bail cost $${Math.floor(cashLost).toLocaleString('en-US')}.`
          : 'The police booked you.';
      bustedEl.style.display = 'flex';
    },
    hideBusted() {
      bustedEl.style.display = 'none';
    },
  };
}
