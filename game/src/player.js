// The player on foot and behind the wheel. Walk/run with a jump, steal any
// stopped car with E, and step out the same way.
import * as THREE from 'three';
import { resolveBuildingCollision } from './city.js';

export class Player {
  constructor(scene, x = 0, z = 0) {
    this.scene = scene;
    this.health = 100;
    this.cash = 0;
    this.pos = new THREE.Vector3(x, 0, z);
    this.velY = 0;
    this.heading = 0;
    this.inCar = false;
    this.car = null;
    this.walkPhase = 0;

    const group = new THREE.Group();
    const jacket = new THREE.MeshLambertMaterial({ color: 0x0e7c7b });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.8, 0.24), pants);
    legs.position.y = 0.4;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.32), jacket);
    torso.position.y = 1.12;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
    head.position.y = 1.66;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0xffc93c }));
    cap.position.y = 1.84;
    group.add(legs, torso, head, cap);
    this.mesh = group;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  enterCar(car) {
    this.inCar = true;
    this.car = car;
    car.parked = false;
    this.mesh.visible = false;
  }

  // Put the player back on foot at a spot: used after a bust and by saves.
  respawn(x, z) {
    if (this.inCar) this.exitCar();
    this.pos.set(x, 0, z);
    this.mesh.position.copy(this.pos);
    this.mesh.visible = true;
    this.health = 100;
  }

  get isMoving() {
    if (this.inCar) return this.car ? Math.abs(this.car.speed) > 0.5 : false;
    return false;
  }

  exitCar() {
    if (!this.car) return;
    const f = this.car.forward();
    this.pos.set(this.car.pos.x - f.z * 2.2, 0, this.car.pos.z + f.x * 2.2);
    this.mesh.visible = true;
    this.mesh.position.copy(this.pos);
    this.inCar = false;
    this.car = null;
  }

  update(dt, input, city, cameraYaw, nearbyCars, onSteal) {
    if (this.inCar) {
      if (!this.car) {
        this.inCar = false;
        return;
      }
      const mv = input.moveVector();
      const brake = input.down('Space');
      this.car.drive(dt, mv.z, -mv.x, brake);
      resolveBuildingCollision(city.colliders, this.car.pos, 2.2);
      this.car.syncMesh();
      this.pos.copy(this.car.pos);
      this.heading = this.car.heading;
      if (input.pressed('KeyE')) this.exitCar();
      return;
    }

    const mv = input.moveVector();
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = running ? 7.5 : 4.2;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const mx = mv.x * cos - mv.z * sin;
    const mz = mv.x * sin + mv.z * cos;
    this.pos.x += mx * speed * dt;
    this.pos.z += mz * speed * dt;
    if (mv.x !== 0 || mv.z !== 0) {
      this.heading = Math.atan2(mx, mz);
      this.walkPhase += dt * speed * 2.4;
    }
    // Jump with a little gravity.
    if (input.pressed('Space') && this.pos.y <= 0.01) this.velY = 6.5;
    this.velY -= 18 * dt;
    this.pos.y = Math.max(0, this.pos.y + this.velY * dt);
    if (this.pos.y === 0) this.velY = 0;
    this.pos.x = Math.max(-256, Math.min(256, this.pos.x));
    this.pos.z = Math.max(-256, Math.min(256, this.pos.z));
    resolveBuildingCollision(city.colliders, this.pos, 0.6);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = -this.heading;
    this.mesh.rotation.z = Math.sin(this.walkPhase) * 0.05;

    if (input.pressed('KeyE')) {
      let best = null;
      let bestD = 3.4;
      for (const car of nearbyCars) {
        if (car.broken) continue;
        const d = Math.hypot(car.pos.x - this.pos.x, car.pos.z - this.pos.z);
        if (d < bestD && Math.abs(car.speed) < 1.5) {
          bestD = d;
          best = car;
        }
      }
      if (best) {
        if (best.parked && onSteal) onSteal(best);
        this.enterCar(best);
      }
    }
  }
}
