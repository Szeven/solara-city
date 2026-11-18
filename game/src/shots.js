// Screenshot scenes behind ?shot=cover|street|mission|chase (with &seed=N).
// Each one stages the real game — the same spawn code, the same world step, an
// autopilot driving or walking for a few seconds — then paints the frame, so the
// picture is what a short game really looks like and the same seed repeats it.

import { nearestRoadPoint } from './city.js';
import { nearestCar } from './player.js';

const SAMPLE = 1 / 60;

function fakeInput(drive) {
  return {
    move: () => drive,
    running: () => false,
    takeOrbit: () => ({ dx: 0, dy: 0 }),
    takeActions: () => 0,
  };
}

/** Pull traffic and pedestrians onto the roads around (x, z) so the frame is alive. */
function scatter(world, random, x, z) {
  for (const car of world.cars) {
    if (!car.isTraffic) continue;
    if (world.player.car === car) continue; // never move the car the player is driving
    const p = nearestRoadPoint(x + (random() - 0.5) * 160, z + (random() - 0.5) * 160);
    car.x = p.x;
    car.z = p.z;
    car.heading = (Math.floor(random() * 4) * Math.PI) / 2;
    car.speed = 8 + random() * 4;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const p = nearestRoadPoint(x + (random() - 0.5) * 120, z + (random() - 0.5) * 120);
    ped.x = p.x + (random() - 0.5) * 6;
    ped.z = p.z + (random() - 0.5) * 6;
    ped.tx = p.x;
    ped.tz = p.z;
    ped.mesh.position.set(ped.x, 0, ped.z);
  }
}

/** Drive straight ahead for `seconds`, steering gently toward the road ahead. */
function driveForward(api, seconds) {
  const { w, world } = api;
  for (let i = 0; i < seconds / SAMPLE; i++) {
    const car = world.player.car;
    if (!car) break;
    const ahead = { x: car.x + Math.sin(car.heading) * 40, z: car.z + Math.cos(car.heading) * 40 };
    const rp = nearestRoadPoint(ahead.x, ahead.z);
    const want = Math.atan2(rp.x - car.x, rp.z - car.z);
    let dh = want - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, dh * 1.5));
    w.step(fakeInput({ x: steer, y: 1 }), 0, api.camera, SAMPLE, true);
  }
}

function walkForward(api, seconds) {
  const { w, world } = api;
  for (let i = 0; i < seconds / SAMPLE; i++) {
    w.step(fakeInput({ x: 0, y: 1 }), 0, api.camera, SAMPLE, true);
  }
}

function placeCopBehind(api, dist, side) {
  const { world } = api;
  const p = world.player;
  const cop = world.police.spawnCop(p);
  // Behind the car in its direction of travel (the player's heading is stale
  // until the first drive step, so use the car's heading while in a car).
  const heading = p.car ? p.car.heading : p.heading;
  const back = heading + Math.PI;
  cop.x = p.x + Math.sin(back) * dist + Math.cos(back) * side;
  cop.z = p.z + Math.cos(back) * dist - Math.sin(back) * side;
  cop.heading = heading;
  cop.speed = 8; // closing in, not yet on the bumper, so the frame reads as a chase
  cop.mesh.position.set(cop.x, 0, cop.z);
  cop.mesh.rotation.y = cop.heading;
  return cop;
}

/**
 * Stage the named scene. The caller paints and sets __shotReady.
 * `api` = { w, world, render, hud, camera } from main.js.
 */
export function stageShot(name, api) {
  const { w, world, render } = api;
  const random = world.random;
  world.player.reset(20, 20);
  world.police.clear();
  world.cash = 1250;
  world.screen = 'play';

  if (name === 'street') {
    // On foot downtown, traffic and pedestrians all around.
    world.player.reset(48, 48);
    world.player.camYaw = Math.PI * 0.78;
    scatter(world, random, 48, 48);
    walkForward(api, 2);
    render.setCam(world.player.camYaw, 0.32);
    return;
  }
  if (name === 'mission') {
    // On foot at the docks, first job, the package marker and beacon in view.
    // The player stands on the road south of the docks intersection and walks
    // north toward the beacon; the camera sits behind him.
    world.missions.start(0);
    world.player.reset(-175, 200);
    const marker = world.missions.markerPos();
    const camYaw = Math.atan2(world.player.x - marker.x, world.player.z - marker.z);
    world.player.camYaw = camYaw;
    scatter(world, random, -175, 200);
    walkForward(api, 1.5);
    render.setCam(world.player.camYaw, 0.3);
    return;
  }
  if (name === 'chase') {
    // The Comet GT, 4 stars, cops closing in at the marina.
    // The Comet GT spawns on the road by the marina intersection; point it
    // east down a clear stretch and make the steal objective current so
    // getting in completes it. Cops start far enough back that they close
    // in during the drive instead of ramming the car into a wall.
    world.missions.start(1);
    const comet = world.missions.state.comet;
    comet.heading = Math.PI / 2;
    comet.mesh.rotation.y = comet.heading;
    world.missions.state.obj = 1;
    world.player.reset(comet.x + 2, comet.z + 2);
    w.enterCar(comet);
    world.police.addStars(3); // +1 from the steal makes 4
    placeCopBehind(api, 30, -5);
    placeCopBehind(api, 38, 5);
    placeCopBehind(api, 48, 0);
    scatter(world, random, comet.x, comet.z);
    driveForward(api, 2);
    render.setCam(world.player.car.heading + Math.PI, 0.3);
    return;
  }
  // Cover: a getaway in progress — driving, 3 stars, cops behind, a job on the HUD.
  world.missions.start(0);
  world.missions.state.obj = 2; // deliver to The Duchess
  const car = nearestCar(world.cars, 0, 0, 500);
  world.player.reset(car.x + 2, car.z);
  w.enterCar(car);
  // The getaway car starts on a clear east-west road by the plaza, heading
  // east, so the drive stays on tarmac — a random traffic car can face
  // across a block.
  car.x = 32;
  car.z = 32;
  car.heading = Math.PI / 2;
  car.speed = 0;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  world.player.x = car.x;
  world.player.z = car.z;
  world.police.addStars(3);
  placeCopBehind(api, 35, -10);
  placeCopBehind(api, 45, 10);
  scatter(world, random, 0, 0);
  driveForward(api, 2);
  // Three-quarter rear view: the cop behind the car sits off to one side
  // instead of blocking the getaway car.
  render.setCam(world.player.car.heading + Math.PI + 0.45, 0.3);
}
