// Screenshot staging: ?shot=<name>&seed=<n> sets up a real scene of the
// game — no faked images, the same code the player plays. The capture
// script waits, then takes the picture.

import { PLACES } from './config.js';
import { spawnParkedCar } from './vehicles.js';
import { spawnPedestrian } from './people.js';

function putPlayerInCar(w, x, z, heading, color) {
  const car = spawnParkedCar(w.scene, x, z, heading, color);
  car.kind = 'player';
  w.cars.push(car);
  w.player.inCar = true;
  w.player.car = car;
  w.player.mesh.visible = false;
  w.player.pos.set(x, 0, z);
  w.player.heading = heading;
  w.player.camHeading = heading;
  car.speed = 24;
  return car;
}

function spawnCopBehind(w, x, z, heading) {
  w.police.spawnCar({ x: x - 30, z: z - 30 });
  const cop = w.police.cars[w.police.cars.length - 1];
  if (cop) {
    cop.pos.set(x, 0, z);
    cop.heading = heading;
    cop.speed = 22;
  }
  return cop;
}

export function applyShot(w, name, seed) {
  const P = w.player;
  if (name === 'cover') {
    // Getaway in progress: driving, 3 stars, a cop behind, job on the HUD.
    const car = putPlayerInCar(w, 25, 32, 0, 0xc23b2e);
    w.setStars(3);
    spawnCopBehind(w, 25, -6, 0);
    w.missions.start(0);
    // A couple of traffic cars ahead for depth.
    w.cars.push(spawnParkedCar(w.scene, 25, 90, 0, 0x2e6fc2));
    P.camHeading = 0;
    return car;
  }
  if (name === 'street') {
    // On foot downtown, traffic and pedestrians around.
    P.pos.set(8, 0, 25);
    P.heading = Math.PI;
    P.camHeading = Math.PI;
    P.mesh.position.set(8, 0, 25);
    for (let i = 0; i < 4; i++) {
      w.peds.push(spawnPedestrian(w.scene, w.rng, { x: 8, z: 25 }));
    }
    w.setStars(0);
    return null;
  }
  if (name === 'mission') {
    // First job at the docks: package marker and beacon in view.
    P.pos.set(PLACES.docks.x - 20, 0, PLACES.docks.z + 12);
    P.heading = Math.atan2(PLACES.docks.x - P.pos.x, PLACES.docks.z - P.pos.z);
    P.camHeading = P.heading;
    P.mesh.position.copy(P.pos);
    w.missions.start(0);
    w.setStars(0);
    return null;
  }
  if (name === 'chase') {
    // Comet GT, 5 stars, cops closing in at speed.
    const car = putPlayerInCar(w, -75, -25, 0, 0xe0a92e);
    w.setStars(5);
    spawnCopBehind(w, -75, -70, 0);
    spawnCopBehind(w, -75, -95, 0);
    P.camHeading = 0;
    return car;
  }
  // Unknown shot name: plain free roam.
  P.pos.set(25, 0, 25);
  P.mesh.position.copy(P.pos);
  w.setStars(0);
  return null;
}
