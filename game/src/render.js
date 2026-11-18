// Rendering: the three.js scene, the sun and its shadows, the third-person camera,
// the mission beacon, muzzle flashes and tracers, and the 2D minimap drawn from
// the city's own road data.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

export function createRenderer(canvas, minimapCanvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 0.9);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 900);

  // Mission beacon: a light pillar, a floating diamond and a ring over the target.
  const beacon = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: PALETTE.marker, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  pillar.position.y = 30;
  beacon.add(pillar);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: PALETTE.marker }),
  );
  diamond.position.y = 7;
  beacon.add(diamond);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.markerRing, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);

  const flash = new THREE.PointLight(0xffd23a, 0, 18);
  scene.add(flash);
  let tracer = null;

  const mapCtx = minimapCanvas.getContext('2d');
  const MAP = { size: 180, range: 500 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function drawMinimap(world) {
    const s = MAP.size;
    const range = MAP.range;
    const toMap = (x, z) => [s / 2 + (x / range) * s, s / 2 + (z / range) * s];
    mapCtx.clearRect(0, 0, s, s);
    mapCtx.fillStyle = '#0e1a24';
    mapCtx.fillRect(0, 0, s, s);
    // Ocean on the west edge.
    mapCtx.fillStyle = '#2a7fa8';
    mapCtx.fillRect(0, 0, ((CITY.oceanX + range / 2) / range) * s, s);
    // City blocks.
    mapCtx.fillStyle = '#3a3f46';
    for (let ix = 0; ix < CITY.blocks; ix++) {
      for (let iz = 0; iz < CITY.blocks; iz++) {
        const bx = -CITY.half + CITY.road + ix * 50;
        const bz = -CITY.half + CITY.road + iz * 50;
        const [px, py] = toMap(bx, bz);
        mapCtx.fillRect(px, py, (CITY.block / range) * s, (CITY.block / range) * s);
      }
    }
    // Roads.
    mapCtx.strokeStyle = 'rgba(255,255,255,0.16)';
    mapCtx.lineWidth = 1;
    for (let i = 0; i <= CITY.blocks; i++) {
      const c = -CITY.half + i * 50;
      const [x1, y1] = toMap(c, -range / 2);
      const [x2, y2] = toMap(c, range / 2);
      mapCtx.beginPath();
      mapCtx.moveTo(x1, y1);
      mapCtx.lineTo(x2, y2);
      mapCtx.stroke();
      const [x3, y3] = toMap(-range / 2, c);
      const [x4, y4] = toMap(range / 2, c);
      mapCtx.beginPath();
      mapCtx.moveTo(x3, y3);
      mapCtx.lineTo(x4, y4);
      mapCtx.stroke();
    }
    const dot = (x, z, r, color) => {
      const [px, py] = toMap(x, z);
      mapCtx.fillStyle = color;
      mapCtx.beginPath();
      mapCtx.arc(px, py, r, 0, Math.PI * 2);
      mapCtx.fill();
    };
    if (world.marker) {
      const pulse = 4 + Math.sin(performance.now() / 200) * 2;
      dot(world.marker.x, world.marker.z, pulse, '#ffd23a');
    }
    for (const c of world.police.cars) if (!c.dead) dot(c.x, c.z, 3, '#ff4040');
    for (const c of world.cars) if (c.isTraffic && !c.dead) dot(c.x, c.z, 1.6, 'rgba(255,255,255,0.7)');
    // Player arrow, pointing the way he faces.
    const [px, py] = toMap(world.player.x, world.player.z);
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(world.player.heading);
    mapCtx.fillStyle = '#2a9ad8';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6);
    mapCtx.lineTo(4.5, 5);
    mapCtx.lineTo(-4.5, 5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  let camYaw = 0;
  let camPitch = 0.32;

  function update(dt, world, input) {
    const player = world.player;
    const orbit = input.takeOrbit();
    camYaw -= orbit.dx * 0.005;
    camPitch = Math.max(0.08, Math.min(1.1, camPitch + orbit.dy * 0.003));
    player.camYaw = camYaw;
    player.camPitch = camPitch;
    // In a car the camera eases back behind the car unless the player is dragging.
    if (player.inCar && player.car && Math.abs(orbit.dx) < 1) {
      const target = player.car.heading + Math.PI;
      let d = target - camYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      camYaw += d * Math.min(1, 1.6 * dt);
    }
    const dist = player.inCar ? 10.5 : 7.5;
    const height = player.inCar ? 4.2 : 3.4;
    const cx = player.x + Math.sin(camYaw) * dist * Math.cos(camPitch);
    const cz = player.z + Math.cos(camYaw) * dist * Math.cos(camPitch);
    const cy = height + Math.sin(camPitch) * dist * 0.5;
    camera.position.set(cx, cy, cz);
    camera.lookAt(player.x, 1.7, player.z);
    // The sun's shadow box follows the player.
    sun.position.set(player.x + 90, 140, player.z + 60);
    sun.target.position.set(player.x, 0, player.z);
    // Beacon over the mission target.
    if (world.marker) {
      beacon.visible = true;
      beacon.position.set(world.marker.x, 0, world.marker.z);
      diamond.rotation.y += dt * 2;
      diamond.position.y = 7 + Math.sin(performance.now() / 300) * 0.8;
      const s = 1 + Math.sin(performance.now() / 250) * 0.12;
      ring.scale.set(s, s, 1);
    } else {
      beacon.visible = false;
    }
    // Tracer fades out.
    if (tracer) {
      tracer.material.opacity -= dt * 6;
      if (tracer.material.opacity <= 0) {
        scene.remove(tracer);
        tracer = null;
      }
    }
    drawMinimap(world);
    renderer.render(scene, camera);
  }

  function muzzle(from, to) {
    flash.position.copy(from);
    flash.intensity = 60;
    window.setTimeout(() => {
      flash.intensity = 0;
    }, 60);
    if (tracer) scene.remove(tracer);
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    scene.add(tracer);
  }

  return {
    scene,
    camera,
    renderer,
    update,
    muzzle,
    setCam(yaw, pitch) {
      camYaw = yaw;
      camPitch = pitch;
    },
  };
}
