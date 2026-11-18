// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, paused,
// busted, wasted and mission done.
//
// ?seed=N fixes the city. ?shot=cover|street|mission|chase (with &seed=N) stages
// that scene instead of running the loop, paints it, and sets window.__shotReady
// for a screenshot.

import * as THREE from 'three';
import { STEP, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { createWorld, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED, SCREEN_DONE } from './world.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_PAUSE, ACTION_SHOOT, ACTION_MUTE, ACTION_RELOAD, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';
import { nearestCar } from './player.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const minimap = document.getElementById('minimap');
const status = document.getElementById('status');
const render = createRenderer(canvas, minimap);
const { world, step, enterCar, exitCar, fireShot, startMission, freeRoam } = createWorld(render.scene, seed);
const hud = createHud();
const input = createInput(canvas);

const stillInput = {
  move: () => ({ x: 0, y: 0 }),
  running: () => false,
  takeOrbit: () => ({ dx: 0, dy: 0 }),
  takeActions: () => 0,
};

// The save lives in localStorage; the world calls it when a job pays out.
world.save = () => writeSave({ cash: world.cash, done: world.missions.state.done });

function readSave() {
  return loadSave();
}

function announce(message) {
  status.textContent = message;
}

function backToTitle(spawnX, spawnZ) {
  world.player.reset(spawnX, spawnZ);
  world.police.clear();
  world.screen = SCREEN_TITLE;
  world.missions.state.index = -1;
  world.missions.state.obj = 0;
  world.doneMission = null;
  world.nextMission = null;
  hud.hidePanel();
  hud.titleScreen(readSave());
  announce('Solara City. Press 1 to 4 to start a job, Enter for Free Roam.');
}

function runShot(name) {
  const api = { w: { step, enterCar, exitCar }, world, render, hud, camera: render.camera };
  stageShot(name, api);
  hud.hideTitle();
  // Keep painting every frame so a screenshot always catches a fresh frame.
  function paint() {
    render.update(0.016, world, stillInput);
    hud.update(world);
    requestAnimationFrame(paint);
  }
  requestAnimationFrame(paint);
  window.__shotReady = true;
}

function runGame() {
  let save = readSave();
  let lastScreen = world.screen;
  let muted = false;
  let accumulator = 0;
  let last = performance.now();

  hud.titleScreen(save);
  announce('Solara City. Press 1 to 4 to start a job, Enter for Free Roam.');

  // Sound starts on the first gesture, never before.
  const unlock = () => world.audio.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  function showEndPanel() {
    if (world.screen === SCREEN_BUSTED) {
      hud.showPanel('<h2>BUSTED</h2><p>The cops took you in. Your jobs are on hold — the city is still yours to take back.</p><p class="prompt-line">Press <b>Enter</b> to continue</p>');
      announce('Busted. Press Enter to continue.');
    } else if (world.screen === SCREEN_WASTED) {
      hud.showPanel('<h2>WASTED</h2><p>You wake up at the hospital, lighter by $200. The Duchess is still waiting.</p><p class="prompt-line">Press <b>Enter</b> to continue</p>');
      announce('Wasted. Press Enter to continue.');
    } else if (world.screen === SCREEN_DONE) {
      const m = world.doneMission;
      const next = world.nextMission !== null && world.nextMission !== undefined
        ? `<p>Next job: <b>${['The First Pickup', 'Hot Wheels', 'Breaker Down', 'Payday'][world.nextMission]}</b> — press <b>${world.nextMission + 1}</b> on the title screen.</p>`
        : '<p>That was the last job. Solara City is yours — free roam and keep the score climbing.</p>';
      hud.showPanel(`<h2>JOB DONE</h2><p>${m ? m.name : 'Job'} complete — $${m ? m.reward.toLocaleString() : 0} in the bag.</p>${next}<p class="prompt-line">Press <b>Enter</b> to continue</p>`);
      announce(`Job done. ${m ? m.name : ''}. Press Enter to continue.`);
    }
  }

  function handleTitleKeys() {
    const pressed = input.takePressed();
    for (let i = 0; i < 4; i++) {
      if (pressed.has(`Digit${i + 1}`) || pressed.has(`Numpad${i + 1}`)) {
        hud.hideTitle();
        startMission(i);
        announce(`Job ${i + 1} started.`);
        return;
      }
    }
    if (pressed.has('KeyC') && save) {
      world.cash = save.cash;
      world.missions.state.done = [...save.done];
      hud.hideTitle();
      freeRoam();
      announce('Save loaded. Free Roam.');
      return;
    }
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      hud.hideTitle();
      freeRoam();
      announce('Free Roam. Explore Solara City.');
    }
  }

  function handlePlayActions() {
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      world.screen = SCREEN_PAUSED;
      hud.showPanel('<h2>PAUSED</h2><p class="prompt-line">Press <b>P</b> to continue</p>');
      announce('Paused.');
      return;
    }
    if (actions & ACTION_MUTE) {
      muted = !muted;
      world.audio.setMuted(muted);
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RELOAD && !world.player.inCar && world.player.ammo < PLAYER.ammo) {
      world.player.reloading = PLAYER.reload;
    }
    if (actions & ACTION_INTERACT) {
      if (world.player.inCar) {
        exitCar();
      } else {
        const ev = world.missions.interact(world.player.x, world.player.z);
        if (ev && ev.event === 'complete') {
          // Handled by the screen change below.
        } else if (!ev) {
          const car = nearestCar(world.cars, world.player.x, world.player.z, PLAYER.enterRange);
          if (car) enterCar(car);
        }
      }
    }
    if (actions & ACTION_SHOOT) {
      const res = fireShot(render.camera);
      if (res && res.point) {
        render.muzzle(new THREE.Vector3(world.player.x, 1.2, world.player.z), res.point);
      }
    }
  }

  function handlePausedActions() {
    const actions = input.takeActions();
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
      world.screen = SCREEN_PLAY;
      hud.hidePanel();
      announce('Playing.');
    }
  }

  function handleEndActions() {
    const actions = input.takeActions();
    if (!(actions & ACTION_CONFIRM)) return;
    if (world.screen === SCREEN_WASTED) backToTitle(100, -100); // the hospital
    else backToTitle(20, 20);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    // A screen change shows (or hides) its panel once.
    if (world.screen !== lastScreen) {
      if (world.screen === SCREEN_BUSTED || world.screen === SCREEN_WASTED || world.screen === SCREEN_DONE) showEndPanel();
      if (world.screen === SCREEN_TITLE) hud.hidePanel();
      lastScreen = world.screen;
    }

    if (world.screen === SCREEN_TITLE) {
      handleTitleKeys();
      while (accumulator >= STEP) {
        step(stillInput, 0, render.camera, STEP, false);
        accumulator -= STEP;
      }
    } else if (world.screen === SCREEN_PLAY) {
      handlePlayActions();
      while (accumulator >= STEP && world.screen === SCREEN_PLAY) {
        step(input, 0, render.camera, STEP, true);
        accumulator -= STEP;
      }
    } else if (world.screen === SCREEN_PAUSED) {
      handlePausedActions();
      accumulator = 0;
    } else {
      handleEndActions();
      accumulator = 0;
    }
    render.update(Math.min(accumulator, STEP), world, input);
    hud.update(world);
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === SCREEN_PLAY) {
      world.screen = SCREEN_PAUSED;
      hud.showPanel('<h2>PAUSED</h2><p class="prompt-line">Press <b>P</b> to continue</p>');
      announce('Paused.');
    }
  });

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
