// Cars for Solara City: the player's arcade driving, parked cars to steal,
// and traffic AI that follows the road graph.
import * as THREE from 'three';
import { ROADS, resolveBuildingCollision } from './city.js';

const CAR_COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0x7f8c8d, 0x27ae60, 0x8e44ad, 0xe67e22, 0x2c3e50, 0xecf0f1, 0x16a085];

export function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 2.0), paint);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 1.8), glass);
  cabin.position.set(-0.2, 1.3, 0);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[1.45, 0.95], [1.45, -0.95], [-1.45, 0.95], [-1.45, -0.95]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0xaa9922 });
  for (const wz of [0.6, -0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.35), lightMat);
    lamp.position.set(2.22, 0.72, wz);
    group.add(lamp);
  }
  // Brake lights at the rear; they flare when the car brakes.
  const brakeMat = new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x330000 });
  for (const wz of [0.6, -0.6]) {
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.35), brakeMat);
    brake.position.set(-2.22, 0.72, wz);
    group.add(brake);
  }
  let lightBar = null;
  if (isPolice) {
    lightBar = new THREE.Group();
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff0000 }),
    );
    red.position.z = 0.45;
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0022ff }),
    );
    blue.position.z = -0.45;
    lightBar.add(red);
    lightBar.add(blue);
    lightBar.position.set(-0.2, 1.72, 0);
    lightBar.userData = { red, blue };
    group.add(lightBar);
  }
  return { group, lightBar };
}

export class Car {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.isPolice = !!opts.isPolice;
    this.color = opts.color ?? 0xc0392b;
    const { group, lightBar } = buildCarMesh(this.color, this.isPolice);
    this.mesh = group;
    this.lightBar = lightBar;
    this.mesh.userData.car = this;
    this.brakeMat = null;
    group.traverse((child) => {
      if (child.isMesh && child.material && child.material.color && child.material.color.getHex() === 0xcc2222) {
        this.brakeMat = child.material;
      }
    });
    this.pos = new THREE.Vector3(opts.x ?? 0, 0, opts.z ?? 0);
    this.heading = opts.heading ?? 0;
    this.speed = 0;
    this.steer = 0;
    this.maxSpeed = opts.maxSpeed ?? 26;
    this.accel = opts.accel ?? 14;
    this.flashT = 0;
    scene.add(this.mesh);
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = -this.heading;
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  // Arcade drive: throttle -1..1, steer -1..1, brake boolean.
  drive(dt, throttle, steer, brake) {
    const targetSteer = steer * 0.55;
    this.steer += (targetSteer - this.steer) * Math.min(1, dt * 8);
    if (this.brakeMat) this.brakeMat.emissive.setHex(brake ? 0xff2222 : 0x330000);
    if (brake) {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 30 * dt);
    } else if (throttle !== 0) {
      this.speed += throttle * this.accel * dt;
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 6 * dt);
    }
    this.speed = Math.max(-10, Math.min(this.maxSpeed, this.speed));
    const grip = Math.min(1, Math.abs(this.speed) / 8);
    this.heading += this.steer * (this.speed / 3.2) * grip * dt;
    const f = this.forward();
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
    // Keep inside the city; bounce softly off the edge.
    if (Math.abs(this.pos.x) > 258 || Math.abs(this.pos.z) > 258) {
      this.pos.x = Math.max(-258, Math.min(258, this.pos.x));
      this.pos.z = Math.max(-258, Math.min(258, this.pos.z));
      this.speed *= 0.4;
    }
    this.syncMesh();
  }

  updateFlash(dt, on) {
    if (!this.lightBar) return;
    this.flashT += dt;
    const phase = Math.floor(this.flashT * 6) % 2 === 0;
    const { red, blue } = this.lightBar.userData;
    red.material.emissive.setHex(on && phase ? 0xff0000 : 0x220000);
    blue.material.emissive.setHex(on && !phase ? 0x2244ff : 0x000022);
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}

function randomRoadPoint(rng) {
  const road = rng.pick(ROADS);
  const along = rng.range(-240, 240);
  return rng.chance(0.5) ? { x: road, z: along } : { x: along, z: road };
}

// Traffic that cruises the road graph: pick the next intersection, drive
// straight to it, repeat. Cars slow for the one ahead of them.
export class TrafficSystem {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.cars = [];
    for (let i = 0; i < 14; i++) this.spawn();
  }

  spawn() {
    const p = randomRoadPoint(this.rng);
    const car = new Car(this.scene, {
      x: p.x,
      z: p.z,
      heading: this.rng.range(0, Math.PI * 2),
      color: this.rng.pick(CAR_COLORS),
      maxSpeed: this.rng.range(8, 13),
      accel: 8,
    });
    const node = this.city.nearestNode(p.x, p.z);
    car.target = this.pickNext(node, null);
    car.cruiseSpeed = car.maxSpeed;
    this.cars.push(car);
    return car;
  }

  pickNext(node, prev) {
    const options = this.city.nodes.filter(
      (n) => (n.x === node.x || n.z === node.z) && n !== node && n !== prev
        && (Math.abs(n.x - node.x) === 50 || Math.abs(n.z - node.z) === 50),
    );
    return options.length ? this.rng.pick(options) : node;
  }

  update(dt, playerPos) {
    for (const car of this.cars) {
      const t = car.target;
      const dx = t.x - car.pos.x;
      const dz = t.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4) {
        const prev = this.city.nearestNode(car.pos.x, car.pos.z);
        car.target = this.pickNext(prev, t);
        continue;
      }
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.6));
      // Slow down for the car ahead.
      let throttle = 1;
      for (const other of this.cars) {
        if (other === car) continue;
        const ox = other.pos.x - car.pos.x;
        const oz = other.pos.z - car.pos.z;
        const od = Math.hypot(ox, oz);
        if (od < 7 && od > 0.01) {
          const f = car.forward();
          const dot = (ox * f.x + oz * f.z) / od;
          if (dot > 0.7) throttle = 0;
        }
      }
      car.drive(dt, throttle, steer, false);
      car.speed = Math.min(car.speed, car.cruiseSpeed);
      resolveBuildingCollision(this.city.colliders, car.pos, 2.2);
      car.syncMesh();
      // Recycle cars that drifted far from the player.
      if (playerPos && Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z) > 420) {
        const p = randomRoadPoint(this.rng);
        car.pos.set(p.x, 0, p.z);
        car.target = this.city.nearestNode(p.x, p.z);
      }
    }
  }
}

// A parked car at a road edge, ready to be stolen or delivered.
export function spawnParkedCar(scene, city, rng, color) {
  const road = rng.pick(ROADS);
  const along = rng.range(-220, 220);
  const onXRoad = rng.chance(0.5);
  const x = onXRoad ? road + 5.5 : along;
  const z = onXRoad ? along : road + 5.5;
  const heading = onXRoad ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
  const car = new Car(scene, { x, z, heading, color: color ?? rng.pick(CAR_COLORS), maxSpeed: 24 });
  car.speed = 0;
  car.parked = true;
  return car;
}
