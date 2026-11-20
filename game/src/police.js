// Solara City — the police: cruisers that chase and ram, and officers
// on foot who bust the player if they get close for long enough.
import { WANTED } from './config.js';
import { buildCarMesh, Car } from './vehicles.js';
import { clamp } from './random.js';
import { buildPedMesh } from './people.js';

export class PoliceSystem {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.cruisers = [];
    this.officers = [];
    this.bustTimer = 0;
  }

  wantedCounts(stars) {
    return {
      cruisers: Math.min(stars, 4),
      officers: stars >= 2 ? Math.min(stars - 1, 3) : 0,
    };
  }

  spawnNear(px, pz, dist) {
    const a = this.rng() * Math.PI * 2;
    const p = this.city.nearestRoadPoint(px + Math.sin(a) * dist, pz + Math.cos(a) * dist);
    return p;
  }

  syncCounts(stars, px, pz) {
    const want = this.wantedCounts(stars);
    while (this.cruisers.length < want.cruisers) {
      const p = this.spawnNear(px, pz, 55);
      const car = new Car(buildCarMesh('cruiser', 0x1b2a4a), 'cruiser', p.x, p.z, 0);
      car.isPolice = true;
      this.cruisers.push(car);
      this.scene.add(car.mesh);
    }
    while (this.cruisers.length > want.cruisers) {
      const car = this.cruisers.pop();
      this.scene.remove(car.mesh);
    }
    while (this.officers.length < want.officers) {
      const p = this.spawnNear(px, pz, 25);
      const mesh = buildPedMesh(this.rng);
      // Navy uniform for officers.
      mesh.children.forEach((c) => {
        if (c.material && c.material.color) c.material = c.material.clone();
      });
      const off = {
        mesh, x: p.x, z: p.z, heading: 0, speed: 4.2, dead: false, walkPhase: 0,
      };
      mesh.position.set(p.x, 0, p.z);
      this.officers.push(off);
      this.scene.add(mesh);
    }
    while (this.officers.length > want.officers) {
      const off = this.officers.pop();
      this.scene.remove(off.mesh);
    }
  }

  clear() {
    for (const c of this.cruisers) this.scene.remove(c.mesh);
    for (const o of this.officers) this.scene.remove(o.mesh);
    this.cruisers = [];
    this.officers = [];
    this.bustTimer = 0;
  }

  update(dt, game) {
    const { player } = game;
    const px = player.x;
    const pz = player.z;
    const stars = game.wanted.stars;
    this.syncCounts(stars, px, pz);

    // Cruisers: chase the player's position, ram when close.
    for (const car of this.cruisers) {
      const dx = px - car.x;
      const dz = pz - car.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      const diff = ((wantHeading - car.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const steer = clamp(diff * 2, -1, 1);
      let throttle = 1;
      if (dist < 6) throttle = 0.6;
      if (dist < 3.5 && player.inCar) {
        // Ram: nudge the player's car.
        throttle = 1;
      }
      car.drive(dt, throttle, steer);
      this.city.resolveCircle(car, 1.6);
      // Flash the light bar.
      car.flash += dt * 6;
      const bar = car.mesh.userData.lightBar;
      if (bar) {
        bar.children[0].material.emissive.setHex(Math.sin(car.flash) > 0 ? 0xff0000 : 0x220000);
        bar.children[1].material.emissive.setHex(Math.sin(car.flash) > 0 ? 0x000022 : 0x0000ff);
      }
      // A cruiser ramming the player on foot hurts.
      if (!player.inCar && dist < 2.2 && Math.abs(car.speed) > 2) {
        player.damage(20 * dt * 3, game);
        game.addHeat(WANTED.ramHeat * dt);
      }
    }

    // Officers: run at the player on foot; they cannot bust someone
    // inside a car, so when the player is driving they hold position.
    let closest = Infinity;
    for (const off of this.officers) {
      if (game.player.inCar) {
        off.mesh.position.set(off.x, 0, off.z);
        continue;
      }
      const dx = px - off.x;
      const dz = pz - off.z;
      const dist = Math.hypot(dx, dz);
      closest = Math.min(closest, dist);
      const want = Math.atan2(dx, dz);
      let diff = ((want - off.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      off.heading += clamp(diff, -4 * dt, 4 * dt);
      const speed = dist > 30 ? 5.5 : 4.2;
      off.x += Math.sin(off.heading) * speed * dt;
      off.z += Math.cos(off.heading) * speed * dt;
      this.city.resolveCircle(off, 0.5);
      off.walkPhase += dt * speed * 3;
      const swing = Math.sin(off.walkPhase) * 0.5;
      if (off.mesh.userData.legs) {
        off.mesh.userData.legs[0].rotation.x = swing;
        off.mesh.userData.legs[1].rotation.x = -swing;
      }
      off.mesh.position.set(off.x, 0, off.z);
      off.mesh.rotation.y = off.heading;
    }
    if (closest < 2.4 && stars > 0) {
      this.bustTimer += dt;
      if (this.bustTimer >= WANTED.bustSeconds) {
        game.busted();
        this.bustTimer = 0;
      }
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }
  }
}
