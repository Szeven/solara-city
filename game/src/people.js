// Solara City — pedestrians: they stroll the sidewalks and flee
// when the player causes trouble nearby.
import * as THREE from 'three';
import { PEDS } from './config.js';
import { pick, range } from './random.js';
import { blobShadowTexture } from './textures.js';

const SHIRT_COLORS = [0xd95f4b, 0x4b8ad9, 0x53a85c, 0xd9b84b, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xecf0f1];
const PANTS_COLORS = [0x2c3e50, 0x34495e, 0x5d4037, 0x1a1a1a];

export class Pedestrian {
  constructor(mesh, x, z) {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = 0;
    this.speed = 0;
    this.target = null;
    this.fleeing = false;
    this.dead = false;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }
}

export function buildPedMesh(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRT_COLORS) });
  const pants = new THREE.MeshLambertMaterial({ color: pick(rng, PANTS_COLORS) });
  const skin = new THREE.MeshLambertMaterial({ color: pick(rng, [0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf2c9a0]) });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pants);
  legL.position.set(-0.14, 0.35, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.16), shirt);
  armL.position.set(-0.36, 1.05, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.36;
  group.add(armR);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  group.userData.legs = [legL, legR];
  group.userData.arms = [armL, armR];
  return group;
}

export class PedSystem {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.peds = [];
    for (let i = 0; i < PEDS.count; i++) {
      const p = this.randomSidewalkSpot();
      const ped = new Pedestrian(buildPedMesh(rng), p.x, p.z);
      ped.speed = range(rng, PEDS.walkMin, PEDS.walkMax);
      ped.target = this.randomSidewalkSpot();
      this.peds.push(ped);
      scene.add(ped.mesh);
    }
  }

  randomSidewalkSpot() {
    const bx = pick(this.rng, [-200, -150, -100, -50, 0, 50, 100, 150, 200]);
    const bz = pick(this.rng, [-200, -150, -100, -50, 0, 50, 100, 150, 200]);
    return { x: bx + range(this.rng, -16, 16), z: bz + range(this.rng, -16, 16) };
  }

  // Something loud happened at (x, z): nearby peds run away from it.
  scare(x, z, radius = PEDS.fleeRadius) {
    for (const ped of this.peds) {
      if (ped.dead) continue;
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < radius) {
        ped.fleeing = true;
        const away = Math.atan2(ped.x - x, ped.z - z);
        ped.target = {
          x: ped.x + Math.sin(away) * 40,
          z: ped.z + Math.cos(away) * 40,
        };
        ped.speed = range(this.rng, 3.5, 4.5);
      }
    }
  }

  update(dt, city) {
    for (const ped of this.peds) {
      if (ped.dead) continue;
      const t = ped.target;
      if (!t) {
        ped.target = this.randomSidewalkSpot();
        continue;
      }
      const dx = t.x - ped.x;
      const dz = t.z - ped.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        ped.fleeing = false;
        ped.speed = range(this.rng, PEDS.walkMin, PEDS.walkMax);
        ped.target = this.randomSidewalkSpot();
        continue;
      }
      const want = Math.atan2(dx, dz);
      let diff = ((want - ped.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      ped.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      ped.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.z += Math.cos(ped.heading) * ped.speed * dt;
      city.resolveCircle(ped, 0.5);
      // Walk cycle: swing legs and arms.
      ped.walkPhase += dt * ped.speed * 3.2;
      const swing = Math.sin(ped.walkPhase) * 0.5;
      const [legL, legR] = ped.mesh.userData.legs;
      const [armL, armR] = ped.mesh.userData.arms;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.7;
      armR.rotation.x = swing * 0.7;
      ped.syncMesh();
    }
  }

  // The player (or a car) hit a ped: they fall over and stay down.
  kill(ped) {
    ped.dead = true;
    ped.mesh.rotation.x = Math.PI / 2;
    ped.mesh.position.y = 0.3;
  }

  nearest(x, z, maxDist, aliveOnly = true) {
    let best = null;
    let bestD = maxDist;
    for (const ped of this.peds) {
      if (aliveOnly && ped.dead) continue;
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < bestD) {
        bestD = d;
        best = ped;
      }
    }
    return best;
  }
}
