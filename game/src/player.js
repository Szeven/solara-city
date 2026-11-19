// The player: on foot and behind the wheel, pistol in hand. Movement is
// relative to the camera; E steals or enters the nearest car, a click shoots.

import * as THREE from 'three';
import { PLAYER, WEAPON, CAR } from './config.js';
import { createPedMesh } from './people.js';
import { resolveCollisions, clampToCity } from './city.js';

export function createPlayer(scene) {
  const mesh = createPedMesh(0x2e6fc2);
  scene.add(mesh);
  return {
    mesh,
    pos: new THREE.Vector3(25, 0, 25),
    heading: 0,
    camHeading: 0,
    speed: 0,
    health: PLAYER.health,
    inCar: false,
    car: null,
    ammo: WEAPON.ammo,
    reloading: false,
    reloadT: 0,
    fireCd: 0,
    lastShotAt: 0,
    vel: new THREE.Vector3(),
    hurtCd: 0,
  };
}

// Step the player for one frame. Returns events for main.js to act on:
// {type:'steal'|'enter'|'exit'|'shoot'|'hit'|'reload'|'dead'}.
export function stepPlayer(player, input, actions, dt, ctx) {
  const events = [];
  player.fireCd -= dt;
  player.hurtCd -= dt;

  if (player.reloading) {
    player.reloadT -= dt;
    if (player.reloadT <= 0) {
      player.reloading = false;
      player.ammo = WEAPON.ammo;
      events.push({ type: 'reload' });
    }
  }

  if (player.inCar) {
    // Driving is handled by the car physics in vehicles.js; here we only
    // watch for exit and shooting (no shooting from a car).
    if (actions.interact) {
      const car = player.car;
      player.inCar = false;
      player.car = null;
      const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
      player.pos.set(car.pos.x + side.x * 2.4, 0, car.pos.z + side.z * 2.4);
      player.heading = car.heading;
      player.mesh.visible = true;
      events.push({ type: 'exit', car });
    }
    return events;
  }

  // --- on foot -----------------------------------------------------------
  const move = input.move();
  const run = input.running();
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  // Camera-relative movement: forward is where the camera looks.
  const fx = Math.sin(player.camHeading);
  const fz = Math.cos(player.camHeading);
  const rx = Math.cos(player.camHeading);
  const rz = -Math.sin(player.camHeading);
  let mx = fx * move.y + rx * move.x;
  let mz = fz * move.y + rz * move.x;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    player.heading = Math.atan2(mx, mz);
    player.pos.x += mx * speed * dt;
    player.pos.z += mz * speed * dt;
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  resolveCollisions(player.pos, PLAYER.radius, ctx.colliders);
  clampToCity(player.pos);
  player.mesh.position.set(player.pos.x, 0, player.pos.z);
  player.mesh.rotation.y = player.heading;
  player.vel.set(mx * player.speed, 0, mz * player.speed);

  // Enter the nearest car.
  if (actions.interact) {
    let best = null;
    let bestD = 4;
    for (const car of ctx.cars) {
      const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    if (best) {
      player.inCar = true;
      player.car = best;
      best.kind = 'player';
      player.mesh.visible = false;
      const wasStolen = best.stolen === true;
      best.stolen = true;
      events.push({ type: 'enter', car: best });
      if (!wasStolen) events.push({ type: 'steal', car: best });
    }
  }

  // Shoot: hitscan toward the camera's aim on the ground plane.
  if (actions.shoot && !player.reloading && player.fireCd <= 0) {
    player.fireCd = WEAPON.fireSeconds;
    if (player.ammo > 0) {
      player.ammo -= 1;
      player.lastShotAt = performance.now();
      const hit = shootRay(player, ctx);
      events.push({ type: 'shoot' });
      if (hit) events.push({ type: 'hit', target: hit });
      if (player.ammo === 0) {
        player.reloading = true;
        player.reloadT = WEAPON.reloadSeconds;
      }
    }
  }
  if (actions.reload && !player.reloading && player.ammo < WEAPON.ammo) {
    player.reloading = true;
    player.reloadT = WEAPON.reloadSeconds;
  }
  return events;
}

function shootRay(player, ctx) {
  // Aim from the player along the camera heading, slightly downward.
  const dir = { x: Math.sin(player.camHeading), z: Math.cos(player.camHeading) };
  let best = null;
  let bestAlong = WEAPON.range;
  for (const t of ctx.shootables || []) {
    const dx = t.pos.x - player.pos.x;
    const dz = t.pos.z - player.pos.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 1 || along > WEAPON.range) continue;
    const perp = Math.abs(dx * dir.z - dz * dir.x);
    if (perp > t.radius + 0.6) continue;
    if (along < bestAlong) {
      bestAlong = along;
      best = t;
    }
  }
  if (best) {
    ctx.tracer?.(player.pos, best.pos);
    return best;
  }
  // Miss: tracer to a point far ahead.
  const end = {
    x: player.pos.x + dir.x * WEAPON.range,
    z: player.pos.z + dir.z * WEAPON.range,
  };
  ctx.tracer?.(player.pos, end);
  return null;
}

export function damagePlayer(player, amount) {
  if (player.hurtCd > 0) return false;
  player.hurtCd = 0.6;
  player.health -= amount;
  return player.health <= 0;
}

export function healPlayer(player, amount) {
  player.health = Math.min(PLAYER.health, player.health + amount);
}

export function respawnPlayer(player, x, z) {
  player.pos.set(x, 0, z);
  player.heading = 0;
  player.health = PLAYER.health;
  player.inCar = false;
  player.car = null;
  player.ammo = WEAPON.ammo;
  player.reloading = false;
  player.mesh.visible = true;
  player.mesh.position.set(x, 0, z);
}
