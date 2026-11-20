// Solara City — the player: on foot, in a car, shooting, health, cash.
import * as THREE from 'three';
import { PLAYER, COMBAT, WANTED, CAR } from './config.js';
import { clamp } from './random.js';

export class Player {
  constructor(scene, x, z) {
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.yaw = Math.PI; // facing the city from the west edge
    this.pitch = 0;
    this.health = PLAYER.health;
    this.cash = 0;
    this.ammo = COMBAT.pistolAmmo;
    this.reserve = COMBAT.pistolReserve;
    this.inCar = false;
    this.car = null;
    this.fireTimer = 0;
    this.reloadTimer = 0;
    this.dead = false;
    this.speed = 0;
    // A simple visible body so the player sees themself in third person.
    const body = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2e86c1 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
    torso.position.y = 1.05;
    torso.castShadow = true;
    body.add(torso);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xe8b98a })
    );
    head.position.y = 1.62;
    head.castShadow = true;
    body.add(head);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.7, 0.24),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 })
    );
    legs.position.y = 0.35;
    body.add(legs);
    this.body = body;
    this.tracers = [];
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = COMBAT.pistolRange;
  }

  eyePos() {
    return new THREE.Vector3(this.x, PLAYER.eyeHeight, this.z);
  }

  forward() {
    return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
  }

  syncBody() {
    this.body.position.set(this.x, 0, this.z);
    this.body.rotation.y = this.yaw + Math.PI;
    this.body.visible = !this.inCar;
  }

  damage(amount, game) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      game.wasted();
    }
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, PLAYER.health);
  }

  // --- on-foot movement ---
  updateOnFoot(dt, game) {
    const input = game.input;
    const f = this.forward();
    const r = { x: -f.z, z: f.x };
    let mx = 0;
    let mz = 0;
    if (input.down('KeyW')) { mx += f.x; mz += f.z; }
    if (input.down('KeyS')) { mx -= f.x; mz -= f.z; }
    if (input.down('KeyD')) { mx += r.x; mz += r.z; }
    if (input.down('KeyA')) { mx -= r.x; mz -= r.z; }
    const len = Math.hypot(mx, mz);
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    this.speed = len > 0 ? speed : 0;
    if (len > 0) {
      mx /= len;
      mz /= len;
      this.x += mx * speed * dt;
      this.z += mz * speed * dt;
      game.city.resolveCircle(this, PLAYER.radius);
    }
    // Face the movement direction in third person.
    if (len > 0) this.bodyYaw = Math.atan2(mx, mz);
    this.syncBody();
  }

  // --- shooting ---
  tryFire(game) {
    if (this.inCar || this.reloadTimer > 0 || this.fireTimer > 0) return;
    if (this.ammo <= 0) {
      this.startReload(game);
      return;
    }
    this.fireTimer = COMBAT.fireInterval;
    this.ammo--;
    game.sounds.gunshot();
    game.addHeat(WANTED.shootHeat);
    game.peds.scare(this.x, this.z, 25);
    // Hitscan from the camera through the crosshair.
    const camera = game.camera;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const targets = [];
    for (const ped of game.peds.peds) {
      if (!ped.dead) targets.push(ped.mesh);
    }
    for (const off of game.police.officers) targets.push(off.mesh);
    for (const car of game.traffic.cars) targets.push(car.mesh);
    const hits = this.raycaster.intersectObjects(targets, true);
    let end;
    if (hits.length > 0) {
      const hit = hits[0];
      end = hit.point.clone();
      this.applyHit(hit.object, game);
    } else {
      end = this.raycaster.ray.at(COMBAT.pistolRange, new THREE.Vector3());
    }
    // Tracer: a fading line from the muzzle to the hit point.
    const start = camera.position.clone();
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 })
    );
    this.scene.add(line);
    this.tracers.push({ line, ttl: 0.08 });
    if (this.ammo === 0) this.startReload(game);
  }

  applyHit(object, game) {
    // Walk up to the object that owns game state.
    let o = object;
    while (o) {
      if (o.userData && o.userData.pedRef) break;
      o = o.parent;
    }
    // Simpler: match by mesh identity against peds / officers / cars.
    for (const ped of game.peds.peds) {
      if (ped.mesh === object || ped.mesh.children.includes(object) || this.isDescendant(ped.mesh, object)) {
        if (!ped.dead) {
          game.peds.kill(ped);
          game.addHeat(WANTED.killHeat);
          game.toast('You hit a civilian — the cops noticed.');
        }
        return;
      }
    }
    for (const off of game.police.officers) {
      if (this.isDescendant(off.mesh, object)) {
        game.addHeat(WANTED.copKillHeat);
        game.toast('You shot an officer — 2 stars!');
        return;
      }
    }
    for (const car of game.traffic.cars) {
      if (this.isDescendant(car.mesh, object)) {
        game.addHeat(WANTED.shootHeat * 0.5);
        return;
      }
    }
  }

  isDescendant(root, node) {
    let o = node;
    while (o) {
      if (o === root) return true;
      o = o.parent;
    }
    return false;
  }

  startReload(game) {
    if (this.reloadTimer > 0 || this.reserve <= 0 || this.ammo === COMBAT.pistolAmmo) return;
    this.reloadTimer = COMBAT.reloadSeconds;
    game.sounds.click();
  }

  finishReload() {
    const need = COMBAT.pistolAmmo - this.ammo;
    const take = Math.min(need, this.reserve);
    this.ammo += take;
    this.reserve -= take;
  }

  updateTracers(dt) {
    for (const t of this.tracers) {
      t.ttl -= dt;
      t.line.material.opacity = Math.max(0, t.ttl / 0.08) * 0.9;
    }
    while (this.tracers.length && this.tracers[0].ttl <= 0) {
      const t = this.tracers.shift();
      this.scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
    }
  }

  update(dt, game) {
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    }
    this.updateTracers(dt);
    if (this.inCar && this.car) {
      this.x = this.car.x;
      this.z = this.car.z;
      this.speed = Math.abs(this.car.speed);
      this.syncBody();
    }
  }
}
