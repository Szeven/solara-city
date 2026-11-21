// Solara City layout: a 9x9 coastal grid. Roads are 14 m wide on a 50 m
// pitch at +/-25, +/-75, +/-125, +/-175, +/-225 (never multiples of 50).
// Blocks are 36 m squares between the roads; the ocean lies to the west.
import * as THREE from 'three';
import { facadeTexture, roadTexture, sidewalkTexture, waterTexture, roofTexture, rooftopSignTexture } from './textures.js';
import { makeRng } from './rng.js';

export const ROADS = [-225, -175, -125, -75, -25, 25, 75, 125, 175, 225];
export const ROAD_WIDTH = 14;
export const BLOCK_SIZE = 36;
export const CITY_HALF = 250;
export const CITY_SEED = 1337;

const BLOCK_CENTERS = [-200, -150, -100, -50, 0, 50, 100, 150, 200];

export function isOnRoad(x, z) {
  for (const r of ROADS) {
    if (Math.abs(x - r) < ROAD_WIDTH / 2 + 1.5) return true;
    if (Math.abs(z - r) < ROAD_WIDTH / 2 + 1.5) return true;
  }
  return false;
}

export function buildCity(scene) {
  const rng = makeRng(CITY_SEED);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';

  // Ground slab under everything.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x8f8a80 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  group.add(ground);

  // Ocean to the west of the city edge.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 560),
    new THREE.MeshLambertMaterial({ map: waterTexture() }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-250 - 160, 0.02, 0);
  group.add(ocean);

  // Beach strip where the city meets the water.
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 560),
    new THREE.MeshLambertMaterial({ color: 0xe0c98f }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-259, 0.03, 0);
  group.add(beach);

  // Road ribbons.
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
  for (const r of ROADS) {
    const alongZ = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, 520), roadMat);
    alongZ.rotation.x = -Math.PI / 2;
    alongZ.position.set(r, 0.06, 0);
    group.add(alongZ);
    const alongX = new THREE.Mesh(new THREE.PlaneGeometry(520, ROAD_WIDTH), roadMat);
    alongX.rotation.x = -Math.PI / 2;
    alongX.position.set(0, 0.06, r);
    group.add(alongX);
  }

  // Sidewalk slabs and buildings, one block at a time.
  const sidewalkMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture() });
  const palette = ['#e8d9b0', '#d9b48f', '#c9d4d6', '#e6c2a8', '#d8cfae', '#cbb59a', '#e0d0c0'];
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      const slab = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE), sidewalkMat);
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(bx, 0.04, bz);
      group.add(slab);

      // The centre block is Plaza Solara: a fountain square, no buildings.
      if (bx === 0 && bz === 0) {
        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(6, 6.6, 1.1, 20),
          new THREE.MeshLambertMaterial({ color: 0xb8b0a0 }),
        );
        rim.position.set(0, 0.55, 0);
        group.add(rim);
        const pool = new THREE.Mesh(
          new THREE.CylinderGeometry(5.2, 5.2, 0.4, 20),
          new THREE.MeshLambertMaterial({ map: waterTexture() }),
        );
        pool.position.set(0, 1.0, 0);
        group.add(pool);
        const jet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.9, 3.2, 10),
          new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }),
        );
        jet.position.set(0, 1.6, 0);
        group.add(jet);
        colliders.push({ minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: 6.6 });
        for (const [benchX, benchZ] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
          const bench = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.5, 1.2),
            new THREE.MeshLambertMaterial({ color: 0x7a5c38 }),
          );
          bench.position.set(benchX, 0.6, benchZ);
          group.add(bench);
        }
        continue;
      }

      const kind = rng.pick(['tower', 'tower', 'pair', 'quad', 'low']);
      const base = rng.pick(palette);
      const facade = new THREE.MeshLambertMaterial({ map: facadeTexture(rng, base, 0.25) });
      const roof = new THREE.MeshLambertMaterial({ map: roofTexture(rng) });
      const place = (cx, cz, w, d, h) => {
        const mats = [facade, facade, roof, facade, facade, facade];
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
        mesh.position.set(cx, h / 2, cz);
        group.add(mesh);
        colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
      };
      if (kind === 'tower') {
        place(bx, bz, rng.range(18, 24), rng.range(18, 24), rng.range(38, 72));
      } else if (kind === 'pair') {
        place(bx - 8, bz, 14, 16, rng.range(16, 30));
        place(bx + 8, bz, 14, 16, rng.range(22, 44));
      } else if (kind === 'quad') {
        place(bx - 8, bz - 8, 13, 13, rng.range(10, 18));
        place(bx + 8, bz - 8, 13, 13, rng.range(10, 20));
        place(bx - 8, bz + 8, 13, 13, rng.range(10, 16));
        place(bx + 8, bz + 8, 13, 13, rng.range(12, 22));
      } else {
        place(bx, bz, 26, 20, rng.range(8, 14));
      }
    }
  }

  // Streetlights at every other intersection.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xccaa55 });
  for (let i = 0; i < ROADS.length; i += 2) {
    for (let j = 0; j < ROADS.length; j += 2) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
      pole.position.set(ROADS[i] + 8.5, 3.5, ROADS[j] + 8.5);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampMat);
      lamp.position.set(ROADS[i] + 8.5, 7.1, ROADS[j] + 8.5);
      group.add(lamp);
    }
  }

  // Palm row along the ocean boulevard.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5c38 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
  for (let z = -225; z <= 225; z += 25) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.set(-242, 3.5, z);
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 0), leafMat);
    crown.position.set(-242, 8, z);
    group.add(crown);
  }

  // The SOLARA sign: a glowing billboard on poles at the plaza's north edge,
  // so it reads from the title shot and from the streets around the plaza.
  const signPoleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  for (const px of [-11, 11]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 8), signPoleMat);
    pole.position.set(px, 4.5, -14);
    group.add(pole);
  }
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 6),
    new THREE.MeshBasicMaterial({ map: rooftopSignTexture('SOLARA') }),
  );
  sign.position.set(0, 11.5, -14);
  group.add(sign);
  const signBack = sign.clone();
  signBack.rotation.y = Math.PI;
  signBack.position.set(0, 11.5, -14.2);
  group.add(signBack);

  scene.add(group);

  // Road graph: intersections of the road lines, for traffic AI.
  const nodes = [];
  for (const x of ROADS) {
    for (const z of ROADS) nodes.push({ x, z });
  }
  return {
    group,
    colliders,
    nodes,
    nearestNode(x, z) {
      let best = nodes[0];
      let bestD = Infinity;
      for (const n of nodes) {
        const d = (n.x - x) ** 2 + (n.z - z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
      return best;
    },
    randomSidewalkPoint(rng2) {
      const bx = rng2.pick(BLOCK_CENTERS);
      const bz = rng2.pick(BLOCK_CENTERS);
      const edge = rng2.int(0, 3);
      const t = rng2.range(-15, 15);
      if (edge === 0) return { x: bx + t, z: bz - 17 };
      if (edge === 1) return { x: bx + t, z: bz + 17 };
      if (edge === 2) return { x: bx - 17, z: bz + t };
      return { x: bx + 17, z: bz + t };
    },
  };
}

// Push a circle (x, z, radius) out of every building AABB it overlaps.
// Returns true when a push happened.
export function resolveBuildingCollision(colliders, pos, radius) {
  let hit = false;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
    }
  }
  return hit;
}
