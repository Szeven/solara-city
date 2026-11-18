// The world: everything that lives in Solara City, stepped in fixed 1/60 s ticks.
// It owns the city, the player, traffic, pedestrians, police and missions, and
// turns inputs into events the renderer and the HUD show (shots, crashes, busts,
// mission lines). The caller drives it through step() and the small verbs below.

import { PLAYER, CAR, TRAFFIC, PEDS, WANTED } from './config.js';
import { createRandom } from './random.js';
import { createCity, nearestRoadPoint } from './city.js';
import { createAudio } from './audio.js';
import { createPlayer, stepOnFoot, stepDriving, shoot, nearestCar } from './player.js';
import { buildCar, carState, spawnTrafficCar, stepTraffic } from './vehicles.js';
import { spawnPedestrian, stepPedestrian } from './people.js';
import { createPolice, stepPolice } from './police.js';
import { createMissions } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_DONE = 'done';

export function createWorld(scene, seed) {
  const random = createRandom(seed);
  const city = createCity(random);
  scene.add(city.group);
  const audio = createAudio();
  const player = createPlayer(scene, 20, 20);
  const police = createPolice(scene, city.graph, random);
  const cars = []; // every car: traffic, parked, special, and the police cars too
  const peds = [];
  const parked = [];

  // Parked cars along the roads, free to take — stealing one is a crime.
  for (let i = 0; i < 10; i++) {
    const p = nearestRoadPoint((random() - 0.5) * 400, (random() - 0.5) * 400);
    const color = [0xd84a4a, 0x3a7ad8, 0xe8c832, 0x4ad87a, 0xe8e8e8, 0x2a2a2e][i % 6];
    const mesh = buildCar(color, 'civilian');
    scene.add(mesh);
    const car = carState(mesh, p.x + (random() - 0.5) * 4, p.z + (random() - 0.5) * 4, random() * Math.PI * 2, color, 'parked');
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
    mesh.userData.owner = { type: 'car', car };
    cars.push(car);
    parked.push(car);
  }
  for (let i = 0; i < TRAFFIC.count; i++) {
    const car = spawnTrafficCar(scene, city.graph, random, player.x, player.z);
    car.mesh.userData.owner = { type: 'car', car };
    cars.push(car);
  }
  for (let i = 0; i < PEDS.count; i++) {
    const ped = spawnPedestrian(scene, random, player.x, player.z);
    ped.mesh.userData.owner = { type: 'ped', ped };
    peds.push(ped);
  }

  const world = {
    scene,
    city,
    random,
    audio,
    player,
    police,
    cars,
    peds,
    parked,
    cash: 0,
    screen: SCREEN_TITLE,
    message: '',
    messageT: 0,
    objectiveText: '',
    missionName: '',
    promptText: '',
    dangerAt: null,
    shotAt: null,
    tracer: null,
    marker: null,
    missions: null,
    save: null, // set by main.js: writes { cash, done } to localStorage
    bestCash: 0,
    doneMission: null,
    nextMission: null,
  };

  const hooks = {
    announce(text) {
      world.message = text;
      world.messageT = 6;
    },
    addCash(n) {
      world.cash += n;
    },
    jingle() {
      audio.mission();
    },
    police,
    spawnSpecialCar(kind, x, z, heading, color) {
      const mesh = buildCar(color, kind === 'sport' ? 'sport' : 'civilian');
      scene.add(mesh);
      const car = carState(mesh, x, z, heading, color, kind);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = heading;
      mesh.userData.owner = { type: 'car', car };
      cars.push(car);
      return car;
    },
  };
  world.missions = createMissions(hooks);

  function tagOwners() {
    for (const c of police.cars) c.mesh.userData.owner = { type: 'car', car: c };
    for (const o of police.officers) o.mesh.userData.owner = { type: 'officer', off: o };
  }

  function enterCar(car) {
    if (!car || car.kind === 'police' || car.kind === 'courier') return false;
    if (car.isTraffic) {
      cars.splice(cars.indexOf(car), 1);
      police.addStars(1);
      hooks.announce('You stole a car! The driver ran off screaming.');
    }
    car.isPlayer = true;
    player.inCar = true;
    player.car = car;
    player.mesh.visible = false;
    audio.click();
    const ev = world.missions.carEntered(car);
    if (ev && ev.event === 'complete') onMissionEvent(ev);
    return true;
  }

  function exitCar() {
    const car = player.car;
    if (!car) return;
    car.isPlayer = false;
    const px = car.x - Math.sin(car.heading + Math.PI / 2) * 2.4;
    const pz = car.z - Math.cos(car.heading + Math.PI / 2) * 2.4;
    player.x = px;
    player.z = pz;
    player.inCar = false;
    player.car = null;
    player.mesh.visible = true;
    player.mesh.position.set(px, 0, pz);
    if (!cars.includes(car)) cars.push(car);
    car.mesh.userData.owner = { type: 'car', car };
  }

  function onMissionEvent(ev) {
    if (!ev) return;
    if (ev.event === 'complete') {
      world.screen = SCREEN_DONE;
      world.doneMission = ev.mission;
      world.nextMission = ev.next;
      if (world.save) world.save();
    } else if (ev.event === 'failed') {
      world.screen = SCREEN_BUSTED;
    }
  }

  function fireShot(camera) {
    const targets = [];
    for (const c of cars) if (!c.isPlayer && !c.dead) targets.push(c.mesh);
    for (const c of police.cars) if (!c.dead) targets.push(c.mesh);
    for (const p of peds) if (!p.dead && p.state !== 'down') targets.push(p.mesh);
    for (const o of police.officers) if (!o.dead) targets.push(o.mesh);
    const res = shoot(player, camera, targets);
    if (!res) return null;
    if (res.type === 'dry') {
      audio.click();
      return res;
    }
    audio.shot();
    world.tracer = res.point || null;
    world.shotAt = { x: player.x, z: player.z };
    if (res.type === 'hit' && res.owner) {
      const o = res.owner;
      if (o.type === 'ped') {
        o.ped.state = 'down';
        o.ped.dead = true;
        o.ped.mesh.rotation.x = Math.PI / 2;
        o.ped.mesh.position.y = 0.3;
        police.addStars(WANTED.shootPed);
        hooks.announce('A pedestrian is down. Someone called the cops.');
      } else if (o.type === 'officer') {
        o.off.health -= 1;
        if (o.off.health <= 0) {
          o.off.dead = true;
          scene.remove(o.off.mesh);
          police.addStars(WANTED.shootCop);
          hooks.announce('You shot a cop. The whole force is coming.');
        }
      } else if (o.type === 'car') {
        const car = o.car;
        car.health -= CAR.hitDamage;
        if (car.kind === 'police') police.addStars(WANTED.smashCopCar);
        else police.addStars(1);
        if (car.health <= 0 && !car.dead) {
          car.dead = true;
          scene.remove(car.mesh);
          hooks.announce(car.kind === 'courier' ? 'Courier down!' : 'Car destroyed.');
          const ev = world.missions.carDestroyed(car);
          if (ev) onMissionEvent(ev);
        }
      }
    }
    // Nearby pedestrians flee from the shot.
    world.dangerAt = { x: player.x, z: player.z, t: 3 };
    return res;
  }

  function step(input, actions, camera, dt, active) {
    tagOwners();
    if (world.messageT > 0) world.messageT -= dt;
    if (world.dangerAt) {
      world.dangerAt.t -= dt;
      if (world.dangerAt.t <= 0) world.dangerAt = null;
    }
    if (world.tracer) world.tracer = null;

    const move = input.move();
    if (active) {
      if (player.inCar) {
        stepDriving(player, move, dt, city.colliders, cars, (s) => {
          audio.crash();
          player.damage(Math.floor(s / 6));
        });
      } else {
        stepOnFoot(player, move, input.running(), dt, city.colliders);
      }
      // The player car runs a pedestrian over.
      if (player.inCar && player.car) {
        for (const p of peds) {
          if (p.dead || p.state === 'down') continue;
          if (Math.hypot(p.x - player.x, p.z - player.z) < 2.4 && Math.abs(player.car.speed) > 4) {
            p.state = 'down';
            p.dead = true;
            p.mesh.rotation.x = Math.PI / 2;
            p.mesh.position.y = 0.3;
            police.addStars(WANTED.runOver);
            audio.crash();
            hooks.announce('You ran someone over!');
          }
        }
      }
    }

    // Traffic.
    for (const car of cars) {
      if (car.isTraffic && !car.dead) stepTraffic(car, dt, city.graph, random, cars, player);
    }
    const liveTraffic = cars.filter((c) => c.isTraffic && !c.dead);
    if (liveTraffic.length < TRAFFIC.count) {
      const car = spawnTrafficCar(scene, city.graph, random, player.x, player.z);
      car.mesh.userData.owner = { type: 'car', car };
      cars.push(car);
    }
    for (const car of [...cars]) {
      if (car.isTraffic && Math.hypot(car.x - player.x, car.z - player.z) > TRAFFIC.despawn) {
        car.dead = true;
        scene.remove(car.mesh);
        cars.splice(cars.indexOf(car), 1);
      }
    }

    // Pedestrians.
    for (const ped of peds) {
      if (ped.dead) continue;
      let danger = null;
      if (world.dangerAt && Math.hypot(ped.x - world.dangerAt.x, ped.z - world.dangerAt.z) < 40) {
        danger = world.dangerAt;
      } else if (player.inCar && player.car && Math.abs(player.car.speed) > 12 && Math.hypot(ped.x - player.x, ped.z - player.z) < 14) {
        danger = { x: player.x, z: player.z };
      }
      stepPedestrian(ped, dt, random, danger);
    }
    const livePeds = peds.filter((p) => !p.dead);
    if (livePeds.length < PEDS.count) {
      const ped = spawnPedestrian(scene, random, player.x, player.z);
      ped.mesh.userData.owner = { type: 'ped', ped };
      peds.push(ped);
    }
    for (const ped of [...peds]) {
      if (Math.hypot(ped.x - player.x, ped.z - player.z) > PEDS.despawn) {
        scene.remove(ped.mesh);
        peds.splice(peds.indexOf(ped), 1);
      }
    }

    // Police.
    const pres = stepPolice(police, dt, player, city.colliders, cars);
    if (pres) {
      if (pres.type === 'rammed') {
        player.damage(pres.damage);
        audio.crash();
      }
      if (pres.type === 'busted') {
        world.screen = SCREEN_BUSTED;
        audio.fail();
        const ev = world.missions.fail('Busted! The cops took you in.');
        if (ev) onMissionEvent(ev);
      }
    }

    // Missions, only while the player is in control.
    if (active) {
      const ev = world.missions.update(player.x, player.z, player);
      if (ev) onMissionEvent(ev);
    }

    if (player.wasted) {
      world.screen = SCREEN_WASTED;
      world.cash = Math.max(0, world.cash - 200);
      audio.fail();
      world.missions.fail('Wasted! You wake up at the hospital, lighter by $200.');
      if (world.save) world.save();
    }

    // Engine hum and sirens.
    audio.engine(player.inCar ? Math.abs(player.car.speed) / CAR.top : 0, player.inCar);
    audio.siren(police.wanted > 0 && police.cars.length > 0);

    // HUD text.
    const m = world.missions;
    world.missionName = m.def() ? m.def().name : 'Free Roam';
    world.objectiveText = m.objective() ? m.objective().text : 'Explore Solara City. Take a job from the title screen (Enter).';
    world.marker = m.markerPos();
    // The prompt line: what E does right here, right now.
    let prompt = '';
    if (active && !player.inCar) {
      const mp = m.interactPrompt(player.x, player.z);
      if (mp) prompt = mp;
      else if (nearestCar(cars, player.x, player.z, PLAYER.enterRange)) prompt = 'Press E to enter car';
    } else if (active && player.inCar) {
      prompt = 'Press E to get out';
    }
    world.promptText = prompt;
    return world;
  }

  return {
    world,
    step,
    enterCar,
    exitCar,
    fireShot,
    onMissionEvent,
    startMission(i) {
      world.missions.start(i);
      world.screen = SCREEN_PLAY;
    },
    freeRoam() {
      world.screen = SCREEN_PLAY;
    },
    reset() {
      player.reset(20, 20);
      police.clear();
      world.cash = 0;
      world.screen = SCREEN_TITLE;
      world.missions.state.index = -1;
      world.missions.state.obj = 0;
    },
  };
}
