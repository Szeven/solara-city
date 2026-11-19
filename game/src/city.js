// Solara City — the city itself: ground, ocean, beach, roads, blocks,
// buildings, parks, lamps and palms, plus the road graph traffic drives on
// and the building colliders the player and cars bump into.

import * as THREE from 'three';
import { CITY, ROAD_LINES, COLORS } from './config.js';
import { makeRng, hash2 } from './random.js';
import {
  buildingTexture,
  roadTexture,
  sidewalkTexture,
  grassTexture,
  sandTexture,
  waterTexture,
} from './textures.js';

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildCity(scene, seed = 7) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  const colliders = [];
  const waterMats = [];

  // --- ground, beach, ocean -------------------------------------------
  const grassTex = grassTexture();
  grassTex.repeat.set(24, 24);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 1100),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-100, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  const sandTex = sandTexture();
  sandTex.repeat.set(2, 24);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.beachWidth, 900),
    new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-225 - CITY.beachWidth / 2, 0.03, 0);
  sand.receiveShadow = true;
  group.add(sand);

  const waterTex = waterTexture();
  waterTex.repeat.set(10, 10);
  const waterMat = new THREE.MeshStandardMaterial({
    map: waterTex,
    roughness: 0.35,
    metalness: 0.1,
  });
  waterMats.push(waterMat);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(500, 900), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(-255 - 250, 0.06, 0);
  group.add(water);

  // --- roads ------------------------------------------------------------
  const roadTex = roadTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 });
  const span = CITY.half * 2 + CITY.roadWidth;
  for (const line of ROAD_LINES) {
    const along = new THREE.Mesh(new THREE.PlaneGeometry(span, CITY.roadWidth), roadMat);
    along.rotation.x = -Math.PI / 2;
    along.position.set(0, 0.02, line);
    along.receiveShadow = true;
    group.add(along);
    const across = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, span), roadMat);
    across.rotation.x = -Math.PI / 2;
    across.position.set(line, 0.02, 0);
    across.receiveShadow = true;
    group.add(across);
  }

  // --- blocks: sidewalks, buildings, parks ------------------------------
  const sidewalkTex = sidewalkTexture();
  sidewalkTex.repeat.set(4, 4);
  const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 1 });
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7a34, roughness: 1 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.4 });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff2b0,
    emissive: 0xffdf80,
    emissiveIntensity: 1.6,
  });

  const facadeMats = COLORS.building.map(
    (c) =>
      new THREE.MeshStandardMaterial({
        map: buildingTexture('#' + c.toString(16).padStart(6, '0')),
        roughness: 0.9,
      }),
  );
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 1 });

  const blockCenters = [];
  for (let i = 0; i < CITY.blocks; i++) {
    blockCenters.push(-200 + i * CITY.pitch);
  }

  for (const bx of blockCenters) {
    for (const bz of blockCenters) {
      const h = hash2(bx, bz, seed);
      const isPark = h < 0.18;
      const slab = new THREE.Mesh(
        new THREE.PlaneGeometry(CITY.blockSize, CITY.blockSize),
        isPark ? grassMat : sidewalkMat,
      );
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(bx, 0.05, bz);
      slab.receiveShadow = true;
      group.add(slab);

      if (isPark) {
        // A park: a few trees and a bench or two, no collider.
        const trees = 2 + Math.floor(h * 40) % 3;
        for (let t = 0; t < trees; t++) {
          const tx = bx + rng.range(-13, 13);
          const tz = bz + rng.range(-13, 13);
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.6, 6), trunkMat);
          trunk.position.set(tx, 1.3, tz);
          trunk.castShadow = true;
          group.add(trunk);
          const crown = new THREE.Mesh(new THREE.SphereGeometry(1.9, 8, 6), leafMat);
          crown.position.set(tx, 3.6, tz);
          crown.castShadow = true;
          group.add(crown);
        }
        continue;
      }

      // Buildings: 1-3 slabs per block, kept inside the block with a margin.
      const count = 1 + Math.floor(hash2(bx + 11, bz + 5, seed) * 3);
      for (let b = 0; b < count; b++) {
        const w = rng.range(9, 15);
        const d = rng.range(9, 15);
        const height = rng.range(9, 42);
        const ox = count === 1 ? 0 : rng.range(-8, 8);
        const oz = count === 1 ? 0 : rng.range(-8, 8);
        const x = bx + ox;
        const z = bz + oz;
        const mat = facadeMats[Math.floor(hash2(x, z, seed + 3) * facadeMats.length) % facadeMats.length];
        const tower = box(w, height, d, mat, x, height / 2 + 0.05, z);
        group.add(tower);
        const roof = box(w + 0.6, 0.5, d + 0.6, roofMat, x, height + 0.3, z);
        group.add(roof);
        colliders.push({
          minX: x - w / 2 - 0.3,
          maxX: x + w / 2 + 0.3,
          minZ: z - d / 2 - 0.3,
          maxZ: z + d / 2 + 0.3,
        });
      }
    }
  }

  // --- street lamps at every other intersection --------------------------
  for (let i = 0; i < ROAD_LINES.length; i += 2) {
    for (let j = 0; j < ROAD_LINES.length; j += 2) {
      const x = ROAD_LINES[i] + 8;
      const z = ROAD_LINES[j] + 8;
      if (x > CITY.half || z > CITY.half) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 6), lampMat);
      pole.position.set(x, 2.7, z);
      pole.castShadow = true;
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), lampGlowMat);
      lamp.position.set(x, 5.5, z);
      group.add(lamp);
    }
  }

  // --- palms along the beach ---------------------------------------------
  for (let z = -200; z <= 200; z += 40) {
    const x = -238 + rng.range(-4, 4);
    const lean = rng.range(-0.12, 0.12);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 7), trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = lean;
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), leafMat);
    crown.position.set(x + lean * 7, 7.2, z);
    crown.scale.y = 0.55;
    crown.castShadow = true;
    group.add(crown);
  }

  scene.add(group);

  // --- road graph: intersections and their neighbours ---------------------
  const nodes = new Map();
  const key = (x, z) => `${x},${z}`;
  for (const x of ROAD_LINES) {
    for (const z of ROAD_LINES) {
      nodes.set(key(x, z), { x, z, neighbors: [] });
    }
  }
  for (const [k, node] of nodes) {
    for (const [dx, dz] of [[50, 0], [-50, 0], [0, 50], [0, -50]]) {
      const other = nodes.get(key(node.x + dx, node.z + dz));
      if (other) node.neighbors.push(other);
    }
  }

  return {
    group,
    colliders,
    roadGraph: nodes,
    intersections: [...nodes.values()],
    update(dt) {
      waterTex.offset.x += dt * 0.008;
      waterTex.offset.y += dt * 0.004;
    },
  };
}

// Circle (x, z, radius) vs building AABBs: push the circle out.
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
    }
  }
}

// Clamp a position to the drivable/walkable city (plus the beach).
export function clampToCity(pos, margin = 4) {
  pos.x = Math.max(-252, Math.min(CITY.half + 40, pos.x));
  pos.z = Math.max(-CITY.half - 40, Math.min(CITY.half + 40, pos.z));
}
