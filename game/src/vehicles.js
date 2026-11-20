// Solara City — cars: meshes, arcade driving, traffic AI, parked cars.
import * as THREE from 'three';
import { CITY, CAR, CAR_MODELS, TRAFFIC } from './config.js';
import { clamp, pick, range } from './random.js';
import { blobShadowTexture } from './textures.js';

const MODEL_COLORS = {
  sedan: [0x3a6ea5, 0x7a3a5a, 0x2e7d5b],
  hatch: [0xc2a23d, 0x5a8a3a, 0x8a5a2e],
  comet: [0xc0392b],
  van: [0x7f8c8d, 0xdddddd],
  taxi: [0xf1c40f],
  cruiser: [0x1b2a4a],
};

export function buildCarMesh(model, color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x182430 });
  const tyre = new THREE.MeshLambertMaterial({ color: 0x111111 });

  const long = model === 'van' ? 4.6 : model === 'comet' ? 4.2 : 4.0;
  const wide = 1.9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.75, long), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(wide - 0.25, 0.65, model === 'van' ? 3.4 : 2.0),
    glass
  );
  cabin.position.set(0, 1.2, model === 'van' ? -0.2 : -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.position.set(wx, 0.36, wz);
    group.add(w);
  }
  // Headlights and taillights.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x555533 });
  for (const wx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), headMat);
    h.position.set(wx, 0.6, long / 2 + 0.01);
    group.add(h);
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.18, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xaa1111, emissive: 0x330000 })
    );
    t.position.set(wx, 0.6, -long / 2 - 0.01);
    group.add(t);
  }
  if (model === 'cruiser') {
    const bar = new THREE.Group();
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x881111 })
    );
    red.position.x = -0.3;
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x111188 })
    );
    blue.position.x = 0.3;
    bar.add(red);
    bar.add(blue);
    bar.position.set(0, 1.62, -0.2);
    group.add(bar);
    group.userData.lightBar = bar;
  }
  if (model === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xf1c40f, emissive: 0x444400 })
    );
    sign.position.set(0, 1.6, -0.2);
    group.add(sign);
  }
  // Fake blob shadow under the car.
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(wide + 0.6, long + 0.6),
    new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  group.userData.model = model;
  return group;
}

export class Car {
  constructor(mesh, model, x, z, heading) {
    this.mesh = mesh;
    this.model = model;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.isPlayer = false;
    this.isTraffic = false;
    this.isParked = false;
    this.isPolice = model === 'cruiser';
    this.missionCar = false;
    this.stolen = false;
    this.target = null; // traffic: next intersection
    this.cruise = 10;
    this.flash = 0;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  // Arcade drive step. throttle -1..1, steerInput -1..1.
  drive(dt, throttle, steerInput) {
    const def = CAR_MODELS[this.model] ?? CAR_MODELS.sedan;
    const top = def.top;
    const accel = def.accel;
    if (throttle > 0) this.speed += accel * throttle * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= CAR.brake * dt;
      else this.speed += CAR.reverseAccel * throttle * dt;
    } else {
      this.speed -= Math.sign(this.speed) * 6 * dt;
      if (Math.abs(this.speed) < 0.2) this.speed = 0;
    }
    this.speed = clamp(this.speed, -CAR.maxReverse, top);
    const dir = this.speed >= 0 ? 1 : -1;
    this.steer = steerInput * CAR.steerMax;
    this.heading += this.steer * (this.speed / top) * 2.4 * dir * dt;
    const f = this.forward();
    this.x += f.x * this.speed * dt;
    this.z += f.z * this.speed * dt;
    this.syncMesh();
  }
}

export class TrafficSystem {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.cars = [];
    this.spawn();
  }

  spawn() {
    const { rng } = this;
    // Moving traffic on the road graph.
    for (let i = 0; i < TRAFFIC.count; i++) {
      const model = pick(rng, ['sedan', 'hatch', 'taxi', 'van', 'sedan']);
      const color = pick(rng, MODEL_COLORS[model]);
      const p = this.city.randomIntersection(rng);
      const axis = rng() < 0.5 ? 'x' : 'z';
      const heading = axis === 'x' ? (rng() < 0.5 ? 0 : Math.PI) : rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      const car = new Car(buildCarMesh(model, color), model, p.x, p.z, heading);
      car.isTraffic = true;
      car.cruise = range(rng, TRAFFIC.cruiseMin, TRAFFIC.cruiseMax);
      car.target = this.nextTarget(car);
      this.cars.push(car);
      this.scene.add(car.mesh);
    }
    // Parked cars along road edges.
    for (let i = 0; i < TRAFFIC.parked; i++) {
      const model = pick(rng, ['sedan', 'hatch', 'van']);
      const color = pick(rng, MODEL_COLORS[model]);
      const road = pick(rng, CITY.roads);
      const along = pick(rng, CITY.roads) + range(rng, -15, 15);
      const onVertical = rng() < 0.5;
      const x = onVertical ? road + 5.6 : along;
      const z = onVertical ? along : road + 5.6;
      const heading = onVertical ? 0 : Math.PI / 2;
      const car = new Car(buildCarMesh(model, color), model, x, z, heading);
      car.isParked = true;
      this.cars.push(car);
      this.scene.add(car.mesh);
    }
  }

  nextTarget(car) {
    // Pick a neighbouring intersection: keep the axis, change the line,
    // or turn onto the crossing road.
    const roads = CITY.roads;
    const cur = this.city.nearestRoadPoint(car.x, car.z);
    if (cur.axis === 'x') {
      const nextZ = pick(this.rng, roads.filter((r) => r !== Math.round(cur.z)));
      return { x: cur.x, z: nextZ, axis: 'x' };
    }
    const nextX = pick(this.rng, roads.filter((r) => r !== Math.round(cur.x)));
    return { x: nextX, z: cur.z, axis: 'z' };
  }

  carAhead(car, dist) {
    const f = car.forward();
    let best = Infinity;
    for (const other of this.cars) {
      if (other === car || other.isParked) continue;
      const dx = other.x - car.x;
      const dz = other.z - car.z;
      const along = dx * f.x + dz * f.z;
      if (along > 0 && along < dist) {
        const side = Math.abs(dx * f.z - dz * f.x);
        if (side < 2.4 && along < best) best = along;
      }
    }
    return best;
  }

  update(dt, city) {
    for (const car of this.cars) {
      if (!car.isTraffic) continue;
      const t = car.target;
      if (!t) {
        car.target = this.nextTarget(car);
        continue;
      }
      const dx = t.x - car.x;
      const dz = t.z - car.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) {
        car.target = this.nextTarget(car);
        continue;
      }
      const wantHeading = Math.atan2(dx, dz);
      const diff = ((wantHeading - car.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const steer = clamp(diff * 1.5, -1, 1);
      const ahead = this.carAhead(car, 10);
      let throttle = 1;
      if (ahead < 7) throttle = 0;
      if (ahead < 4) throttle = -0.4;
      // Ease into the turn: slow when the heading error is big.
      if (Math.abs(diff) > 0.6) throttle = Math.min(throttle, 0.4);
      car.drive(dt, throttle, steer);
      city.resolveCircle(car, CAR.radius);
    }
  }

  // Keep cars from overlapping each other (cheap circle push).
  separate() {
    const cars = this.cars;
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        const min = 3.4;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const nx = dx / d;
          const nz = dz / d;
          a.x -= nx * push;
          a.z -= nz * push;
          b.x += nx * push;
          b.z += nz * push;
          a.syncMesh();
          b.syncMesh();
        }
      }
    }
  }

  nearestStealable(x, z, maxDist = 4) {
    let best = null;
    let bestD = maxDist;
    for (const car of this.cars) {
      if (car.isPolice) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }
}
