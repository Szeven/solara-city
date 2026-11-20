// The city of Solara: ground, ocean, beach, roads, buildings, palms,
// neon signs and the lighthouse. Builds the three.js scene and returns
// the collision and navigation data the other modules need.

import * as THREE from '../vendor/three.module.min.js';
import { CITY, PALETTE } from './config.js';
import { facadeTexture, roadTexture, sandTexture, oceanTexture, signTexture, palmTexture, rng } from './textures.js';

const BLOCK_CENTRES = [-200, -150, -100, -50, 0, 50, 100, 150, 200];

// A building collider: axis-aligned box in the XZ plane.
export class Collider {
  constructor(minX, maxX, minZ, maxZ) {
    this.minX = minX; this.maxX = maxX; this.minZ = minZ; this.maxZ = maxZ;
  }
  // Push a circle (x,z,r) out of the box; returns true if it overlapped.
  resolve(p, r) {
    const cx = Math.max(this.minX, Math.min(p.x, this.maxX));
    const cz = Math.max(this.minZ, Math.min(p.z, this.maxZ));
    const dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return false;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * r;
      p.z = cz + (dz / d) * r;
    } else {
      // centre inside the box: push out along the smallest penetration
      const pl = p.x - this.minX + r, pr = this.maxX - p.x + r;
      const pt = p.z - this.minZ + r, pb = this.maxZ - p.z + r;
      const m = Math.min(pl, pr, pt, pb);
      if (m === pl) p.x = this.minX - r;
      else if (m === pr) p.x = this.maxX + r;
      else if (m === pt) p.z = this.minZ - r;
      else p.z = this.maxZ + r;
    }
    return true;
  }
}

export function buildWorld(scene) {
  const colliders = [];
  const rand = rng(1234);
  const textures = {
    road: roadTexture(),
    sand: sandTexture(),
    ocean: oceanTexture(),
    palm: palmTexture(),
  };
  textures.road.wrapS = textures.road.wrapT = THREE.RepeatWrapping;
  textures.ocean.wrapS = textures.ocean.wrapT = THREE.RepeatWrapping;
  textures.ocean.repeat.set(8, 8);

  // --- sky, sun, fog -------------------------------------------------
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 260, 620);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
  sun.position.set(180, 260, 120);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd4e6, 0.9));
  const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x3a4a3a, 0.5);
  scene.add(hemi);

  // --- ground slabs --------------------------------------------------
  const groundMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // --- ocean + beach (west of the city) -------------------------------
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 560),
    new THREE.MeshLambertMaterial({ map: textures.ocean }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-250 - 130 + 8, -0.4, 0);
  scene.add(ocean);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 520),
    new THREE.MeshLambertMaterial({ map: textures.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-258, 0.05, 0);
  scene.add(sand);

  // --- roads ----------------------------------------------------------
  const roadMat = new THREE.MeshLambertMaterial({ map: textures.road });
  for (const c of CITY.roads) {
    // vertical road (along z)
    const v = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, 520), roadMat.clone());
    v.material.map = textures.road.clone();
    v.material.map.repeat.set(1, 26);
    v.material.map.needsUpdate = true;
    v.rotation.x = -Math.PI / 2;
    v.position.set(c, 0.06, 0);
    scene.add(v);
    // horizontal road (along x)
    const h = new THREE.Mesh(new THREE.PlaneGeometry(520, CITY.roadWidth), roadMat.clone());
    h.material.map = textures.road.clone();
    h.material.map.repeat.set(26, 1);
    h.material.map.needsUpdate = true;
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.06, c);
    scene.add(h);
  }

  // --- buildings ------------------------------------------------------
  const facadeBases = ['#c9a37e', '#b7c4cc', '#d8b48f', '#a8b8a0', '#cbb3a6', '#9fb4c7', '#d9c9a3'];
  const buildings = [];
  for (const bx of BLOCK_CENTRES) {
    for (const bz of BLOCK_CENTRES) {
      // Skip the marina plaza block (south-east corner) and the pier block.
      if (bx === 200 && bz === 200) continue;
      if (bx === -200 && bz === -200) continue;
      const n = 1 + Math.floor(rand() * 3); // 1-3 towers per block
      for (let i = 0; i < n; i++) {
        const w = 10 + rand() * 14;
        const d = 10 + rand() * 14;
        const h = 8 + rand() * 34;
        const ox = (rand() - 0.5) * (CITY.block - w - 4);
        const oz = (rand() - 0.5) * (CITY.block - d - 4);
        const x = bx + ox, z = bz + oz;
        const base = facadeBases[Math.floor(rand() * facadeBases.length)];
        const mat = new THREE.MeshLambertMaterial({ map: facadeTexture(Math.floor(rand() * 1e6), base) });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, h / 2, z);
        scene.add(mesh);
        // flat roof cap
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
          new THREE.MeshLambertMaterial({ color: 0x3a3f46 }),
        );
        roof.position.set(x, h + 0.25, z);
        scene.add(roof);
        colliders.push(new Collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2));
        buildings.push({ x, z, w, d, h });
      }
    }
  }

  // --- palms along the beach and the marina ---------------------------
  const palmMat = new THREE.MeshLambertMaterial({ map: textures.palm, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  function palm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5, 6), trunkMat);
    trunk.position.set(x, 2.5, z);
    scene.add(trunk);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), palmMat);
    top.position.set(x, 5.6, z);
    top.rotation.x = -Math.PI / 2 + 0.35;
    scene.add(top);
  }
  for (let z = -225; z <= 225; z += 30) palm(-244, z + (rand() - 0.5) * 8);
  for (let i = 0; i < 12; i++) palm(-200 + rand() * 400, 232 + (rand() - 0.5) * 8);

  // --- neon signs on the beachfront -----------------------------------
  const signs = [
    { text: 'OCEAN VIEW', color: '#ff2e88', x: -232, y: 16, z: -75, ry: Math.PI / 2 },
    { text: 'SOLARA', color: '#2ee6ff', x: -232, y: 22, z: 25, ry: Math.PI / 2 },
    { text: 'MARINA', color: '#ffd23f', x: 196, y: 14, z: 196, ry: -Math.PI / 4 },
    { text: 'PIER 9', color: '#ff2e88', x: -232, y: 12, z: 175, ry: Math.PI / 2 },
  ];
  for (const s of signs) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 5.5),
      new THREE.MeshBasicMaterial({ map: signTexture(s.text, s.color), transparent: true }),
    );
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.ry;
    scene.add(m);
  }

  // --- lighthouse at the pier -----------------------------------------
  const light = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3.2, 26, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2ede4 }),
  );
  tower.position.y = 13;
  light.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 3, 10),
    new THREE.MeshLambertMaterial({ color: 0xc2185b }),
  );
  band.position.y = 20;
  light.add(band);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2a0 }),
  );
  lamp.position.y = 27;
  light.add(lamp);
  light.position.set(-242, 0, -190);
  scene.add(light);
  colliders.push(new Collider(-245.5, -238.5, -193.5, -186.5));

  // --- street props: benches + planters on the marina plaza ----------
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
  for (let i = 0; i < 6; i++) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), benchMat);
    bench.position.set(185 + (i % 3) * 10, 0.5, 185 + Math.floor(i / 3) * 14);
    scene.add(bench);
  }

  // --- pier deck jutting into the ocean (the pickup spot) ------------
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a5c3e });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(30, 1, 10), pierMat);
  pier.position.set(-272, 0.4, -40);
  scene.add(pier);
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 2.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x4a3826 }),
    );
    post.position.set(-284 + i * 8, 0.4, -44.5);
    scene.add(post);
  }

  return {
    colliders,
    buildings,
    // Resolve a circle against every building collider.
    collide(p, r) {
      for (const c of colliders) c.resolve(p, r);
      // keep the player inside the world
      p.x = Math.max(-262, Math.min(262, p.x));
      p.z = Math.max(-262, Math.min(262, p.z));
    },
    // Nearest road centre line on one axis.
    nearestRoad(v) {
      let best = CITY.roads[0];
      for (const c of CITY.roads) if (Math.abs(c - v) < Math.abs(best - v)) best = c;
      return best;
    },
    inOcean(x) { return x < CITY.oceanX - 8; },
  };
}
