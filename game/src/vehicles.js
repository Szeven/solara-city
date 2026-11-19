// Cars: meshes, arcade driving physics for the player's car, and the
// traffic AI that drives the road graph.

import * as THREE from 'three';
import { CAR, COLORS } from './config.js';
import { resolveCollisions, clampToCity } from './city.js';

function forwardOf(heading) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

export function createCarMesh(color, isCop = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: isCop ? COLORS.cop : color,
    roughness: 0.35,
    metalness: 0.5,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1a2733,
    roughness: 0.15,
    metalness: 0.7,
  });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 1 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.3), paint);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.62, 2.1), glass);
  cabin.position.set(0, 1.2, -0.25);
  cabin.castShadow = true;
  group.add(cabin);

  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  for (const [x, z] of [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]]) {
    const wheel = new THREE.Mesh(wheelGeo, tyre);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.36, z);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }

  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfff6c9,
    emissive: 0xffe9a0,
    emissiveIntensity: 1.2,
  });
  for (const x of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), lightMat);
    lamp.position.set(x, 0.66, 2.16);
    group.add(lamp);
  }
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xaa1414,
    emissive: 0x660000,
    emissiveIntensity: 0.8,
  });
  for (const x of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat);
    tail.position.set(x, 0.66, -2.16);
    group.add(tail);
  }

  if (isCop) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4), tyre);
    bar.position.set(0, 1.56, -0.25);
    group.add(bar);
    const red = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0022ff, emissiveIntensity: 2 });
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), red);
    r.position.set(-0.28, 1.56, -0.25);
    group.add(r);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), blue);
    b.position.set(0.28, 1.56, -0.25);
    group.add(b);
    group.userData.lightBar = { red: r, blue: b };
  }

  group.userData.wheels = wheels;
  return group;
}

export function makeCar(mesh, x, z, heading, kind, color) {
  return {
    mesh,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    steer: 0,
    kind, // 'traffic' | 'player' | 'cop' | 'parked' | 'mission'
    color,
    cruise: 9,
    target: null,
    from: null,
    stuck: 0,
  };
}

// Arcade driving for the car the player is in. move: {x, y} from input.
export function stepPlayerCar(car, move, dt, colliders, others) {
  if (move.y > 0) {
    car.speed += CAR.accel * dt;
  } else if (move.y < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.6 * dt;
  } else {
    car.speed -= car.speed * 0.9 * dt;
  }
  car.speed = Math.max(-CAR.reverseMax, Math.min(CAR.forwardMax, car.speed));
  const speedRatio = Math.min(1, Math.abs(car.speed) / 14);
  car.heading += move.x * CAR.steer * speedRatio * dt * (car.speed >= 0 ? 1 : -1);
  const f = forwardOf(car.heading);
  car.pos.x += f.x * car.speed * dt;
  car.pos.z += f.z * car.speed * dt;
  resolveCollisions(car.pos, CAR.radius, colliders);
  clampToCity(car.pos);
  pushCarsApart(car, others);
  syncCarMesh(car, dt);
  return car.speed;
}

// Traffic: drive the road graph, slow down for the car ahead.
export function stepTrafficCar(car, dt, graph, others, rng) {
  if (!car.target) {
    car.target = pickNextNode(car, graph, rng);
    if (!car.target) return;
  }
  const dx = car.target.x - car.pos.x;
  const dz = car.target.z - car.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 2.5) {
    car.from = car.target;
    car.target = pickNextNode(car, graph, rng);
    return;
  }
  const desired = Math.atan2(dx, dz);
  let diff = desired - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-1.6, Math.min(1.6, diff * 2.2));
  car.heading += turn * dt;
  // Slow down if another car is close ahead.
  const ahead = carAhead(car, others, 9);
  const targetSpeed = ahead ? 0 : car.cruise;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.6);
  const f = forwardOf(car.heading);
  car.pos.x += f.x * car.speed * dt;
  car.pos.z += f.z * car.speed * dt;
  resolveCollisions(car.pos, CAR.radius, []);
  syncCarMesh(car, dt);
}

function pickNextNode(car, graph, rng) {
  const key = (x, z) => `${Math.round(x)},${Math.round(z)}`;
  // Nearest intersection to the car.
  let best = null;
  let bestD = Infinity;
  for (const node of graph.values()) {
    const d = (node.x - car.pos.x) ** 2 + (node.z - car.pos.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  if (!best) return null;
  const options = best.neighbors.filter((n) => n !== car.from);
  const next = options.length ? rng.pick(options) : rng.pick(best.neighbors);
  return next || null;
}

function carAhead(car, others, range) {
  const f = forwardOf(car.heading);
  for (const o of others) {
    if (o === car) continue;
    // Parked and mission cars sit at the curb; traffic flows past them.
    if (o.kind === 'parked' || o.kind === 'mission') continue;
    const dx = o.pos.x - car.pos.x;
    const dz = o.pos.z - car.pos.z;
    const along = dx * f.x + dz * f.z;
    if (along > 0 && along < range && Math.abs(dx * f.z - dz * f.x) < 2.4) return true;
  }
  return false;
}

function pushCarsApart(car, others) {
  for (const o of others) {
    if (o === car) continue;
    const dx = car.pos.x - o.pos.x;
    const dz = car.pos.z - o.pos.z;
    const d = Math.hypot(dx, dz);
    const min = CAR.radius * 2;
    if (d > 0.01 && d < min) {
      const push = (min - d) / 2;
      const nx = dx / d;
      const nz = dz / d;
      car.pos.x += nx * push;
      car.pos.z += nz * push;
      if (o.kind !== 'player') {
        o.pos.x -= nx * push;
        o.pos.z -= nz * push;
      }
    }
  }
}

export function syncCarMesh(car, dt) {
  car.mesh.position.set(car.pos.x, 0, car.pos.z);
  car.mesh.rotation.y = car.heading;
  const spin = (car.speed * dt) / 0.36;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
}

export function spawnTrafficCar(scene, graph, rng) {
  const nodes = [...graph.values()];
  const node = rng.pick(nodes);
  const next = rng.pick(node.neighbors);
  const heading = next ? Math.atan2(next.x - node.x, next.z - node.z) : 0;
  const color = rng.pick(COLORS.car);
  const mesh = createCarMesh(color, false);
  scene.add(mesh);
  const car = makeCar(mesh, node.x, node.z, heading, 'traffic', color);
  car.target = next || null;
  car.from = node;
  car.cruise = rng.range(7, 12);
  car.speed = car.cruise;
  syncCarMesh(car, 0);
  return car;
}

export function spawnParkedCar(scene, x, z, heading, color) {
  const mesh = createCarMesh(color, false);
  scene.add(mesh);
  const car = makeCar(mesh, x, z, heading, 'parked', color);
  syncCarMesh(car, 0);
  return car;
}
