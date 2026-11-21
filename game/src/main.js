// Solara City — bootstrap and game loop. Assembles the city, traffic,
// pedestrians, police, missions, combat and HUD, and runs the frame loop.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { buildCity } from './city.js';
import { TrafficSystem, spawnParkedCar } from './vehicles.js';
import { PedestrianSystem } from './pedestrians.js';
import { WantedSystem, PoliceSystem } from './police.js';
import { Missions } from './missions.js';
import { Pistol } from './combat.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { Hud } from './hud.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { loadSave, saveGame } from './save.js';

const params = new URLSearchParams(window.location.search);
const stagedScene = params.get('scene') || '';

// --- Renderer and scene -------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d6);
scene.fog = new THREE.Fog(0x9ec7e0, 220, 620);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 10, -14);

scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 1.0));
const sun = new THREE.DirectionalLight(0xffe0b3, 1.8);
sun.position.set(140, 190, 70);
scene.add(sun);

// --- Systems ------------------------------------------------------------
const rng = makeRng('solara-city');
const city = buildCity(scene);
const traffic = new TrafficSystem(scene, city, makeRng('traffic'));
const peds = new PedestrianSystem(scene, city, makeRng('peds'), 26);
const wanted = new WantedSystem();
const police = new PoliceSystem(scene, city, makeRng('police'));
const player = new Player(scene, 30, 30);
const pistol = new Pistol(scene);
const audio = new AudioEngine();
const input = new Input();
input.attach(renderer.domElement);
const rig = new CameraRig(camera);
const hud = new Hud();

const parkedCars = [];
for (let i = 0; i < 8; i++) parkedCars.push(spawnParkedCar(scene, city, makeRng(`park-${i}`)));

const missions = new Missions(scene, city, makeRng('missions'), {
  onCash: (amount) => {
    player.cash += amount;
    audio.missionDone();
    persist();
  },
  onMessage: (text) => hud.showMessage(text, 5),
  onMissionDone: () => persist(),
  setWanted: (stars) => wanted.addCrime(stars),
});

police.onBusted = () => {
  const lost = Math.floor(player.cash * 0.1);
  player.cash = Math.max(0, player.cash - lost);
  wanted.clear();
  player.respawn(200, 200);
  audio.busted();
  hud.showMessage(`BUSTED — the SPD took $${lost}.`, 5);
  state = 'busted';
  setTimeout(() => {
    if (state === 'busted') state = 'playing';
    document.getElementById('busted').style.display = 'none';
  }, 2500);
  document.getElementById('busted').style.display = 'flex';
  persist();
};

// --- Game state ---------------------------------------------------------
let state = 'title';
let missionsDone = 0;
let stagedAuto = false;

function persist() {
  saveGame({
    cash: player.cash,
    missionIndex: missions.index,
    missionsDone,
    health: player.health,
    x: player.pos.x,
    z: player.pos.z,
  });
}

function allNearbyCars() {
  const list = [...traffic.cars, ...parkedCars];
  if (missions.targetCar && !list.includes(missions.targetCar)) list.push(missions.targetCar);
  return list;
}

function startGame(mode, missionIndex = null) {
  audio.ensure();
  audio.click();
  document.body.classList.remove('title-screen');
  document.getElementById('title').style.display = 'none';
  document.getElementById('pause').style.display = 'none';
  state = 'playing';
  if (mode === 'mission' && missionIndex !== null) {
    missions.start(missionIndex);
  } else if (mode === 'continue') {
    const save = loadSave();
    if (save) {
      player.cash = save.cash || 0;
      player.health = save.health || 100;
      missionsDone = save.missionsDone || 0;
      missions.index = save.missionIndex || 0;
      player.pos.set(save.x || 30, 0, save.z || 30);
      player.mesh.position.copy(player.pos);
      hud.showMessage('Welcome back to Solara City.', 4);
    }
  }
}

// Title screen wiring.
const save = loadSave();
const titleEl = document.getElementById('title');
const jobList = document.getElementById('job-list');
const JOB_NAMES = ['The First Pickup — $500', 'Hot Wheels — $900', 'Breaker Down — $1,400', 'Payday — $2,500'];
JOB_NAMES.forEach((name, i) => {
  const btn = document.createElement('button');
  btn.textContent = `${i < missionsDone ? '✓ ' : ''}${name}`;
  btn.disabled = i > missionsDone;
  btn.addEventListener('click', () => startGame('mission', i));
  jobList.appendChild(btn);
});
document.getElementById('btn-roam').addEventListener('click', () => startGame('roam'));
const continueBtn = document.getElementById('btn-continue');
if (save) {
  continueBtn.style.display = 'block';
  continueBtn.textContent = `Continue — $${(save.cash || 0).toLocaleString('en-US')} · ${save.missionsDone || 0}/4 jobs done`;
  continueBtn.addEventListener('click', () => startGame('continue'));
}
document.getElementById('btn-resume').addEventListener('click', () => {
  document.getElementById('pause').style.display = 'none';
  state = 'playing';
});

// --- Staged scenes for screenshots (?scene=chase|foot|drive|title) -----
function stageScene(name) {
  if (name === 'title') {
    document.body.classList.add('title-screen');
    rig.setFixed(new THREE.Vector3(190, 95, -190), new THREE.Vector3(0, 12, 0));
    return;
  }
  state = 'playing';
  document.body.classList.remove('title-screen');
  titleEl.style.display = 'none';
  if (name === 'chase') {
    const car = spawnParkedCar(scene, city, makeRng('stage-chase'), 0xc0392b);
    car.pos.set(75, 0, -60);
    car.heading = 0;
    car.syncMesh();
    parkedCars.push(car);
    player.enterCar(car);
    wanted.addCrime(3);
    police.spawnCarNear(player.pos.x, player.pos.z);
    police.spawnCarNear(player.pos.x, player.pos.z);
    missions.start(0);
    rig.yaw = player.heading;
  } else if (name === 'foot') {
    // Stand west of the pier pickup so the gold beacon is in frame.
    player.pos.set(-222, 0, 108);
    player.mesh.position.copy(player.pos);
    missions.start(0);
    rig.yaw = -0.7;
    for (let i = 0; i < 4; i++) {
      const p = city.randomSidewalkPoint(makeRng(`stage-foot-${i}`));
      peds.peds[i].pos.set(p.x, 0, p.z);
    }
  } else if (name === 'drive') {
    const car = spawnParkedCar(scene, city, makeRng('stage-drive'), 0x2980b9);
    car.pos.set(-125, 0, 75);
    car.heading = Math.PI / 2;
    car.syncMesh();
    parkedCars.push(car);
    player.enterCar(car);
    stagedAuto = true;
    rig.yaw = player.heading;
  }
}
if (stagedScene) stageScene(stagedScene);
if (!stagedScene) document.body.classList.add('title-screen');

// --- Frame loop ---------------------------------------------------------
const clock = new THREE.Clock();
let saveT = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'playing' || state === 'busted') {
    if (input.pressed('Escape')) {
      state = 'paused';
      document.getElementById('pause').style.display = 'flex';
    }
    const driveInput = stagedAuto
      ? {
        moveVector: () => ({ x: 0, z: 1 }),
        down: () => false,
        pressed: () => false,
        consumeMouse: () => ({ dx: 0, dy: 0 }),
        consumeClick: () => false,
        endFrame: () => {},
      }
      : input;
    player.update(dt, driveInput, city, rig.yaw, allNearbyCars(), (car) => {
      wanted.addCrime(1);
      audio.pickup();
      hud.showMessage('Car stolen — the SPD noticed.', 3);
    });
    traffic.update(dt, player.pos);
    peds.update(dt);
    wanted.update(dt);
    const prevHealth = player.health;
    police.update(dt, player, wanted);
    if (player.health < prevHealth) hud.showDamage();
    missions.update(dt, player, input);
    pistol.update(dt);

    if (!player.inCar && input.consumeClick()) {
      audio.ensure();
      const targets = [
        ...peds.peds.map((p) => p.mesh),
        ...police.cars.map((c) => c.mesh),
        city.group,
      ];
      const hit = pistol.fire(camera, targets);
      if (hit) {
        audio.shot();
        rig.shake(0.14);
        wanted.addCrime(1);
        // Walk up from the hit mesh to find the pedestrian it belongs to.
        let node = hit.object;
        while (node && !node.userData.ped) node = node.parent;
        if (node && node.userData.ped) node.userData.ped.fall();
        peds.scare(hit.point.x, hit.point.z);
      }
    }
    if (input.pressed('KeyR')) pistol.startReload();

    const speed01 = player.inCar ? Math.abs(player.car.speed) / 26 : 0;
    audio.setEngine(speed01, player.inCar);
    audio.setSiren(wanted.stars > 0);
    rig.update(dt, input, player.pos, player.heading, player.inCar, speed01);

    hud.update(dt, {
      cash: player.cash,
      stars: wanted.stars,
      health: player.health,
      ammo: pistol.ammo,
      reloading: pistol.reloading,
      inCar: player.inCar,
      speedKmh: player.inCar ? Math.abs(player.car.speed) * 3.6 : 0,
      missionLabel: missions.label(),
      missionMarker: missions.markerPos(),
      police: police.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      cars: traffic.cars.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      player: { x: player.pos.x, z: player.pos.z },
      heading: player.heading,
    });

    saveT += dt;
    if (saveT > 15) {
      saveT = 0;
      persist();
    }
  } else if (state === 'title') {
    rig.update(dt, input, new THREE.Vector3(0, 0, 0), 0, false, 0);
  } else if (state === 'paused') {
    if (input.pressed('Escape')) {
      document.getElementById('pause').style.display = 'none';
      state = 'playing';
    }
  }

  input.endFrame();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

frame();
