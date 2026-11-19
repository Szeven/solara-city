// Police: cruisers that chase and ram, officers on foot who bust the
// player. Their numbers follow the wanted stars, and they despawn when the
// player gets far away.

import * as THREE from 'three';
import { WANTED } from './config.js';
import { createCarMesh, makeCar, syncCarMesh } from './vehicles.js';
import { createPedMesh } from './people.js';
import { resolveCollisions, clampToCity } from './city.js';

export function createPoliceSystem(scene, graph, rng) {
  return {
    scene,
    graph,
    rng,
    cars: [],
    officers: [],
    siren: false,
    flash: 0,

    // Spawn / despawn to match the wanted level.
    update(dt, ctx) {
      const stars = ctx.wantedStars;
      const wantCars = WANTED.copCars[stars] || 0;
      const wantFoot = WANTED.copFoot[stars] || 0;
      while (this.cars.length < wantCars) this.spawnCar(ctx.playerPos);
      while (this.officers.length < wantFoot) this.spawnOfficer(ctx.playerPos);
      this.siren = this.cars.length > 0 || this.officers.length > 0;
      this.flash += dt * 6;

      // Cop cars chase the player.
      for (let i = this.cars.length - 1; i >= 0; i--) {
        const cop = this.cars[i];
        const dx = ctx.playerPos.x - cop.pos.x;
        const dz = ctx.playerPos.z - cop.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 190) {
          this.scene.remove(cop.mesh);
          this.cars.splice(i, 1);
          continue;
        }
        // Pursuit: aim slightly ahead of the player.
        const px = ctx.playerPos.x + (ctx.playerVel?.x || 0) * 0.4;
        const pz = ctx.playerPos.z + (ctx.playerVel?.z || 0) * 0.4;
        const desired = Math.atan2(px - cop.pos.x, pz - cop.pos.z);
        let diff = desired - cop.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cop.heading += Math.max(-2.2, Math.min(2.2, diff * 2.5)) * dt;
        const targetSpeed = dist > 8 ? 40 : 26;
        cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 1.2);
        cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
        resolveCollisions(cop.pos, 1.6, ctx.colliders);
        clampToCity(cop.pos);
        syncCarMesh(cop, dt);
        // Flash the light bar.
        const bar = cop.mesh.userData.lightBar;
        if (bar) {
          const on = Math.sin(this.flash) > 0;
          bar.red.material.emissiveIntensity = on ? 2.4 : 0.2;
          bar.blue.material.emissiveIntensity = on ? 0.2 : 2.4;
        }
        // Ram the player's car.
        if (ctx.playerCar && dist < 3.4) {
          ctx.onRam?.(cop);
        }
        // Run the player down on foot.
        if (!ctx.playerCar && dist < 1.6) {
          ctx.onHit?.(cop, dt);
        }
      }

      // Officers on foot run the player down and bust them.
      for (let i = this.officers.length - 1; i >= 0; i--) {
        const off = this.officers[i];
        const dx = ctx.playerPos.x - off.pos.x;
        const dz = ctx.playerPos.z - off.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 170 || ctx.playerCar) {
          this.scene.remove(off.mesh);
          this.officers.splice(i, 1);
          continue;
        }
        off.heading = Math.atan2(dx, dz);
        off.pos.x += Math.sin(off.heading) * 7 * dt;
        off.pos.z += Math.cos(off.heading) * 7 * dt;
        resolveCollisions(off.pos, 0.4, ctx.colliders);
        off.mesh.position.set(off.pos.x, 0, off.pos.z);
        off.mesh.rotation.y = off.heading;
        if (dist < 1.4) {
          off.bustTime = (off.bustTime || 0) + dt;
          if (off.bustTime > 1.1) ctx.onBusted?.();
        } else {
          off.bustTime = 0;
        }
      }
    },

    spawnCar(playerPos) {
      // Pick an intersection 90-150 m from the player.
      const nodes = [...this.graph.values()].filter((n) => {
        const d = Math.hypot(n.x - playerPos.x, n.z - playerPos.z);
        return d > 90 && d < 160;
      });
      const node = nodes.length ? this.rng.pick(nodes) : this.rng.pick([...this.graph.values()]);
      const next = this.rng.pick(node.neighbors);
      const heading = next ? Math.atan2(next.x - node.x, next.z - node.z) : 0;
      const mesh = createCarMesh(0x1d2f4d, true);
      this.scene.add(mesh);
      const cop = makeCar(mesh, node.x, node.z, heading, 'cop', 0x1d2f4d);
      cop.speed = 12;
      syncCarMesh(cop, 0);
      this.cars.push(cop);
    },

    spawnOfficer(playerPos) {
      const angle = this.rng.range(0, Math.PI * 2);
      const x = playerPos.x + Math.cos(angle) * 45;
      const z = playerPos.z + Math.sin(angle) * 45;
      const mesh = createPedMesh(0x1d2f4d);
      this.scene.add(mesh);
      const off = {
        mesh,
        pos: new THREE.Vector3(x, 0, z),
        heading: 0,
        bustTime: 0,
      };
      mesh.position.set(x, 0, z);
      this.officers.push(off);
    },

    clear() {
      for (const cop of this.cars) this.scene.remove(cop.mesh);
      for (const off of this.officers) this.scene.remove(off.mesh);
      this.cars = [];
      this.officers = [];
      this.siren = false;
    },
  };
}
