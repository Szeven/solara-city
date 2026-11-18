// The city of Solara: a 9-by-9 block grid on the coast, built once from a seed.
// It hands back the three.js group, the building collision boxes, the road graph
// traffic drives on, and helpers to find a road point near any spot.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';
import { facadeTexture, roadTexture, sidewalkTexture, sandTexture, oceanTexture, palmTexture, cloudTexture } from './textures.js';

const PITCH = CITY.block + CITY.road; // 50 m between block centres
const MIN = -CITY.half;
const MAX = CITY.half;
const HALF_ROAD = CITY.road / 2;

/** Is (x, z) on a road — within the road half-width of a grid line? */
export function onRoad(x, z) {
  const rx = (((x - MIN) % PITCH) + PITCH) % PITCH;
  const rz = (((z - MIN) % PITCH) + PITCH) % PITCH;
  return rx < CITY.road || rx > CITY.block || rz < CITY.road || rz > CITY.block;
}

/** The nearest point on the road network to (x, z), snapped to a lane centre. */
export function nearestRoadPoint(x, z) {
  const snap = (v) => {
    const rel = (((v - MIN) % PITCH) + PITCH) % PITCH;
    if (rel < CITY.road) return v - rel + HALF_ROAD;
    if (rel > CITY.block) return v + (PITCH - rel) + HALF_ROAD;
    return rel < CITY.block / 2 ? v - rel + HALF_ROAD : v + (PITCH - rel) + HALF_ROAD;
  };
  const dx = Math.abs(snap(x) - x);
  const dz = Math.abs(snap(z) - z);
  return dx < dz ? { x: snap(x), z } : { x, z: snap(z) };
}

/** The road graph: one node per intersection, edges to each neighbour. */
export function buildRoadGraph() {
  const nodes = new Map();
  const key = (ix, iz) => `${ix},${iz}`;
  const n = CITY.blocks + 1;
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      nodes.set(key(ix, iz), { x: MIN + ix * PITCH, z: MIN + iz * PITCH, links: [] });
    }
  }
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const node = nodes.get(key(ix, iz));
      if (ix + 1 < n) node.links.push(nodes.get(key(ix + 1, iz)));
      if (ix - 1 >= 0) node.links.push(nodes.get(key(ix - 1, iz)));
      if (iz + 1 < n) node.links.push(nodes.get(key(ix, iz + 1)));
      if (iz - 1 >= 0) node.links.push(nodes.get(key(ix, iz - 1)));
    }
  }
  return { nodes, key };
}

export function nearestNode(graph, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const node of graph.nodes.values()) {
    const d = (node.x - x) ** 2 + (node.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  return best;
}

export function createCity(random) {
  const group = new THREE.Group();
  const colliders = []; // { minX, maxX, minZ, maxZ }
  const graph = buildRoadGraph();
  const mats = new Map();
  const lambert = (color) => {
    if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color }));
    return mats.get(color);
  };

  // Ground: a sand base under everything, roads on top of it.
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ map: sandTexture() }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.set(-40, -0.05, 0);
  base.receiveShadow = true;
  group.add(base);

  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
  const walkMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture() });
  for (let i = 0; i <= CITY.blocks; i++) {
    const c = MIN + i * PITCH;
    for (const [w, d, x, z] of [
      [CITY.half * 2 + CITY.road, CITY.road, 0, c],
      [CITY.road, CITY.half * 2 + CITY.road, c, 0],
    ]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0, z);
      road.receiveShadow = true;
      group.add(road);
    }
  }

  // Sidewalks: one slab per block, with the buildings standing on it.
  const walkGeo = new THREE.PlaneGeometry(CITY.block + 2, CITY.block + 2);
  for (let ix = 0; ix < CITY.blocks; ix++) {
    for (let iz = 0; iz < CITY.blocks; iz++) {
      const cx = MIN + CITY.road + CITY.block / 2 + ix * PITCH;
      const cz = MIN + CITY.road + CITY.block / 2 + iz * PITCH;
      const walk = new THREE.Mesh(walkGeo, walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.02, cz);
      walk.receiveShadow = true;
      group.add(walk);
    }
  }

  // Buildings: one to four per block, taller toward downtown.
  const facadeMats = PALETTE.building.map((b, i) => new THREE.MeshLambertMaterial({ map: facadeTexture(b, PALETTE.glass[i % 3], i + 1) }));
  const glassMats = PALETTE.glass.map((g) => new THREE.MeshLambertMaterial({ color: g }));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofMat = lambert(0x3a3f46);
  for (let ix = 0; ix < CITY.blocks; ix++) {
    for (let iz = 0; iz < CITY.blocks; iz++) {
      const cx = MIN + CITY.road + CITY.block / 2 + ix * PITCH;
      const cz = MIN + CITY.road + CITY.block / 2 + iz * PITCH;
      const dc = Math.max(Math.abs(cx), Math.abs(cz)) / CITY.half; // 0 at the centre, 1 at the edge
      const downtown = dc < 0.35;
      const count = downtown ? 1 : 2 + Math.floor(random() * 2);
      const spots = count === 1
        ? [[0, 0, 30, 30]]
        : count === 2
          ? [[-8, 0, 16, 30], [9, 0, 15, 30]]
          : [[-9, -9, 15, 15], [9, -9, 15, 15], [-9, 9, 15, 15], [9, 9, 15, 15]];
      for (const [ox, oz, w, d] of spots) {
        if (count === 4 && random() < 0.25) continue; // a plaza corner stays open
        const h = downtown ? 34 + random() * 46 : 7 + random() * (dc < 0.6 ? 16 : 8);
        const mat = downtown && random() < 0.5
          ? glassMats[Math.floor(random() * glassMats.length)]
          : facadeMats[Math.floor(random() * facadeMats.length)];
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(cx + ox, h / 2, cz + oz);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w + 0.6, 0.5, d + 0.6);
        roof.position.set(cx + ox, h + 0.25, cz + oz);
        group.add(roof);
        colliders.push({ minX: cx + ox - w / 2, maxX: cx + ox + w / 2, minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2 });
      }
    }
  }

  // Palms on the corners, lamps at every other intersection.
  const trunkMat = lambert(0x6a4a2a);
  const frondMat = new THREE.MeshLambertMaterial({ map: palmTexture(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.2 });
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 5.4, 6);
  const frondGeo = new THREE.PlaneGeometry(7, 7);
  const lampMat = lambert(0x2a2a30);
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 6, 6);
  const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
  let palms = 0;
  for (let ix = 0; ix <= CITY.blocks; ix++) {
    for (let iz = 0; iz <= CITY.blocks; iz++) {
      const x = MIN + ix * PITCH;
      const z = MIN + iz * PITCH;
      if (random() < 0.55) {
        const px = x + (random() < 0.5 ? -8.5 : 8.5);
        const pz = z + (random() < 0.5 ? -8.5 : 8.5);
        if (px >= CITY.beachX) {
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.set(px, 2.7, pz);
          trunk.castShadow = true;
          group.add(trunk);
          const fronds = new THREE.Mesh(frondGeo, frondMat);
          fronds.position.set(px, 6.4, pz);
          fronds.rotation.y = random() * Math.PI;
          group.add(fronds);
          palms += 1;
        }
      }
      if ((ix + iz) % 2 === 0) {
        const pole = new THREE.Mesh(poleGeo, lampMat);
        pole.position.set(x + 8.2, 3, z + 8.2);
        group.add(pole);
        const head = new THREE.Mesh(headGeo, lampHeadMat);
        head.position.set(x + 8.2, 6.1, z + 8.2);
        group.add(head);
      }
    }
  }

  // Ocean and beach to the west, clouds overhead.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 560),
    new THREE.MeshLambertMaterial({ map: oceanTexture() }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(CITY.oceanX - 70, -0.1, 0);
  group.add(ocean);
  const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTexture(), transparent: true, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(60 + random() * 50, 26 + random() * 16), cloudMat);
    cloud.position.set(-200 + random() * 500, 90 + random() * 50, -220 + random() * 440);
    group.add(cloud);
  }

  return { group, colliders, graph, palmCount: palms };
}

/** Push a circle at (x, z) with radius r out of every building box it overlaps. */
export function collideCircle(colliders, x, z, r) {
  let pushed = false;
  for (const c of colliders) {
    if (x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ) continue;
    const dxl = x + r - c.minX;
    const dxr = c.maxX - (x - r);
    const dzl = z + r - c.minZ;
    const dzr = c.maxZ - (z - r);
    const m = Math.min(dxl, dxr, dzl, dzr);
    if (m === dxl) x = c.minX - r;
    else if (m === dxr) x = c.maxX + r;
    else if (m === dzl) z = c.minZ - r;
    else z = c.maxZ + r;
    pushed = true;
  }
  return { x, z, pushed };
}

/** Keep a position inside the playable area: the city and the beach, not the ocean. */
export function clampToCity(x, z) {
  return {
    x: Math.max(CITY.beachX + 2, Math.min(CITY.half + 12, x)),
    z: Math.max(-CITY.half - 12, Math.min(CITY.half + 12, z)),
  };
}
