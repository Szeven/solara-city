// Pedestrians: sidewalk strollers who flee gunshots, speeding cars and
// high wanted levels. Simple figures (body, head, legs) that walk along
// the sidewalk lines next to roads and panic away from danger.

import * as THREE from '../vendor/three.module.min.js';
import { CITY } from './config.js';
import { rng } from './textures.js';

const SHIRTS = [0xd84a4a, 0x4a7ad8, 0x4ad87a, 0xd8c24a, 0x9a4ad8, 0xe8e8e8, 0x333333];

export class Pedestrians {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.peds = [];
    const rand = rng(4242);
    for (let i = 0; i < 26; i++) {
      const axis = rand() < 0.5 ? 'z' : 'x';
      const line = CITY.roads[Math.floor(rand() * CITY.roads.length)];
      const side = (rand() < 0.5 ? -1 : 1) * 9.5; // sidewalk beside the road
      const along = -240 + rand() * 480;
      const x = axis === 'z' ? line + side : along;
      const z = axis === 'z' ? along : line + side;
      this.peds.push(this.makePed(x, z, axis, rand));
    }
  }

  makePed(x, z, axis, rand) {
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: SHIRTS[Math.floor(rand() * SHIRTS.length)] });
    const skin = new THREE.MeshLambertMaterial({ color: [0xd9a066, 0x8a5a3a, 0xe8b88a][Math.floor(rand() * 3)] });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.8, 8), shirt);
    body.position.y = 0.95;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
    head.position.y = 1.55;
    group.add(head);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.55, 6), legMat);
    legL.position.set(-0.11, 0.28, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.11;
    group.add(legR);
    group.position.set(x, 0, z);
    this.scene.add(group);
    return {
      mesh: group, legs: [legL, legR],
      pos: new THREE.Vector3(x, 0, z),
      heading: axis === 'z' ? (rand() < 0.5 ? 0 : Math.PI) : (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      speed: 1.2 + rand() * 1.2,
      axis, panic: 0, alive: true,
      idle: rand() < 0.25 ? 2 + rand() * 5 : 0, // some peds stand and chat first
    };
  }

  // A threat at (x,z) makes nearby peds panic and run away from it.
  scare(x, z, radius) {
    for (const p of this.peds) {
      if (!p.alive) continue;
      const d = Math.hypot(p.pos.x - x, p.pos.z - z);
      if (d < radius) {
        p.panic = 3 + Math.random() * 2;
        p.heading = Math.atan2(p.pos.x - x, p.pos.z - z);
      }
    }
  }

  update(dt, playerPos, playerSpeed) {
    for (const p of this.peds) {
      if (!p.alive) continue;
      if (p.panic > 0) {
        p.panic -= dt;
        p.pos.x += Math.sin(p.heading) * 4.5 * dt;
        p.pos.z += Math.cos(p.heading) * 4.5 * dt;
      } else if (p.idle > 0) {
        // standing around: look at the street, legs still
        p.idle -= dt;
        p.legs[0].rotation.x = 0;
        p.legs[1].rotation.x = 0;
      } else {
        // stroll along the sidewalk; reverse at the city edge
        const along = p.axis === 'z' ? p.pos.z : p.pos.x;
        if (along > 245 || along < -245) p.heading += Math.PI;
        p.pos.x += Math.sin(p.heading) * p.speed * dt;
        p.pos.z += Math.cos(p.heading) * p.speed * dt;
      }
      // flee a fast car that gets close
      if (playerSpeed > 12) {
        const d = Math.hypot(p.pos.x - playerPos.x, p.pos.z - playerPos.z);
        if (d < 8) {
          p.panic = 2;
          p.heading = Math.atan2(p.pos.x - playerPos.x, p.pos.z - playerPos.z);
        }
      }
      this.world.collide(p.pos, 0.4);
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y = p.heading;
      const swing = Math.sin(performance.now() * 0.012 + p.pos.x) * 0.45;
      p.legs[0].rotation.x = swing;
      p.legs[1].rotation.x = -swing;
    }
  }

  // Nearest living ped within maxDist of (x,z), or null.
  nearest(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const p of this.peds) {
      if (!p.alive) continue;
      const d = Math.hypot(p.pos.x - x, p.pos.z - z);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }
}
