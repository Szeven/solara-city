// Hitscan pistol for Solara City: 12 rounds, reload, visible tracers.
// The raycast runs against pedestrians, police cars and buildings.
import * as THREE from 'three';

export class Pistol {
  constructor(scene) {
    this.scene = scene;
    this.ammo = 12;
    this.magSize = 12;
    this.reloadT = 0;
    this.reloading = false;
    this.raycaster = new THREE.Raycaster();
    this.tracers = [];
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 });
    this.shotsFired = 0;
  }

  startReload() {
    if (this.reloading || this.ammo === this.magSize) return;
    this.reloading = true;
    this.reloadT = 1.2;
  }

  update(dt) {
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloading = false;
        this.ammo = this.magSize;
      }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.9;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  // Fire from the camera through the screen centre. Returns the hit point.
  fire(camera, targets) {
    if (this.reloading || this.ammo <= 0) {
      if (this.ammo <= 0) this.startReload();
      return null;
    }
    this.ammo -= 1;
    this.shotsFired += 1;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    this.raycaster.far = 120;
    // A touch of spread: the ray wanders a fraction of a degree.
    const spread = 0.004;
    this.raycaster.ray.direction.x += (Math.random() - 0.5) * spread;
    this.raycaster.ray.direction.y += (Math.random() - 0.5) * spread;
    this.raycaster.ray.direction.normalize();
    const hits = this.raycaster.intersectObjects(targets, true);
    let end;
    let hitObject = null;
    if (hits.length > 0) {
      end = hits[0].point.clone();
      hitObject = hits[0].object;
    } else {
      end = this.raycaster.ray.origin.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(120));
    }
    const start = camera.position.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(1.2));
    start.y -= 0.25;
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geo, this.tracerMat.clone());
    this.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
    return { point: end, object: hitObject };
  }
}
