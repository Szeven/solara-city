// Solara City bootstrap and game loop. Owns the renderer, the camera
// rig, the frame loop, entering and leaving cars, shooting, the title
// and death screens, and the localStorage save.

import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS, SAVE_KEY, PLAYER } from './config.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Traffic } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { shotFromUrl, setupShot } from './shots.js';
import { ensureAudio, setEngine, setSiren, playPickup, playCash, playCrash } from './audio.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.className = 'webgl';
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

const world = buildWorld(scene);
const player = new Player(scene);
const traffic = new Traffic(scene, world);
const peds = new Pedestrians(scene, world);
const police = new Police(scene, world);
const missions = new Missions(scene);
const combat = new Combat(scene);
const hud = new Hud();
const input = new Input();

// --- save ------------------------------------------------------------
let cash = 0;
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    cash = s.cash || 0;
    for (const id of s.completed || []) missions.completed.add(id);
    return true;
  } catch { return false; }
}
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ cash, completed: [...missions.completed] }));
  } catch { /* storage unavailable: play on without saving */ }
}
const hasSave = loadSave();

// --- camera rig --------------------------------------------------------
let camYaw = Math.PI;
let camPitch = 0.32;
let camDist = 9;
let shotMode = null;
let shotCam = null;

function cameraTarget() {
  if (player.inCar) return player.inCar.pos;
  return player.pos;
}

function updateCamera(dt) {
  if (shotMode && shotCam && shotCam.mode === 'orbit') {
    const t = performance.now() * 0.00008;
    const yaw = shotCam.yaw + t;
    const tx = shotCam.target.x, tz = shotCam.target.z;
    camera.position.set(
      tx + Math.sin(yaw) * shotCam.dist,
      shotCam.height,
      tz + Math.cos(yaw) * shotCam.dist,
    );
    camera.lookAt(tx, 4, tz);
    return;
  }
  const target = cameraTarget();
  if (player.inCar) {
    // chase cam: swing behind the car's heading
    const want = player.inCar.heading + Math.PI;
    let dh = want - camYaw;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    camYaw += dh * Math.min(1, dt * 3.2);
    camPitch += (0.3 - camPitch) * Math.min(1, dt * 3);
    camDist += (13 - camDist) * Math.min(1, dt * 3);
  } else {
    const { dx, dy } = input.consumeMouse();
    camYaw -= dx * 0.0026;
    camPitch = Math.max(0.08, Math.min(0.9, camPitch + dy * 0.0022));
    camDist += (8 - camDist) * Math.min(1, dt * 3);
  }
  const tx = target.x, ty = target.y + 1.7, tz = target.z;
  camera.position.set(
    tx + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
    ty + Math.sin(camPitch) * camDist,
    tz + Math.cos(camYaw) * Math.cos(camPitch) * camDist,
  );
  camera.lookAt(tx, ty, tz);
}

// --- screens -----------------------------------------------------------
const titleEl = document.getElementById('title');
const deadEl = document.getElementById('dead');
const jobListEl = document.getElementById('joblist');
const crosshairEl = document.getElementById('crosshair');
let state = 'title'; // title | playing | dead

function renderJobList() {
  jobListEl.innerHTML = MISSIONS.map((m) => {
    const done = missions.completed.has(m.id);
    const cls = done ? 'done' : '';
    const mark = done ? '✓ ' : '○ ';
    return `<div class="${cls}">${mark}${m.name} — $${m.pay.toLocaleString('en-US')}</div>`;
  }).join('');
}

function showTitle() {
  state = 'title';
  renderJobList();
  titleEl.classList.remove('hidden');
  deadEl.classList.add('hidden');
  crosshairEl.classList.add('hidden');
  input.unlockPointer();
  document.getElementById('continuebtn').classList.toggle('hidden', !hasSave && cash === 0 && missions.completed.size === 0);
}

function startPlaying() {
  ensureAudio();
  titleEl.classList.add('hidden');
  deadEl.classList.add('hidden');
  crosshairEl.classList.remove('hidden');
  state = 'playing';
  input.lockPointer();
  hud.toast(missions.active ? missions.label : 'Press M to pick a job from The Duchess.');
}

function die(reason) {
  state = 'dead';
  document.getElementById('deadtext').textContent = reason;
  deadEl.classList.remove('hidden');
  crosshairEl.classList.add('hidden');
  input.unlockPointer();
  setEngine(0, false);
  setSiren(false);
}

document.getElementById('playbtn').addEventListener('click', () => {
  cash = 0;
  missions.completed.clear();
  missions.cancel();
  police.reset();
  player.reset(10, 10);
  saveGame();
  startPlaying();
});
document.getElementById('continuebtn').addEventListener('click', startPlaying);
document.getElementById('retrybtn').addEventListener('click', () => {
  player.reset(10, 10);
  police.reset();
  missions.cancel();
  saveGame();
  startPlaying();
});

// --- missions wiring -----------------------------------------------------
missions.onComplete = (def) => {
  // NOTE: the payout itself is added by the game loop from the pay value
  // missions.update returns — this handler only celebrates and saves,
  // so the cash is never counted twice.
  playCash();
  hud.toast(`${def.name} complete — $${def.pay.toLocaleString('en-US')} from The Duchess`);
  saveGame();
};
missions.onStep = (label) => {
  playPickup();
  hud.toast(label);
};
missions.onStartStars = (stars) => police.setStars(stars);

// --- stealing ------------------------------------------------------------
function tryEnterExitCar() {
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    car.speed = 0;
    player.pos.set(car.pos.x + 2.4, 0, car.pos.z + 1.2);
    player.mesh.visible = true;
    player.mesh.position.copy(player.pos);
    return;
  }
  const car = traffic.nearest(player.pos.x, player.pos.z, 3.6);
  if (!car) return;
  player.inCar = car;
  car.parked = false;
  player.mesh.visible = false;
  player.pos.copy(car.pos);
  police.addHeat(12);
  hud.toast('Car stolen — the heat is on');
}

// --- frame loop ------------------------------------------------------------
const clock = new THREE.Clock();
let crashCooldown = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  crashCooldown = Math.max(0, crashCooldown - dt);

  if (state === 'playing') {
    if (input.wasPressed('KeyE')) tryEnterExitCar();
    if (input.wasPressed('KeyR') && !player.inCar) combat.reload();
    if (input.wasPressed('KeyM')) {
      if (!missions.active) {
        const next = missions.available()[0];
        if (next) {
          missions.start(next.id);
          hud.toast(`${next.name} — ${next.brief}`);
        } else {
          hud.toast('All jobs done. The Duchess is pleased.');
        }
      } else {
        hud.toast(missions.label);
      }
    }
    if (input.consumeClick() && !player.inCar) {
      const result = combat.shoot(camera, peds, traffic.cars, () => police.addHeat(45));
      if (result === 'car') police.addHeat(8);
    }

    // player + car
    if (player.inCar) {
      if (shotMode) {
        // screenshot autopilot: the player's car follows the road graph
        // like traffic, so the scene reads as driving instead of parking
        player.inCar.trafficStep(dt, world, traffic.cars);
        player.pos.copy(player.inCar.pos);
      } else {
        const prevSpeed = player.inCar.speed;
        player.inCar.drive(dt, input, world, traffic.cars);
        if (Math.abs(prevSpeed) > 14 && Math.abs(player.inCar.speed) < 2 && crashCooldown === 0) {
          playCrash();
          crashCooldown = 1;
        }
        player.pos.copy(player.inCar.pos);
      }
    } else {
      player.update(dt, input, camYaw, world);
    }
    traffic.update(dt, player.inCar);
    peds.update(dt, player.pos, player.inCar ? Math.abs(player.inCar.speed) : Math.abs(player.speed));
    const chasing = police.update(dt, player, player.inCar, traffic.cars);
    setSiren(chasing);
    setEngine(player.inCar ? Math.abs(player.inCar.speed) / 38 : 0, !!player.inCar);
    combat.update(dt);

    // mission payout
    const pay = missions.update(player, player.inCar, traffic.missionCars);
    if (pay > 0) cash += pay;

    // death / bust
    if (player.dead) die('The city got the better of you this time.');
    else if (police.busted) {
      cash = Math.floor(cash / 2);
      die('Busted. The Duchess posted half your cash as bail.');
    }

    // HUD
    const obj = missions.objectivePos();
    hud.update({
      cash,
      stars: police.stars,
      health: player.health,
      ammo: combat.ammo,
      reserve: combat.reserve,
      speed: player.inCar ? player.inCar.speed : 0,
      inCar: !!player.inCar,
      missionHtml: missions.active
        ? `<b>${missions.active.def.name}</b><br>${missions.step ? missions.step.label : ''}${missions.distanceTo(player) !== null ? ` — ${missions.distanceTo(player)} m` : ''}`
        : 'No active job — press M for work.',
      objective: obj,
      traffic: traffic.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      police: police.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      player: {
        x: player.pos.x, z: player.pos.z,
        headingX: Math.sin(player.heading), headingZ: Math.cos(player.heading),
      },
    });
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  input.endFrame();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- boot ------------------------------------------------------------------
renderJobList();
shotMode = shotFromUrl();
if (shotMode) {
  shotCam = setupShot(shotMode, { player, traffic, police, missions });
  titleEl.classList.add('hidden');
  crosshairEl.classList.add('hidden');
  // the control hint bar would overlap the screenshot — hide it in shot mode
  if (shotCam.hideHint) document.getElementById('hint').classList.add('hidden');
  state = 'playing';
  if (shotMode === 'title') titleEl.classList.remove('hidden');
} else {
  showTitle();
}
animate();
