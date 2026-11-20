// Solara City — renderer, sun, sky, and the third-person chase camera.
import * as THREE from 'three';
import { clamp } from './random.js';

export function setupRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function setupLights(scene) {
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x9fc8e8, 180, 520);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2cf, 2.2);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  return sun;
}

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 7;
    this.height = 3.2;
    this.smooth = new THREE.Vector3(0, 3, 8);
  }

  update(dt, game) {
    const p = game.player;
    let dist = 7;
    let height = 3.2;
    let lookY = 1.6;
    if (p.inCar && p.car) {
      dist = 10;
      height = 4.2;
      lookY = 1.4;
    }
    // Camera sits behind the player's view direction.
    const yaw = p.yaw;
    const pitch = clamp(p.pitch, -0.5, 0.6);
    const backX = Math.sin(yaw) * Math.cos(pitch);
    const backZ = Math.cos(yaw) * Math.cos(pitch);
    const target = new THREE.Vector3(
      p.x + backX * dist,
      lookY + height * (0.5 + pitch),
      p.z + backZ * dist
    );
    // Keep the camera out of buildings: clamp its height above ground.
    const k = 1 - Math.min(1, dt * 8);
    this.smooth.lerp(target, 1 - k);
    this.camera.position.copy(this.smooth);
    const look = new THREE.Vector3(
      p.x - Math.sin(yaw) * 4,
      lookY + Math.sin(pitch) * 4,
      p.z - Math.cos(yaw) * 4
    );
    this.camera.lookAt(look);
  }

  // Snap the camera for a screenshot staging.
  snap(game) {
    const p = game.player;
    const yaw = p.yaw;
    const dist = p.inCar ? 10 : 7;
    this.smooth.set(
      p.x + Math.sin(yaw) * dist,
      1.6 + 3.2,
      p.z + Math.cos(yaw) * dist
    );
    this.camera.position.copy(this.smooth);
  }
}
