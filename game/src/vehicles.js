// Cars: one low-poly model builder (body, cabin, wheels, lights), the traffic AI
// that drives them around the road graph, and the arcade driving model the player
// uses — throttle, steering that bites harder with speed, building and car bumps.

import * as THREE from 'three';
import { CAR, TRAFFIC, PALETTE } from './config.js';
import { nearestNode, collideCircle, clampToCity } from './city.js';

const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
const tireMat = new THREE.MeshLambertMaterial({ color: 0x16161a });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xd82020 });

/** Build a car mesh. `kind` picks the extras: a taxi sign, a police bar, a spoiler. */
export function buildCar(color, kind = 'civilian') {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.3), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.1, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.9), paint);
  hood.position.set(0, 0.82, 1.75);
  g.add(hood);
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w);
  }
  for (const x of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
    head.position.set(x, 0.62, 2.16);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat);
    tail.position.set(x, 0.62, -2.16);
    g.add(tail);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe93a }));
    sign.position.set(0, 1.5, -0.2);
    g.add(sign);
  }
  if (kind === 'police') {
    const blue = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x3050ff }));
    blue.position.set(0, 1.45, -0.2);
    g.add(blue);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.set(0.35, 1.45, -0.2);
    g.add(red);
  }
  if (kind === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.3), tireMat);
    spoiler.position.set(0, 1.05, -2.05);
    g.add(spoiler);
  }
  return g;
}

export function carState(mesh, x, z, heading, color, kind) {
  return {
    mesh,
    x,
    z,
    heading,
    speed: 0,
    color,
    kind,
    health: CAR.health,
    dead: false,
    isPlayer: false,
    isTraffic: false,
    node: null,
    next: null,
    stopped: 0,
  };
}

/** Spawn a traffic car at a road node near (x, z), already rolling toward a neighbour. */
export function spawnTrafficCar(scene, graph, random, nearX, nearZ) {
  const kind = random() < 0.12 ? 'taxi' : 'civilian';
  const color = kind === 'taxi' ? PALETTE.taxi : PALETTE.car[Math.floor(random() * PALETTE.car.length)];
  const mesh = buildCar(color, kind);
  scene.add(mesh);
  const car = carState(mesh, 0, 0, 0, color, kind);
  car.isTraffic = true;
  const node = nearestNode(graph, nearX + (random() - 0.5) * 320, nearZ + (random() - 0.5) * 320);
  car.node = node;
  car.next = node.links[Math.floor(random() * node.links.length)];
  car.x = node.x;
  car.z = node.z;
  car.heading = Math.atan2(car.next.x - node.x, car.next.z - node.z);
  car.speed = TRAFFIC.speed * (0.8 + random() * 0.4);
  return car;
}

/** One traffic step: follow the road graph, brake for the car ahead, turn at nodes. */
export function stepTraffic(car, dt, graph, random, cars, player) {
  if (car.dead) return;
  const dx = car.next.x - car.x;
  const dz = car.next.z - car.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  let dh = want - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
  // Brake for anything ahead on the same stretch of road.
  let target = TRAFFIC.speed;
  const aheadOf = (ox, oz) => {
    const ahead = ox * Math.sin(car.heading) + oz * Math.cos(car.heading);
    const side = Math.abs(ox * Math.cos(car.heading) - oz * Math.sin(car.heading));
    return ahead > 0 && ahead < TRAFFIC.gap && side < 3;
  };
  for (const other of cars) {
    if (other === car || other.dead) continue;
    if (aheadOf(other.x - car.x, other.z - car.z)) {
      target = 0;
      break;
    }
  }
  if (player && player.inCar && aheadOf(player.x - car.x, player.z - car.z)) target = 0;
  car.speed += (target - car.speed) * Math.min(1, 2.5 * dt);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  if (dist < 3) {
    car.node = car.next;
    const opts = car.node.links.filter((n) => n !== car.node);
    car.next = opts[Math.floor(random() * opts.length)] || car.node.links[0];
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}

/** Arcade driving for the player's car: throttle, braking, steering, collisions. */
export function stepPlayerCar(car, move, dt, colliders, cars, onCrash) {
  const forward = move.y;
  const steer = move.x;
  const speed01 = Math.abs(car.speed) / CAR.top;
  if (forward > 0) car.speed += CAR.accel * dt * (1 - speed01 * 0.7);
  else if (forward < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverse * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  }
  car.speed = Math.max(-CAR.topReverse, Math.min(CAR.top, car.speed));
  car.heading += steer * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 8 + 0.25) * Math.sign(car.speed || 1);
  let nx = car.x + Math.sin(car.heading) * car.speed * dt;
  let nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const hit = collideCircle(colliders, nx, nz, 1.9);
  if (hit.pushed) {
    if (Math.abs(car.speed) > 12) onCrash(Math.abs(car.speed));
    car.speed *= 0.35;
    nx = hit.x;
    nz = hit.z;
  }
  // Shove other cars aside on contact.
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const dx = nx - other.x;
    const dz = nz - other.z;
    const d = Math.hypot(dx, dz);
    if (d < 4.2 && d > 0.01) {
      const push = (4.2 - d) / 2;
      nx += (dx / d) * push;
      nz += (dz / d) * push;
      other.x -= (dx / d) * push;
      other.z -= (dz / d) * push;
      if (Math.abs(car.speed) > 10) {
        onCrash(Math.abs(car.speed));
        car.speed *= 0.6;
      }
    }
  }
  const cl = clampToCity(nx, nz);
  car.x = cl.x;
  car.z = cl.z;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // Lean into corners with speed.
  car.mesh.rotation.z = -steer * Math.min(0.1, Math.abs(car.speed) * 0.004);
}
