// Pedestrians for Solara City. They stroll the sidewalks, flee from gunfire
// and danger, and fall when hit.
import * as THREE from 'three';

const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0x9b59b6, 0xfd7e14, 0x1abc9c, 0xecf0f1, 0x34495e, 0xe91e63];
const PANTS = [0x2c3e50, 0x5d4037, 0x37474f, 0x1a1a2e, 0x4e342e];

export class Pedestrian {
  constructor(scene, x, z, rng) {
    this.scene = scene;
    this.rng = rng;
    this.state = 'stroll';
    this.speed = 0;
    this.target = null;
    this.fleeFrom = null;
    this.fallT = 0;
    this.heading = rng.range(0, Math.PI * 2);
    this.walkPhase = rng.range(0, Math.PI * 2);

    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
    const pants = new THREE.MeshLambertMaterial({ color: rng.pick(PANTS) });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.8, 0.22), pants);
    legs.position.y = 0.4;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.3), shirt);
    torso.position.y = 1.12;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
    head.position.y = 1.66;
    group.add(legs);
    group.add(torso);
    group.add(head);
    this.mesh = group;
    // Link back to this pedestrian so a raycast hit can find its owner.
    this.mesh.userData.ped = this;
    this.pos = new THREE.Vector3(x, 0, z);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  setTarget(p) {
    this.target = p;
    this.heading = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
  }

  flee(from) {
    if (this.state === 'fallen') return;
    this.state = 'flee';
    this.fleeFrom = from;
    this.fleeT = 0;
  }

  fall() {
    if (this.state === 'fallen') return;
    this.state = 'fallen';
    this.fallT = 0;
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.25;
  }

  update(dt, city, rng) {
    if (this.state === 'fallen') {
      this.fallT += dt;
      if (this.fallT > 9) {
        this.state = 'stroll';
        this.mesh.rotation.x = 0;
        this.mesh.position.y = 0;
        this.target = null;
      }
      return;
    }
    let speed = 0;
    if (this.state === 'stroll') {
      speed = 1.3;
      if (!this.target || Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z) < 1.5) {
        this.setTarget(city.randomSidewalkPoint(rng));
      }
    } else if (this.state === 'flee') {
      speed = 4.2;
      this.fleeT += dt;
      const dx = this.pos.x - this.fleeFrom.x;
      const dz = this.pos.z - this.fleeFrom.z;
      const d = Math.hypot(dx, dz) || 1;
      this.heading = Math.atan2(dx / d, dz / d);
      if (this.fleeT > 4) {
        this.state = 'stroll';
        this.target = null;
      }
    }
    this.walkPhase += dt * speed * 3.2;
    this.pos.x += Math.sin(this.heading) * speed * dt;
    this.pos.z += Math.cos(this.heading) * speed * dt;
    this.pos.x = Math.max(-248, Math.min(248, this.pos.x));
    this.pos.z = Math.max(-248, Math.min(248, this.pos.z));
    this.mesh.position.set(this.pos.x, this.mesh.position.y, this.pos.z);
    this.mesh.rotation.y = -this.heading;
    this.mesh.rotation.z = Math.sin(this.walkPhase) * 0.06;
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}

export class PedestrianSystem {
  constructor(scene, city, rng, count = 26) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.peds = [];
    for (let i = 0; i < count; i++) {
      const p = city.randomSidewalkPoint(rng);
      this.peds.push(new Pedestrian(scene, p.x, p.z, rng));
    }
  }

  update(dt) {
    for (const ped of this.peds) ped.update(dt, this.city, this.rng);
  }

  // A gunshot or crash at (x, z): the closest ped falls, the rest nearby flee.
  scare(x, z) {
    let nearest = null;
    let nearestD = Infinity;
    for (const ped of this.peds) {
      const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
      if (d < 3.5 && d < nearestD) {
        nearest = ped;
        nearestD = d;
      }
      if (d < 16) ped.flee({ x, z });
    }
    if (nearest) nearest.fall();
    return nearest;
  }

  // How many pedestrians are currently up and walking.
  get walkingCount() {
    return this.peds.filter((p) => p.state !== 'fallen').length;
  }

  nearestPed(x, z, maxD) {
    let best = null;
    let bestD = maxD;
    for (const ped of this.peds) {
      if (ped.state === 'fallen') continue;
      const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
      if (d < bestD) {
        bestD = d;
        best = ped;
      }
    }
    return best;
  }
}
