// Solara City — bootstrap, game loop and state machine.
// States: title -> playing <-> paused, playing -> busted -> playing.

import * as THREE from 'three';
import { CAR, ROAD_LINES, PLACES, MISSIONS, WANTED, PLAYER } from './config.js';
import { makeRng } from './random.js';
import { setupWorld, chaseCamera } from './render.js';
import { buildCity } from './city.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_INTERACT, ACTION_PAUSE, ACTION_SHOOT, ACTION_MUTE, ACTION_RELOAD } from './input.js';
import { createPlayer, stepPlayer, damagePlayer, healPlayer, respawnPlayer } from './player.js';
import { stepPlayerCar, stepTrafficCar, spawnTrafficCar, spawnParkedCar } from './vehicles.js';
import { spawnPedestrian, stepPedestrians, disposePed } from './people.js';
import { createPoliceSystem } from './police.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { applyShot } from './shots.js';

const SAVE_KEY = 'solara-city-save-v1';
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || 7);
const rng = makeRng(SEED);

// --- world ---------------------------------------------------------------
const canvas = document.getElementById('game');
const { renderer, scene, camera } = setupWorld(canvas);
const city = buildCity(scene, SEED);
const audio = createAudio();
const input = createInput(canvas);
const player = createPlayer(scene);
const missions = createMissions(scene, rng);
const police = createPoliceSystem(scene, city.roadGraph, rng);

const cars = [];
const peds = [];
const tracers = [];

// Parked cars at the curb, clear of the traffic lanes, plus a couple near the club.
const parkedSpots = [
  [34.5, 42, 0.4, 0xc23b2e],
  [42, 34.5, -1.2, 0x2e6fc2],
  [8, 42, 0.2, 0xe0a92e],
  [134.5, -108, 0, 0x3fae6a],
  [-108, 134.5, 1.57, 0xd8d8d8],
  [184.5, 108, -0.6, 0x7a4fb0],
];
for (const [x, z, h, c] of parkedSpots) {
  cars.push(spawnParkedCar(scene, x, z, h, c));
}
// Traffic.
for (let i = 0; i < 10; i++) cars.push(spawnTrafficCar(scene, city.roadGraph, rng));
// Pedestrians.
for (let i = 0; i < 14; i++) peds.push(spawnPedestrian(scene, rng));

// --- game state ------------------------------------------------------------
const state = {
  mode: 'title', // title | playing | paused | busted
  cash: 0,
  stars: 0,
  quietTime: 0,
  muted: false,
  saveTimer: 0,
  shotMode: Boolean(SHOT),
};

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveGame() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        cash: state.cash,
        done: missions.done,
        pos: { x: player.pos.x, z: player.pos.z },
      }),
    );
  } catch {
    // Storage may be unavailable; the game still plays.
  }
}

function addHeat(n) {
  state.stars = Math.min(WANTED.maxStars, state.stars + n);
  state.quietTime = 0;
}

function addTracer(from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from.x, 1.4, from.z),
    new THREE.Vector3(to.x, 1.2, to.z),
  ]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  tracers.push({ line, life: 0.14 });
}

function shootables() {
  const list = [];
  for (const ped of peds) {
    list.push({ pos: ped.pos, radius: 0.6, kind: 'ped', ref: ped });
  }
  for (const b of missions.shootables()) list.push(b);
  for (const cop of police.cars) {
    list.push({ pos: cop.pos, radius: 1.8, kind: 'cop', ref: cop });
  }
  for (const car of cars) {
    if (car.kind === 'player') continue;
    list.push({ pos: car.pos, radius: 1.8, kind: 'car', ref: car });
  }
  return list;
}

function startPlaying() {
  state.mode = 'playing';
  hud.hideTitle();
  hud.hideBusted();
  hud.showPause(false);
  audio.unlock();
}

function startMission(i) {
  if (missions.start(i)) {
    startPlaying();
    hud.toast(`${MISSIONS[i].name} — ${MISSIONS[i].briefing}`, 5);
    audio.click();
  } else {
    hud.toast('That job is already done. Pick another.', 3);
  }
}

const hud = createHud({
  onStartMission: startMission,
  onFreeRoam: () => {
    startPlaying();
    hud.toast('Free Roam — explore Solara City.', 3);
  },
  onContinue: () => {
    const save = loadSave();
    if (save) {
      state.cash = save.cash || 0;
      player.pos.set(save.pos?.x ?? 25, 0, save.pos?.z ?? 25);
      player.mesh.position.copy(player.pos);
      for (const id of save.done || []) {
        if (!missions.done.includes(id)) missions.done.push(id);
      }
    }
    startPlaying();
  },
  onResume: () => {
    state.mode = 'playing';
    hud.showPause(false);
  },
  onRestart: () => {
    state.mode = 'playing';
    hud.hideBusted();
    hud.showPause(false);
  },
});

function goBusted(reason) {
  if (state.mode !== 'playing') return;
  state.mode = 'busted';
  const lost = Math.min(state.cash, 150);
  state.cash -= lost;
  state.stars = 0;
  police.clear();
  audio.bust();
  audio.setSiren(false);
  respawnPlayer(player, PLACES.hospital.x, PLACES.hospital.z);
  hud.showBusted(lost);
  saveGame();
}

// --- main loop --------------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  const actions = input.takeActions();
  const pressed = input.takePressed();

  if (actions & ACTION_MUTE) {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
  }

  if (state.mode === 'title') {
    if (actions & ACTION_CONFIRM) startPlaying();
    // Slow orbit over the city behind the title screen.
    const a = elapsed * 0.05;
    camera.position.set(Math.cos(a) * 130, 70, Math.sin(a) * 130);
    camera.lookAt(0, 0, 0);
    city.update(dt);
    renderer.render(scene, camera);
    return;
  }

  if (state.mode === 'paused') {
    if (actions & ACTION_PAUSE) {
      state.mode = 'playing';
      hud.showPause(false);
    }
    renderer.render(scene, camera);
    return;
  }

  if (state.mode === 'busted') {
    if (actions & ACTION_CONFIRM) {
      state.mode = 'playing';
      hud.hideBusted();
    }
    city.update(dt);
    renderer.render(scene, camera);
    return;
  }

  // --- playing --------------------------------------------------------------
  if (actions & ACTION_PAUSE) {
    state.mode = 'paused';
    hud.showPause(true);
    renderer.render(scene, camera);
    return;
  }

  // Menu keys 1-4 start jobs while playing.
  for (let i = 0; i < 4; i++) {
    if (pressed.has(`Digit${i + 1}`)) startMission(i);
  }

  // Camera orbit from mouse drag.
  const orbit = input.takeOrbit();
  if (orbit.dx !== 0 || orbit.dy !== 0) {
    player.camHeading -= orbit.dx * 0.005;
  } else if (player.inCar && player.car) {
    const diff = player.car.heading - player.camHeading;
    let d = diff;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    player.camHeading += d * Math.min(1, dt * 1.2);
  }

  const interact = (actions & ACTION_INTERACT) !== 0;
  const playerEvents = stepPlayer(
    player,
    input,
    { interact, shoot: (actions & ACTION_SHOOT) !== 0, reload: (actions & ACTION_RELOAD) !== 0 },
    dt,
    {
      colliders: city.colliders,
      cars,
      shootables: shootables(),
      tracer: addTracer,
    },
  );

  let enteredCar = null;
  const frameHits = [];
  for (const ev of playerEvents) {
    if (ev.type === 'steal') {
      addHeat(WANTED.stealHeat);
      hud.toast('Car stolen — the police are coming.', 3);
    }
    if (ev.type === 'enter') enteredCar = ev.car;
    if (ev.type === 'shoot') {
      audio.shot();
      addHeat(WANTED.shootHeat);
    }
    if (ev.type === 'hit') {
      frameHits.push(ev.target);
      const t = ev.target;
      if (t.kind === 'ped') {
        disposePed(t.ref, scene);
        peds.splice(peds.indexOf(t.ref), 1);
        peds.push(spawnPedestrian(scene, rng));
        addHeat(WANTED.hitPedHeat);
      } else if (t.kind === 'cop') {
        addHeat(WANTED.hitCopHeat);
      } else if (t.kind === 'car') {
        addHeat(WANTED.hitCarHeat);
      }
    }
    if (ev.type === 'reload') audio.reload();
  }

  // Drive the player's car. In shot mode the car cruises itself along the
  // road graph (traffic AI) so the scene stays alive for the camera.
  if (player.inCar && player.car) {
    const move = input.move();
    let speed;
    if (state.shotMode) {
      stepTrafficCar(player.car, dt, city.roadGraph, cars, rng);
      speed = player.car.speed;
    } else {
      speed = stepPlayerCar(player.car, move, dt, city.colliders, cars);
    }
    audio.setEngine(Math.min(1, Math.abs(speed) / CAR.forwardMax), move.y !== 0);
    player.pos.copy(player.car.pos);
    player.heading = player.car.heading;
  } else {
    audio.setEngine(0, false);
  }

  // Traffic and pedestrians.
  for (const car of cars) {
    if (car.kind === 'traffic') stepTrafficCar(car, dt, city.roadGraph, cars, rng);
  }
  const danger = state.stars > 0 || performance.now() - player.lastShotAt < 3000;
  stepPedestrians(peds, dt, player.pos, danger, city.colliders, rng);

  // Police.
  police.update(dt, {
    wantedStars: Math.floor(state.stars),
    playerPos: player.pos,
    playerVel: player.vel,
    playerCar: player.inCar ? player.car : null,
    colliders: city.colliders,
    onRam: () => {
      if (player.car) player.car.speed *= 0.55;
      audio.thud();
    },
    onHit: () => {
      if (damagePlayer(player, 15)) goBusted('run down');
    },
    onBusted: () => goBusted('busted'),
  });
  audio.setSiren(police.siren);

  // Missions.
  const missionEvents = missions.update(dt, {
    playerPos: player.pos,
    playerCar: player.inCar ? player.car : null,
    pressedE: interact,
    enteredCar,
    hits: frameHits,
    wantedStars: Math.floor(state.stars),
    onTouch: (b) => {
      if (damagePlayer(player, 8)) goBusted('beaten');
    },
  });
  for (const ev of missionEvents) {
    if (ev.type === 'step') hud.toast(ev.text, 4);
    if (ev.type === 'complete') {
      state.cash += ev.reward;
      hud.toast(`${ev.mission.name} complete — $${ev.reward.toLocaleString('en-US')} earned.`, 5);
      audio.jingle();
      saveGame();
    }
  }

  // Wanted heat cools after quiet seconds.
  if (state.stars > 0) {
    state.quietTime += dt;
    if (state.quietTime > WANTED.coolAfter) {
      state.stars = Math.max(0, state.stars - WANTED.coolRate * dt);
    }
  }
  if (state.stars === 0 && player.health < PLAYER.health) {
    healPlayer(player, 2 * dt);
  }

  // Tracers fade.
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / 0.14) * 0.9;
    if (t.life <= 0) {
      scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
      tracers.splice(i, 1);
    }
  }

  // Camera + HUD.
  chaseCamera(camera, player.pos, player.inCar && player.car ? player.car.heading : player.heading, dt, {
    inCar: player.inCar,
  });
  const info = missions.currentInfo();
  hud.update(
    {
      cash: state.cash,
      stars: Math.floor(state.stars),
      health: player.health,
      ammo: player.ammo,
      reloading: player.reloading,
      speedKmh: player.inCar && player.car ? player.car.speed * 3.6 : player.speed * 3.6,
      missionText: info ? `${info.name} — ${info.text}` : '',
      missionTarget: info?.target || null,
      playerPos: player.pos,
      playerHeading: player.inCar && player.car ? player.car.heading : player.heading,
      inCar: player.inCar,
      cops: police.cars,
      cars,
      colliders: city.colliders,
      roadLines: ROAD_LINES,
    },
    dt,
  );

  // Autosave every 10 seconds of play.
  state.saveTimer += dt;
  if (state.saveTimer > 10) {
    state.saveTimer = 0;
    saveGame();
  }

  city.update(dt);
  renderer.render(scene, camera);
}

// --- boot -------------------------------------------------------------------
if (SHOT) {
  applyShot({ scene, player, cars, peds, police, missions, city, rng, addHeat, setStars: (n) => { state.stars = n; } }, SHOT, SEED);
  state.mode = 'playing';
  hud.hideTitle();
  audio.unlock();
} else {
  const save = loadSave();
  hud.showTitle(save);
  // Title camera: slow orbit over the city.
  camera.position.set(60, 55, 120);
  camera.lookAt(0, 0, 0);
}

frame();
