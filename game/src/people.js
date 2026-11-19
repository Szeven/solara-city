// Pedestrians: they stroll the sidewalks, and run when the player causes
// trouble nearby.

import * as THREE from 'three';
import { resolveCollisions, clampToCity } from './city.js';
import { ROAD_LINES } from './config.js';
import { makeRng } from './random.js';

const SHIRTS = [0xd95f4b, 0x4b7fd9, 0xe0c34a, 0x58b368, 0x9a5fb0, 0xd8d8d8, 0x3a3a3a, 0xe08a3c];

export function createPedMesh(shirt) {
  const group = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.95, 8), cloth);
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);
  for (const x of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6), pants);
    leg.position.set(x, 0.25, 0);
    group.add(leg);
  }
  return group;
}

// Remove a pedestrian and free the geometry and materials it owned.
export function disposePed(ped, scene) {
  scene.remove(ped.mesh);
  ped.mesh.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
}

export function spawnPedestrian(scene, rng, near = null) {
  // Sidewalks run alongside the roads, about 9 m off a road centreline.
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(-210, 210);
  const side = rng.chance(0.5) ? 1 : -1;
  const x = near ? near.x + rng.range(-30, 30) : line + side * 9.5;
  const z = near ? near.z + rng.range(-30, 30) : along;
  const mesh = createPedMesh(rng.pick(SHIRTS));
  scene.add(mesh);
  const ped = {
    mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading: rng.range(0, Math.PI * 2),
    speed: rng.range(1.1, 2.0),
    state: 'stroll',
    target: null,
    fleeTime: 0,
  };
  mesh.position.set(x, 0, z);
  mesh.rotation.y = ped.heading;
  return ped;
}

function pickStrollTarget(ped, rng) {
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(-210, 210);
  const side = rng.chance(0.5) ? 1 : -1;
  // Walk along a road (vary the along coordinate) or across to another road.
  if (rng.chance(0.6)) {
    return { x: ped.pos.x + rng.range(-60, 60), z: along };
  }
  return { x: line + side * 9.5, z: along };
}

export function stepPedestrians(peds, dt, playerPos, danger, colliders, rng) {
  for (const ped of peds) {
    const dx = ped.pos.x - playerPos.x;
    const dz = ped.pos.z - playerPos.z;
    const dist = Math.hypot(dx, dz);
    if (danger && dist < 14) {
      ped.state = 'flee';
      ped.fleeTime = 2.5;
    }
    if (ped.state === 'flee') {
      ped.fleeTime -= dt;
      if (ped.fleeTime <= 0) ped.state = 'stroll';
      const len = Math.max(0.01, dist);
      ped.heading = Math.atan2(dx / len, dz / len);
      ped.speed = 4.2;
    } else {
      if (!ped.target) ped.target = pickStrollTarget(ped, rng);
      const tx = ped.target.x - ped.pos.x;
      const tz = ped.target.z - ped.pos.z;
      const td = Math.hypot(tx, tz);
      if (td < 2) {
        ped.target = null;
        continue;
      }
      const desired = Math.atan2(tx, tz);
      let diff = desired - ped.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ped.heading += Math.max(-2.4, Math.min(2.4, diff * 3)) * dt;
      ped.speed = 1.5;
    }
    ped.pos.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.pos.z += Math.cos(ped.heading) * ped.speed * dt;
    resolveCollisions(ped.pos, 0.4, colliders);
    clampToCity(ped.pos);
    ped.mesh.position.set(ped.pos.x, 0, ped.pos.z);
    ped.mesh.rotation.y = ped.heading;
    // Simple walk bob.
    ped.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.008 + ped.pos.x)) * 0.05;
  }
}
