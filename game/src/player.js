// The player: Jax Marlowe, wheelman. On foot he walks and runs under a
// third-person camera, shoots a pistol with the mouse, and steals cars with E.
// In a car he drives with the arcade model from vehicles.js. Health, ammo and
// the busted / wasted states live here too.

import * as THREE from 'three';
import { PLAYER, CAR, WANTED, PALETTE } from './config.js';
import { collideCircle, clampToCity } from './city.js';
import { stepPlayerCar } from './vehicles.js';

function buildPlayerMesh() {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: PALETTE.player });
  const pants = new THREE.MeshLambertMaterial({ color: PALETTE.playerPants });
  const skin = new THREE.MeshLambertMaterial({ color: PALETTE.skin });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.8, 0.38), shirt);
  body.position.y = 1.08;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.7;
  head.castShadow = true;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), new THREE.MeshLambertMaterial({ color: 0xd8a03a }));
  cap.position.y = 1.94;
  g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.3), pants);
  legL.position.set(-0.18, 0.36, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.18;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.24), shirt);
  armL.position.set(-0.45, 1.08, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.45;
  g.add(armR);
  // The pistol, in the right hand.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  gun.position.set(0.45, 0.95, 0.3);
  g.add(gun);
  g.userData = { legL, legR, armL, armR, gun };
  return g;
}

export function createPlayer(scene, x, z) {
  const mesh = buildPlayerMesh();
  scene.add(mesh);
  return {
    mesh,
    x,
    z,
    heading: 0,
    camYaw: 0,
    camPitch: 0.32,
    health: PLAYER.health,
    ammo: PLAYER.ammo,
    reloading: 0,
    inCar: false,
    car: null,
    anim: 0,
    moving: false,
    invuln: 0,
    wasted: false,
    damage(n) {
      if (this.invuln > 0) return;
      this.health -= n;
      this.invuln = 0.6;
      if (this.health <= 0) {
        this.health = 0;
        this.wasted = true;
      }
    },
    reset(x2, z2) {
      this.x = x2;
      this.z = z2;
      this.health = PLAYER.health;
      this.ammo = PLAYER.ammo;
      this.inCar = false;
      this.car = null;
      this.wasted = false;
      this.invuln = 0;
      this.mesh.visible = true;
    },
  };
}

/** On-foot step: camera-relative WASD, run with Shift, building collision.
 * W walks away from the camera (the camera's forward on the ground is
 * (-sin(camYaw), -cos(camYaw))) and D strafes to the camera's right. */
export function stepOnFoot(player, move, running, dt, colliders) {
  const speed = running ? PLAYER.run : PLAYER.walk;
  const sin = Math.sin(player.camYaw);
  const cos = Math.cos(player.camYaw);
  const mx = (move.x * cos - move.y * sin) * speed * dt;
  const mz = (-move.x * sin - move.y * cos) * speed * dt;
  player.moving = Math.abs(move.x) + Math.abs(move.y) > 0;
  if (player.moving) player.heading = Math.atan2(mx, mz);
  const hit = collideCircle(colliders, player.x + mx, player.z + mz, PLAYER.radius);
  const cl = clampToCity(hit.x, hit.z);
  player.x = cl.x;
  player.z = cl.z;
  player.anim += dt * (running ? 11 : 7) * (player.moving ? 1 : 0);
  const u = player.mesh.userData;
  const swing = player.moving ? Math.sin(player.anim) * 0.6 : 0;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.6;
  // The right arm stays up, aiming, while the player has a gun.
  u.armR.rotation.x = swing * 0.6 - 0.9;
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.reloading > 0) {
    player.reloading -= dt;
    if (player.reloading <= 0) player.ammo = PLAYER.ammo;
  }
}

/** Drive the player's car with the arcade model. */
export function stepDriving(player, move, dt, colliders, cars, onCrash) {
  if (!player.car) return;
  stepPlayerCar(player.car, move, dt, colliders, cars, onCrash);
  player.x = player.car.x;
  player.z = player.car.z;
  player.heading = player.car.heading;
  player.mesh.visible = false;
  if (player.invuln > 0) player.invuln -= dt;
}

/** A hitscan shot from the camera through the centre of the screen. */
export function shoot(player, camera, targets) {
  if (player.inCar || player.reloading > 0) return null;
  if (player.ammo <= 0) {
    player.reloading = PLAYER.reload;
    return { type: 'dry' };
  }
  player.ammo -= 1;
  const ray = new THREE.Raycaster();
  ray.setFromCamera({ x: 0, y: 0 }, camera);
  ray.far = 120;
  const hits = ray.intersectObjects(targets, true);
  if (!hits.length) return { type: 'miss', point: ray.ray.at(60, new THREE.Vector3()) };
  const hit = hits[0];
  let obj = hit.object;
  let owner = null;
  while (obj) {
    if (obj.userData && obj.userData.owner) {
      owner = obj.userData.owner;
      break;
    }
    obj = obj.parent;
  }
  return { type: 'hit', owner, point: hit.point, distance: hit.distance };
}

/** The nearest enterable car within range; null when there is none. */
export function nearestCar(cars, x, z, maxD) {
  let best = null;
  let bd = maxD;
  for (const c of cars) {
    if (c.dead || c.isPlayer) continue;
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

export { CAR, WANTED };
