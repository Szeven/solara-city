// Cars: the player's drivable cars, parked mission cars, and traffic
// that follows the road graph. Arcade handling: accelerate, brake,
// reverse, steering that fades with speed, and a handbrake that cuts
// grip. Stealing is E next to a car; E again gets out.

import * as THREE from '../vendor/three.module.min.js';
import { CAR, CITY } from './config.js';
import { rng } from './textures.js';

const TRAFFIC_COLORS = [0xc0c4c8, 0x3a5a8c, 0x8c2f2f, 0x2f7a4a, 0xd8d8d8, 0x222831, 0xe8a33d];

export function makeCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.3), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 2.1), glass);
  cabin.position.set(0, 1.1, -0.25);
  group.add(cabin);
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.4), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    bar.position.set(0, 1.42, -0.25);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.34), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.3, 1.52, -0.25);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.34), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(0.3, 1.52, -0.25);
    group.add(blue);
    group.userData.lights = [red, blue];
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    group.add(w);
    wheels.push(w);
  }
  group.userData.wheels = wheels;
  // headlights: two small emissive lamps on the front (z = +2.15)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), lampMat);
    lamp.position.set(x, 0.62, 2.16);
    group.add(lamp);
  }
  return group;
}

export class Car {
  constructor(scene, x, z, heading, color, opts = {}) {
    this.scene = scene;
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.color = color;
    this.id = opts.id || null; // mission target id: comet / sultan / banshee
    this.isPolice = !!opts.police;
    this.isTraffic = !!opts.traffic;
    this.parked = !!opts.parked;
    this.mesh = makeCarMesh(color, this.isPolice);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    // traffic state
    this.axis = opts.axis || 'z'; // road direction the car travels
    this.line = opts.line || 0; // the road centre line it follows
    this.dir = opts.dir || 1;
    this.cruise = 8 + Math.random() * 4;
  }

  get forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  // Arcade drive step for the player's car.
  drive(dt, input, world, others) {
    const { f } = input.axes();
    const handbrake = input.down('Space');
    if (f > 0) this.speed += CAR.accel * dt;
    else if (f < 0) this.speed -= (this.speed > 0.5 ? CAR.brake : CAR.reverseAccel) * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    if (handbrake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 22 * dt);
    this.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, this.speed));
    const steerInput = (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
    const grip = handbrake ? CAR.handbrakeGrip : CAR.grip;
    const steerAmount = steerInput * CAR.steer * Math.min(1, Math.abs(this.speed) / 8) * (this.speed >= 0 ? 1 : -1);
    this.heading += steerAmount * dt * Math.min(1, grip / 6.5 + 0.4);
    const fw = this.forward;
    this.pos.x += fw.x * this.speed * dt;
    this.pos.z += fw.z * this.speed * dt;
    world.collide(this.pos, 1.7);
    this.separate(others);
    this.syncMesh(dt);
  }

  // Traffic step: follow the road graph, turning at intersections.
  trafficStep(dt, world, others) {
    if (this.parked) { this.syncMesh(dt); return; }
    const at = this.axis === 'z' ? this.pos.z : this.pos.x;
    // At an intersection (within 1 m of a crossing road line), maybe turn.
    for (const line of CITY.roads) {
      if (Math.abs(at - line) < 1.2 && Math.abs(this.line - line) > 20) {
        if (Math.random() < 0.004) {
          this.axis = this.axis === 'z' ? 'x' : 'z';
          this.line = line;
          this.dir = Math.random() < 0.5 ? 1 : -1;
          this.heading = this.axis === 'z' ? (this.dir > 0 ? 0 : Math.PI) : (this.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        }
        break;
      }
    }
    // Drive along the current road line; bounce at the city edge.
    const edge = 240;
    const along = this.axis === 'z' ? this.pos.z : this.pos.x;
    if (along > edge || along < -edge) this.dir *= -1;
    this.speed = this.cruise;
    if (this.axis === 'z') {
      this.pos.z += this.dir * this.speed * dt;
      this.pos.x += (this.line - this.pos.x) * Math.min(1, dt * 2);
      this.heading = this.dir > 0 ? 0 : Math.PI;
    } else {
      this.pos.x += this.dir * this.speed * dt;
      this.pos.z += (this.line - this.pos.z) * Math.min(1, dt * 2);
      this.heading = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    this.separate(others);
    this.syncMesh(dt);
  }

  separate(others) {
    for (const o of others) {
      if (o === this) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 12.25 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (3.5 - d) / 2;
        this.pos.x += (dx / d) * push;
        this.pos.z += (dz / d) * push;
      }
    }
  }

  syncMesh(dt) {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * dt * 2.4;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
  }

  remove() {
    this.scene.remove(this.mesh);
  }
}

export class Traffic {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cars = [];
    const rand = rng(777);
    for (let i = 0; i < 14; i++) {
      const axis = rand() < 0.5 ? 'z' : 'x';
      const line = CITY.roads[Math.floor(rand() * CITY.roads.length)];
      const along = -230 + rand() * 460;
      const x = axis === 'z' ? line + (rand() - 0.5) * 4 : along;
      const z = axis === 'z' ? along : line + (rand() - 0.5) * 4;
      const color = TRAFFIC_COLORS[Math.floor(rand() * TRAFFIC_COLORS.length)];
      this.cars.push(new Car(scene, x, z, axis === 'z' ? 0 : Math.PI / 2, color, {
        traffic: true, axis, line, dir: rand() < 0.5 ? 1 : -1,
      }));
    }
    // Parked mission cars (they wait until stolen).
    this.missionCars = {
      comet: new Car(scene, -228, -75, Math.PI / 2, 0xffd23f, { parked: true, id: 'comet' }),
      sultan: new Car(scene, 75, -228, 0, 0x2e6fd8, { parked: true, id: 'sultan' }),
      banshee: new Car(scene, 228, 125, -Math.PI / 2, 0xd81f2a, { parked: true, id: 'banshee' }),
    };
    this.cars.push(...Object.values(this.missionCars));
  }

  update(dt, playerCar) {
    const all = this.cars;
    for (const c of all) {
      if (c === playerCar) continue;
      c.trafficStep(dt, this.world, all);
    }
  }

  nearest(x, z, maxDist) {
    let best = null, bestD = maxDist;
    for (const c of this.cars) {
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }
}
