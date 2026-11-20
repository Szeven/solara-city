// Solara City — the city itself: ground, ocean, roads, blocks, buildings,
// trees, lamps, the road graph traffic drives on, and building colliders.
import * as THREE from 'three';
import { CITY, COLORS } from './config.js';
import { pick, range, rangeInt } from './random.js';
import { facadeTexture, roadTexture, sidewalkTexture, grassTexture, oceanTexture, sandTexture } from './textures.js';

const FACADE_COLORS = ['#b8a88f', '#9fb2c1', '#c1a89b', '#a8b89a', '#b5b0a6', '#8fa3b8', '#c9b18a', '#a89bb0'];

export class City {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = []; // {minX, maxX, minZ, maxZ}
    this.buildings = [];
    this.build();
  }

  build() {
    const { scene, rng } = this;
    // Ground: grass everywhere under the city.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshLambertMaterial({ map: grassTexture() })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    // Ocean to the west, with a sand beach between it and the last road.
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 560),
      new THREE.MeshLambertMaterial({ map: oceanTexture() })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(CITY.oceanX - 108, -0.4, 0);
    scene.add(ocean);
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 520),
      new THREE.MeshLambertMaterial({ map: sandTexture() })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(CITY.oceanX + 3, 0.02, 0);
    beach.receiveShadow = true;
    scene.add(beach);

    // Roads: one asphalt strip per road line, both directions.
    const roadTex = roadTexture();
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
    for (const r of CITY.roads) {
      const ns = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, 500), roadMat.clone());
      ns.material.map = roadTex.clone();
      ns.material.map.repeat.set(1, 10);
      ns.material.map.needsUpdate = true;
      ns.rotation.x = -Math.PI / 2;
      ns.position.set(r, 0.03, 0);
      ns.receiveShadow = true;
      scene.add(ns);
      const ew = new THREE.Mesh(new THREE.PlaneGeometry(500, CITY.roadWidth), roadMat.clone());
      ew.material.map = roadTex.clone();
      ew.material.map.repeat.set(10, 1);
      ew.material.map.needsUpdate = true;
      ew.rotation.x = -Math.PI / 2;
      ew.position.set(0, 0.03, r);
      ew.receiveShadow = true;
      scene.add(ew);
    }

    // Sidewalk slabs under every block, then buildings on them.
    const walkTex = sidewalkTexture();
    const walkMat = new THREE.MeshLambertMaterial({ map: walkTex });
    for (const bx of CITY.blocks) {
      for (const bz of CITY.blocks) {
        const slab = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), walkMat);
        slab.rotation.x = -Math.PI / 2;
        slab.position.set(bx, 0.02, bz);
        slab.receiveShadow = true;
        scene.add(slab);
      }
    }

    // Buildings: 1-2 per block, taller near the centre. The plaza
    // block (0,0) stays open as a park.
    for (const bx of CITY.blocks) {
      for (const bz of CITY.blocks) {
        if (bx === 0 && bz === 0) {
          this.buildPark(bx, bz);
          continue;
        }
        const downtown = 1 - (Math.abs(bx) + Math.abs(bz)) / 400;
        const n = rng() < 0.45 ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const w = range(rng, 10, 15);
          const d = range(rng, 10, 15);
          const h = range(rng, 8, 12) + downtown * range(rng, 8, 30);
          const ox = n === 1 ? 0 : (i === 0 ? -8 : 8);
          const oz = n === 1 ? 0 : (i === 0 ? 8 : -8);
          const x = bx + ox;
          const z = bz + oz;
          const mat = new THREE.MeshLambertMaterial({
            map: facadeTexture(rangeInt(rng, 1, 99999), pick(rng, FACADE_COLORS)),
          });
          const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          b.position.set(x, h / 2, z);
          b.castShadow = true;
          b.receiveShadow = true;
          scene.add(b);
          // A flat roof cap so the top is not a stretched facade.
          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4),
            new THREE.MeshLambertMaterial({ color: 0x4a4a48 })
          );
          roof.position.set(x, h + 0.2, z);
          scene.add(roof);
          this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
          this.buildings.push({ x, z, w, d, h });
        }
      }
    }

    // Trees along sidewalks and in the park.
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f7d33 });
    for (let i = 0; i < 110; i++) {
      const bx = pick(rng, CITY.blocks);
      const bz = pick(rng, CITY.blocks);
      const x = bx + range(rng, -17, 17);
      const z = bz + range(rng, -17, 17);
      if (this.insideBuilding(x, z, 2)) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 6), trunkMat);
      trunk.position.set(x, 1.1, z);
      trunk.castShadow = true;
      scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 1.4, 2.2), 8, 6), leafMat);
      leaves.position.set(x, 3.2, z);
      leaves.castShadow = true;
      scene.add(leaves);
    }

    // Street lamps at intersections.
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
    const lampMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0x554411 });
    for (const rx of CITY.roads) {
      for (const rz of CITY.roads) {
        if (rng() < 0.5) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 6), poleMat);
        pole.position.set(rx + 8, 2.5, rz + 8);
        scene.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampMat);
        lamp.position.set(rx + 8, 5.1, rz + 8);
        scene.add(lamp);
      }
    }
  }

  buildPark(bx, bz) {
    const { scene, rng } = this;
    // A round fountain in the middle of Central Plaza.
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5.4, 1, 20),
      new THREE.MeshLambertMaterial({ color: 0xb0aca0 })
    );
    rim.position.set(bx, 0.5, bz);
    rim.castShadow = true;
    scene.add(rim);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 4.4, 0.3, 20),
      new THREE.MeshLambertMaterial({ color: 0x2f7ea8 })
    );
    water.position.set(bx, 0.95, bz);
    scene.add(water);
    this.colliders.push({ minX: bx - 5.4, maxX: bx + 5.4, minZ: bz - 5.4, maxZ: bz + 5.4 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = bx + Math.cos(a) * 13;
      const z = bz + Math.sin(a) * 13;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.25, 2.2, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b4a2f })
      );
      trunk.position.set(x, 1.1, z);
      scene.add(trunk);
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x3f7d33 })
      );
      leaves.position.set(x, 3.2, z);
      scene.add(leaves);
    }
  }

  insideBuilding(x, z, pad = 0) {
    for (const c of this.colliders) {
      if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return true;
    }
    return false;
  }

  // Push a circle (player / car) out of every building AABB it overlaps.
  resolveCircle(pos, radius) {
    for (const c of this.colliders) {
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          // Dead centre: push out along the smallest penetration axis.
          const pl = pos.x - c.minX;
          const pr = c.maxX - pos.x;
          const pt = pos.z - c.minZ;
          const pb = c.maxZ - pos.z;
          const m = Math.min(pl, pr, pt, pb);
          if (m === pl) pos.x = c.minX - radius;
          else if (m === pr) pos.x = c.maxX + radius;
          else if (m === pt) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        }
      }
    }
    // The ocean is a wall: nobody drives into the sea.
    if (pos.x < CITY.oceanX + 2) pos.x = CITY.oceanX + 2;
    if (pos.x > CITY.bounds) pos.x = CITY.bounds;
    if (pos.z < -CITY.bounds) pos.z = -CITY.bounds;
    if (pos.z > CITY.bounds) pos.z = CITY.bounds;
  }

  // --- road graph helpers (traffic + police drive on this) ---

  randomIntersection(rng) {
    return { x: pick(rng, CITY.roads), z: pick(rng, CITY.roads) };
  }

  // Snap a point to the nearest road centreline.
  nearestRoadPoint(x, z) {
    let bestX = CITY.roads[0];
    let bestZ = CITY.roads[0];
    for (const r of CITY.roads) {
      if (Math.abs(r - x) < Math.abs(bestX - x)) bestX = r;
      if (Math.abs(r - z) < Math.abs(bestZ - z)) bestZ = r;
    }
    if (Math.abs(bestX - x) <= Math.abs(bestZ - z)) return { x: bestX, z, axis: 'x' };
    return { x, z: bestZ, axis: 'z' };
  }

  isOnRoad(x, z, margin = 8) {
    for (const r of CITY.roads) {
      if (Math.abs(x - r) < margin || Math.abs(z - r) < margin) return true;
    }
    return false;
  }
}
