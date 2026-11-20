// The player on foot: a simple visible figure (body, head, cap) that
// walks and runs camera-relative, collides with buildings, and can be
// hurt by police. Driving is handled by vehicles.js; this module owns
// only the on-foot state.

import * as THREE from '../vendor/three.module.min.js';
import { PLAYER } from './config.js';

export class Player {
  constructor(scene) {
    this.pos = new THREE.Vector3(10, 0, 10);
    this.heading = Math.PI; // facing north (-z) at spawn
    this.health = PLAYER.maxHealth;
    this.speed = 0;
    this.moving = false;
    this.inCar = null;

    const group = new THREE.Group();
    const jacket = new THREE.MeshLambertMaterial({ color: 0x2e6f9e });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const denim = new THREE.MeshLambertMaterial({ color: 0x2b3a55 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.95, 10), jacket);
    body.position.y = 1.05;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
    head.position.y = 1.72;
    group.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12), new THREE.MeshLambertMaterial({ color: 0xffd23f }));
    cap.position.y = 1.9;
    group.add(cap);
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.6, 8), denim);
    legL.position.set(-0.16, 0.3, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.16;
    group.add(legR);
    this.legs = [legL, legR];
    this.mesh = group;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  reset(x, z) {
    this.pos.set(x, 0, z);
    this.heading = Math.PI;
    this.health = PLAYER.maxHealth;
    this.inCar = null;
    this.mesh.visible = true;
    this.mesh.position.copy(this.pos);
  }

  // Move on foot. camYaw is the camera's yaw; input axes are camera-relative.
  update(dt, input, camYaw, world) {
    if (this.inCar) { this.moving = false; this.speed = 0; return; }
    const { f, s } = input.axes();
    const target = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const wishX = Math.sin(camYaw) * -f + Math.cos(camYaw) * s;
    const wishZ = Math.cos(camYaw) * -f + Math.sin(camYaw) * -s;
    const len = Math.hypot(wishX, wishZ);
    this.moving = len > 0.01;
    const want = this.moving ? target : 0;
    this.speed += (want - this.speed) * Math.min(1, dt * 10);
    if (this.moving) {
      const nx = wishX / len, nz = wishZ / len;
      this.pos.x += nx * this.speed * dt;
      this.pos.z += nz * this.speed * dt;
      this.heading = Math.atan2(nx, nz);
      // walk-cycle swing on the legs, plus a small body bob so the run reads
      const swing = Math.sin(performance.now() * 0.014) * 0.5;
      this.legs[0].rotation.x = swing;
      this.legs[1].rotation.x = -swing;
      this.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.014)) * 0.06;
    } else {
      this.legs[0].rotation.x = 0;
      this.legs[1].rotation.x = 0;
      this.mesh.position.y = 0;
    }
    world.collide(this.pos, PLAYER.radius);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
  }

  hurt(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(PLAYER.maxHealth, this.health + amount);
  }

  get dead() { return this.health <= 0; }
}
