// The HUD: cash, wanted stars, health, ammo, the mission line, speed, messages
// and the minimap live in the DOM around the canvas, so they stay crisp at any
// window size. The title screen and the end screens are DOM panels too.

import { WANTED, TITLE, TAGLINE } from './config.js';

const MISSION_NAMES = ['The First Pickup', 'Hot Wheels', 'Breaker Down', 'Payday'];

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const el = {
    cash: $('hud-cash'),
    stars: $('hud-stars'),
    health: $('hud-health-fill'),
    ammo: $('hud-ammo'),
    mission: $('hud-mission'),
    objective: $('hud-objective'),
    speed: $('hud-speed'),
    message: $('hud-message'),
    prompt: $('hud-prompt'),
    title: $('screen-title'),
    panel: $('screen-panel'),
    crosshair: $('crosshair'),
  };
  let lastCash = -1;
  let lastStars = -1;
  let lastHealth = -1;
  let lastAmmo = -1;
  let lastObj = '';
  let lastMsg = '';

  function starLine(wanted) {
    let s = '';
    for (let i = 0; i < WANTED.max; i++) s += i < wanted ? '★' : '☆';
    return s;
  }

  return {
    update(world) {
      if (world.cash !== lastCash) {
        el.cash.textContent = `$${world.cash.toLocaleString()}`;
        lastCash = world.cash;
      }
      const w = world.police.wanted;
      if (w !== lastStars) {
        el.stars.textContent = starLine(w);
        el.stars.className = w > 0 ? 'wanted-hot' : '';
        lastStars = w;
      }
      const hp = Math.round(world.player.health);
      if (hp !== lastHealth) {
        el.health.style.width = `${hp}%`;
        el.health.className = hp < 30 ? 'low' : '';
        lastHealth = hp;
      }
      const ammo = world.player.inCar ? '—' : `${world.player.ammo} / 12`;
      if (ammo !== lastAmmo) {
        el.ammo.textContent = ammo;
        lastAmmo = ammo;
      }
      if (world.objectiveText !== lastObj) {
        el.mission.textContent = world.missionName;
        el.objective.textContent = world.objectiveText;
        lastObj = world.objectiveText;
      }
      if (world.message !== lastMsg) {
        el.message.textContent = world.message;
        lastMsg = world.message;
      }
      el.message.style.opacity = world.messageT > 0 ? 1 : 0;
      const speed = world.player.inCar && world.player.car ? Math.round(Math.abs(world.player.car.speed) * 3.6) : 0;
      el.speed.textContent = world.player.inCar ? `${speed} km/h` : '';
      el.crosshair.style.display = world.player.inCar ? 'none' : 'block';
      el.prompt.textContent = world.promptText || '';
    },
    showPanel(html) {
      el.panel.innerHTML = html;
      el.panel.style.display = 'block';
    },
    hidePanel() {
      el.panel.style.display = 'none';
    },
    titleScreen(save) {
      const done = save && save.done ? save.done : [];
      const rows = ['m1', 'm2', 'm3', 'm4']
        .map((id, i) => `<div class="mission-row">${done.includes(id) ? '✓' : '○'} ${i + 1}. ${MISSION_NAMES[i]}${done.includes(id) ? ' — done' : ''}</div>`)
        .join('');
      el.title.innerHTML = `
        <h1>${TITLE}</h1>
        <p class="tagline">${TAGLINE}</p>
        <p class="story">Jax Marlowe came back to Solara City broke. The Duchess, who runs Club Mirage,
        has work for a wheelman she can trust — and the Breakers want him gone. Steal cars,
        outrun the cops, finish the jobs, get paid.</p>
        <div class="missions">${rows}</div>
        <p class="controls">WASD move / drive · Mouse drag to look · E enter car / interact · Click shoot · R reload · P pause · M mute</p>
        <p class="prompt-line">Press <b>1–4</b> to start a job, <b>Enter</b> for Free Roam${save ? ' · <b>C</b> to continue your save' : ''}</p>
        ${save ? `<p class="save-line">Save: $${save.cash.toLocaleString()} · ${done.length}/4 jobs done</p>` : ''}`;
      el.title.style.display = 'block';
    },
    hideTitle() {
      el.title.style.display = 'none';
    },
  };
}
