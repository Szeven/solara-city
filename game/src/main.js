// Solara City — bootstrap, game loop, wanted system, save/load.
// Original open-world crime game, built from scratch for make.fun gta6-01.
import * as THREE from 'three';
import { CITY, WANTED, MISSIONS } from './config.js';
import { mulberry32, clamp } from './random.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { City } from './city.js';
import { TrafficSystem } from './vehicles.js';
import { PedSystem } from './people.js';
import { PoliceSystem } from './police.js';
import { MissionSystem } from './missions.js';
import { Player } from './player.js';
import { Hud } from './hud.js';
import { setupRenderer, setupLights, ChaseCamera } from './render.js';
import { applyShot } from './shots.js';

const SAVE_KEY = 'solara-city-save-v1';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = setupRenderer(this.canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    setupLights(this.scene);
    this.cameraRig = new ChaseCamera(this.camera);

    this.rng = mulberry32(20261120);
    this.sounds = new SoundBank();
    this.input = new Input(this.canvas);
    this.city = new City(this.scene, this.rng);
    this.traffic = new TrafficSystem(this.scene, this.city, this.rng);
    this.peds = new PedSystem(this.scene, this.city, this.rng);
    this.police = new PoliceSystem(this.scene, this.city, this.rng);
    this.missions = new MissionSystem(this.scene, this.city, this.rng);
    this.player = new Player(this.scene, -215, 0);
    this.scene.add(this.player.body);
    this.hud = new Hud();
    window.__game = this;

    this.state = 'title';
    this.heat = 0;
    this.lastCrimeAt = -1e9;
    this.time = 0;
    this.titleAngle = 0;
    this.shotMode = null;

    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) this.shotMode = shot;

    this.load();
    if (this.shotMode) {
      applyShot(this, this.shotMode);
    } else {
      this.hud.showTitle();
      this.refreshTitleButtons();
    }

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // --- wanted level ---
  get wanted() {
    return { heat: this.heat, stars: Math.min(WANTED.maxStars, Math.floor(this.heat)) };
  }

  setHeat(stars) {
    this.heat = stars;
    this.lastCrimeAt = this.time;
  }

  addHeat(n) {
    this.heat = Math.min(WANTED.maxStars + 0.99, this.heat + n);
    this.lastCrimeAt = this.time;
  }

  // --- save / load ---
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: this.player.cash,
        done: [...this.missions.done],
        x: this.player.x,
        z: this.player.z,
      }));
    } catch (e) { /* storage unavailable: the game still plays */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.player.cash = s.cash || 0;
      this.missions.done = new Set(s.done || []);
      if (typeof s.x === 'number') {
        this.player.x = s.x;
        this.player.z = s.z;
      }
    } catch (e) { /* ignore a corrupt save */ }
  }

  refreshTitleButtons() {
    const cont = document.getElementById('continue-btn');
    if (!cont) return;
    let hasSave = false;
    try { hasSave = !!localStorage.getItem(SAVE_KEY); } catch (e) { /* no storage */ }
    cont.style.display = hasSave ? 'block' : 'none';
    const done = document.getElementById('jobs-done');
    if (done) {
      done.textContent = this.missions.done.size > 0
        ? `Jobs done: ${[...this.missions.done].map((id) => MISSIONS.find((m) => m.id === id).name).join(', ')}`
        : '';
    }
  }

  toast(msg, seconds) {
    this.hud.toast(msg, seconds);
  }

  startJob(id) {
    this.sounds.ensure();
    if (this.state === 'title') this.state = 'playing';
    if (this.state !== 'playing') return;
    this.hud.hideAll();
    if (this.missions.start(id, this)) this.save();
  }

  startFreeRoam() {
    this.sounds.ensure();
    this.state = 'playing';
    this.hud.hideAll();
    this.toast('Free Roam — press 1-4 for a job, E to steal a car');
  }

  continueGame() {
    this.sounds.ensure();
    this.load();
    this.state = 'playing';
    this.hud.hideAll();
    this.toast('Welcome back to Solara City');
  }

  busted() {
    if (this.state !== 'playing') return;
    this.state = 'busted';
    this.sounds.busted();
    this.sounds.siren(false);
    const lost = Math.floor(this.player.cash * 0.2);
    this.player.cash -= lost;
    this.player.x = 0;
    this.player.z = 0;
    this.player.health = 100;
    this.heat = 0;
    if (this.player.inCar) this.exitCar();
    this.police.clear();
    document.getElementById('busted-lost').textContent = lost > 0 ? `You lost $${lost} in fines.` : 'The Duchess bailed you out this time.';
    this.hud.showBusted();
    this.save();
  }

  wasted() {
    if (this.state !== 'playing') return;
    this.state = 'wasted';
    this.sounds.siren(false);
    const lost = Math.floor(this.player.cash * 0.1);
    this.player.cash -= lost;
    this.player.x = 0;
    this.player.z = 0;
    this.player.health = 100;
    this.heat = 0;
    if (this.player.inCar) this.exitCar();
    this.police.clear();
    document.getElementById('wasted-lost').textContent = lost > 0 ? `You lost $${lost} while you were out.` : 'The Duchess patched you up.';
    this.hud.showWasted();
    this.save();
  }

  resumeFromBusted() {
    this.sounds.ensure();
    this.state = 'playing';
    this.hud.hideAll();
  }

  enterCar(car) {
    const p = this.player;
    p.inCar = true;
    p.car = car;
    car.isPlayer = true;
    if (car.isParked && !car.stolen) {
      car.stolen = true;
      this.addHeat(WANTED.stealHeat);
      this.toast('You stole the car — the cops noticed.');
      this.sounds.thud();
    }
    car.isParked = false;
    p.x = car.x;
    p.z = car.z;
    this.sounds.click();
  }

  exitCar() {
    const p = this.player;
    const car = p.car;
    if (!car) return;
    car.isPlayer = false;
    p.inCar = false;
    p.car = null;
    // Step out to the side of the car.
    p.x = car.x + Math.cos(car.heading) * 2.2;
    p.z = car.z - Math.sin(car.heading) * 2.2;
    this.city.resolveCircle(p, 0.6);
    p.syncBody();
  }

  // --- frame loop ---
  loop(t) {
    requestAnimationFrame((nt) => this.loop(nt));
    const dt = clamp((t - this.last) / 1000, 0, 0.05);
    this.last = t;
    this.time += dt;
    if (this.state === 'title') {
      this.titleAngle += dt * 0.05;
      const r = 170;
      this.camera.position.set(Math.sin(this.titleAngle) * r, 70, Math.cos(this.titleAngle) * r);
      this.camera.lookAt(0, 0, 0);
      this.traffic.update(dt, this.city);
      this.peds.update(dt, this.city);
    } else if (this.state === 'playing') {
      this.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  update(dt) {
    const input = this.input;
    const p = this.player;
    const mouse = input.consumeMouse();
    if (input.locked || this.shotMode) {
      p.yaw -= mouse.dx * 0.0022;
      p.pitch = clamp(p.pitch - mouse.dy * 0.0022, -0.5, 0.6);
    }
    if (input.hit('KeyP') || input.hit('Escape')) {
      this.state = 'paused';
      this.hud.showPause();
      return;
    }
    if (input.hit('KeyM')) this.sounds.setMuted(!this.sounds.muted);
    if (input.hit('KeyR')) p.startReload(this);
    if (input.hit('Digit1')) this.startJob(1);
    if (input.hit('Digit2')) this.startJob(2);
    if (input.hit('Digit3')) this.startJob(3);
    if (input.hit('Digit4')) this.startJob(4);

    // Enter / exit a car.
    if (input.hit('KeyE')) {
      if (p.inCar) {
        this.exitCar();
      } else {
        const car = this.traffic.nearestStealable(p.x, p.z, 4);
        if (car) this.enterCar(car);
      }
    }

    if (p.inCar && p.car) {
      const throttle = input.down('KeyW') ? 1 : input.down('KeyS') || input.down('Space') ? -1 : 0;
      const steer = (input.down('KeyA') ? 1 : 0) + (input.down('KeyD') ? -1 : 0);
      p.car.drive(dt, throttle, steer);
      // Screenshot staging: keep the car rolling at a steady speed
      // so the shot reads as a chase, not a parked car.
      if (this.cruiseSpeed) p.car.speed = this.cruiseSpeed;
      this.city.resolveCircle(p.car, 1.6);
      this.traffic.separate();
      // Running over a pedestrian at speed is a crime.
      const hit = this.peds.nearest(p.car.x, p.car.z, 2.2);
      if (hit && Math.abs(p.car.speed) > 4) {
        this.peds.kill(hit);
        this.addHeat(WANTED.killHeat);
        this.sounds.thud();
      }
    } else {
      p.updateOnFoot(dt, this);
      if ((input.mouseDown || mouse.clicked) && !p.dead) p.tryFire(this);
    }
    p.update(dt, this);

    // Wanted heat cools after a quiet spell.
    if (this.time - this.lastCrimeAt > WANTED.coolSeconds && this.heat > 0) {
      this.heat = Math.max(0, this.heat - WANTED.decayPerSecond * dt);
    }
    this.sounds.siren(this.wanted.stars >= 1 && this.state === 'playing');
    this.sounds.engine(p.inCar ? Math.abs(p.car.speed) / 34 : 0, p.inCar);

    this.traffic.update(dt, this.city);
    this.traffic.separate();
    this.peds.update(dt, this.city);
    this.police.update(dt, this);
    this.missions.update(dt, this);
    this.cameraRig.update(dt, this);
    this.hud.update(this);
  }
}

// Boot.
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  document.getElementById('free-roam-btn')?.addEventListener('click', () => game.startFreeRoam());
  document.getElementById('continue-btn')?.addEventListener('click', () => game.continueGame());
  document.getElementById('resume-btn')?.addEventListener('click', () => {
    game.state = 'playing';
    game.hud.hideAll();
  });
  document.getElementById('quit-title-btn')?.addEventListener('click', () => {
    game.state = 'title';
    game.hud.showTitle();
    game.refreshTitleButtons();
  });
  document.getElementById('busted-btn')?.addEventListener('click', () => game.resumeFromBusted());
  document.getElementById('wasted-btn')?.addEventListener('click', () => game.resumeFromBusted());
  document.getElementById('mute-btn')?.addEventListener('click', () => {
    game.sounds.setMuted(!game.sounds.muted);
  });
});
