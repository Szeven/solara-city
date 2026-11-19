// Renderer, scene, camera and sun: the look of Solara City — a warm
// late-afternoon light over a sun-soaked coastal city.

import * as THREE from 'three';
import { COLORS } from './config.js';

export function setupWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 260, 780);

  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    1400,
  );
  camera.position.set(0, 30, 60);

  const sun = new THREE.DirectionalLight(COLORS.sun, 2.6);
  sun.position.set(180, 260, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -280;
  sun.shadow.camera.right = 280;
  sun.shadow.camera.top = 280;
  sun.shadow.camera.bottom = -280;
  sun.shadow.camera.far = 800;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xbfd8ee, 0x5a6b46, 0.9);
  scene.add(hemi);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  return {
    renderer,
    scene,
    camera,
    sun,
    dispose() {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    },
  };
}

// Third-person chase camera: eases behind the target, looks slightly ahead.
export function chaseCamera(camera, targetPos, heading, dt, state) {
  const dist = state.inCar ? 11 : 8;
  const height = state.inCar ? 4.2 : 3.4;
  const back = {
    x: targetPos.x - Math.sin(heading) * dist,
    z: targetPos.z - Math.cos(heading) * dist,
  };
  const k = 1 - Math.exp(-dt * 4.5);
  camera.position.x += (back.x - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (back.z - camera.position.z) * k;
  const look = {
    x: targetPos.x + Math.sin(heading) * 6,
    y: targetPos.y + 1.4,
    z: targetPos.z + Math.cos(heading) * 6,
  };
  camera.lookAt(look.x, look.y, look.z);
}
