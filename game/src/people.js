// Pedestrians: low-poly walkers who stroll the sidewalks and flee from gunshots
// and speeding cars. Police officers reuse the walker with a chase brain: they run
// the player down and, up close, start the bust.

import * as THREE from 'three';
import { PEDS, WANTED, PALETTE } from './config.js';
import { nearestRoadPoint, collideCircle, clampToCity } from './city.js';

function buildPerson(shirt, pants, skin = PALETTE.skin) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.36), shirtMat);
  body.position.y = 1.05;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat);
  head.position.y = 1.66;
  head.castShadow = true;
  g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.28), pantsMat);
  legL.position.set(-0.17, 0.35, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.17;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.22), shirtMat);
  armL.position.set(-0.42, 1.05, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export function spawnPedestrian(scene, random, nearX, nearZ) {
  const shirts = PALETTE.pedShirt;
  const mesh = buildPerson(shirts[Math.floor(random() * shirts.length)], 0x2a2a3a);
  scene.add(mesh);
  const p = nearestRoadPoint(nearX + (random() - 0.5) * 300, nearZ + (random() - 0.5) * 300);
  const ped = {
    mesh,
    x: p.x + (random() - 0.5) * 8,
    z: p.z + (random() - 0.5) * 8,
    heading: random() * Math.PI * 2,
    speed: PEDS.walk * (0.7 + random() * 0.6),
    state: 'walk', // walk | flee | down
    tx: p.x,
    tz: p.z,
    retarget: 0,
    anim: random() * 10,
    dead: false,
  };
  mesh.position.set(ped.x, 0, ped.z);
  return ped;
}

/** Walk the sidewalks: pick a nearby road point, stroll to it, pick another. */
export function stepPedestrian(ped, dt, random, danger) {
  if (ped.dead) return;
  ped.anim += dt * (ped.state === 'flee' ? 11 : 6);
  const u = ped.mesh.userData;
  const swing = Math.sin(ped.anim) * (ped.state === 'flee' ? 0.7 : 0.45);
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.7;
  u.armR.rotation.x = swing * 0.7;

  if (danger) ped.state = 'flee';
  else if (ped.state === 'flee') ped.state = 'walk';

  const speed = ped.state === 'flee' ? PEDS.flee : ped.speed;
  ped.retarget -= dt;
  const dx = ped.tx - ped.x;
  const dz = ped.tz - ped.z;
  const d = Math.hypot(dx, dz);
  if (d < 2 || ped.retarget <= 0) {
    if (ped.state === 'flee') {
      const away = Math.atan2(ped.x - danger.x, ped.z - danger.z);
      ped.tx = ped.x + Math.sin(away) * 40;
      ped.tz = ped.z + Math.cos(away) * 40;
    } else {
      const p = nearestRoadPoint(ped.x + (random() - 0.5) * 120, ped.z + (random() - 0.5) * 120);
      ped.tx = p.x;
      ped.tz = p.z;
    }
    ped.retarget = 4 + random() * 6;
  } else {
    ped.heading = Math.atan2(dx, dz);
    ped.x += Math.sin(ped.heading) * speed * dt;
    ped.z += Math.cos(ped.heading) * speed * dt;
  }
  const cl = clampToCity(ped.x, ped.z);
  ped.x = cl.x;
  ped.z = cl.z;
  ped.mesh.position.set(ped.x, 0, ped.z);
  ped.mesh.rotation.y = ped.heading;
}

/** A police officer on foot: runs at the player, and on contact starts the bust. */
export function spawnOfficer(scene, x, z) {
  const mesh = buildPerson(0x1a3a8a, 0x1a1a24);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.44), new THREE.MeshLambertMaterial({ color: 0x10204a }));
  cap.position.y = 1.9;
  mesh.add(cap);
  scene.add(mesh);
  return {
    mesh,
    x,
    z,
    heading: 0,
    speed: WANTED.officerSpeed,
    health: WANTED.officerHealth,
    state: 'chase',
    anim: 0,
    dead: false,
  };
}

export function stepOfficer(off, dt, player, colliders) {
  if (off.dead) return 'gone';
  off.anim += dt * 11;
  const u = off.mesh.userData;
  const swing = Math.sin(off.anim) * 0.7;
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.7;
  u.armR.rotation.x = swing * 0.7;
  const dx = player.x - off.x;
  const dz = player.z - off.z;
  const d = Math.hypot(dx, dz);
  off.heading = Math.atan2(dx, dz);
  if (d > WANTED.bustRange) {
    off.x += Math.sin(off.heading) * off.speed * dt;
    off.z += Math.cos(off.heading) * off.speed * dt;
    const hit = collideCircle(colliders, off.x, off.z, 0.5);
    off.x = hit.x;
    off.z = hit.z;
  } else {
    return 'busting';
  }
  off.mesh.position.set(off.x, 0, off.z);
  off.mesh.rotation.y = off.heading;
  return 'chase';
}
