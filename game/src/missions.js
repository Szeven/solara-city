// Missions: four jobs for The Duchess, each a chain of steps with a beacon
// and a minimap marker. Completing a job pays its reward.

import * as THREE from 'three';
import { MISSIONS, PLACES, WEAPON } from './config.js';
import { spawnParkedCar } from './vehicles.js';
import { createPedMesh } from './people.js';

function makeBeacon(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd34d,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 60, 12, 1, true), mat);
  pillar.position.y = 30;
  group.add(pillar);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd34d,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.2, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  group.add(ring);
  group.visible = false;
  scene.add(group);
  return group;
}

export function createMissions(scene, rng) {
  const beacon = makeBeacon(scene);
  const state = {
    scene,
    rng,
    beacon,
    done: [],
    active: null, // { def, step }
    missionCar: null,
    breakers: [],
    banner: '',
  };

  function targetPos() {
    if (!state.active) return null;
    const step = state.active.def.steps[state.active.step];
    const place = PLACES[step.place];
    return place ? { x: place.x, z: place.z } : null;
  }

  function setStep(i) {
    state.active.step = i;
    const step = state.active.def.steps[i];
    const place = PLACES[step.place];
    if (place) {
      beacon.position.set(place.x, 0, place.z);
      beacon.visible = true;
    }
    state.banner = step.text;
    // Step setup: spawn what the step needs.
    if (step.kind === 'steal' && !state.missionCar) {
      state.missionCar = spawnParkedCar(scene, PLACES.marina.x + 6, PLACES.marina.z - 4, Math.PI / 2, 0xe0a92e);
      state.missionCar.kind = 'mission';
    }
    if (step.kind === 'clear' && state.breakers.length === 0) {
      for (let i = 0; i < 3; i++) {
        const mesh = createPedMesh(0x8a2f23);
        const x = PLACES.causeway.x + (i - 1) * 6;
        const z = PLACES.causeway.z + (i % 2 ? 5 : -5);
        mesh.position.set(x, 0, z);
        scene.add(mesh);
        state.breakers.push({
          mesh,
          pos: new THREE.Vector3(x, 0, z),
          health: WEAPON.damage * 2,
          heading: 0,
          radius: 0.7,
          kind: 'breaker',
          ref: null,
        });
      }
    }
  }

  return {
    get done() {
      return state.done;
    },
    get active() {
      return state.active;
    },

    start(index) {
      const def = MISSIONS[index];
      if (!def || state.done.includes(def.id)) return false;
      state.active = { def, step: 0 };
      setStep(0);
      return true;
    },

    currentInfo() {
      if (!state.active) return null;
      const step = state.active.def.steps[state.active.step];
      return {
        name: state.active.def.name,
        text: state.banner,
        target: targetPos(),
        stepKind: step.kind,
        reward: state.active.def.reward,
      };
    },

    // One frame. ctx: { playerPos, playerCar, pressedE, enteredCar, hits, dt }.
    // Returns events: {type:'step'|'complete', ...}.
    update(dt, ctx) {
      const events = [];
      if (!state.active) return events;
      const def = state.active.def;
      const step = def.steps[state.active.step];
      const place = PLACES[step.place];
      const px = ctx.playerPos.x;
      const pz = ctx.playerPos.z;
      const dist = place ? Math.hypot(px - place.x, pz - place.z) : Infinity;

      const advance = () => {
        if (state.active.step + 1 < def.steps.length) {
          setStep(state.active.step + 1);
          events.push({ type: 'step', text: state.banner });
        } else {
          const reward = def.reward;
          state.done.push(def.id);
          state.active = null;
          beacon.visible = false;
          events.push({ type: 'complete', mission: def, reward });
        }
      };

      if (step.kind === 'goto' && dist < 7) advance();
      else if ((step.kind === 'pickup' || step.kind === 'deliver') && dist < 5 && ctx.pressedE) advance();
      else if (step.kind === 'steal' && ctx.enteredCar === state.missionCar) advance();
      else if (step.kind === 'clear') {
        // Breakers chase and punch the player; bullets drop them.
        for (let i = state.breakers.length - 1; i >= 0; i--) {
          const b = state.breakers[i];
          const dx = px - b.pos.x;
          const dz = pz - b.pos.z;
          const d = Math.hypot(dx, dz);
          b.heading = Math.atan2(dx, dz);
          if (d > 1.6) {
            b.pos.x += Math.sin(b.heading) * 5.2 * dt;
            b.pos.z += Math.cos(b.heading) * 5.2 * dt;
          }
          b.mesh.position.set(b.pos.x, 0, b.pos.z);
          b.mesh.rotation.y = b.heading;
          if (d < 1.6) ctx.onTouch?.(b, dt);
        }
        for (const hit of ctx.hits || []) {
          if (hit.kind !== 'breaker') continue;
          const b = state.breakers.find((x) => x === hit.ref);
          if (!b) continue;
          b.health -= WEAPON.damage;
          if (b.health <= 0) {
            scene.remove(b.mesh);
            state.breakers.splice(state.breakers.indexOf(b), 1);
          }
        }
        if (state.breakers.length === 0) advance();
      } else if (step.kind === 'escape' && dist < 7 && ctx.wantedStars === 0) advance();

      return events;
    },

    // The mission car and breakers, for shooting and minimap lists.
    shootables() {
      return state.breakers.map((b) => ({
        pos: b.pos,
        radius: b.radius,
        kind: 'breaker',
        ref: b,
      }));
    },

    abandon() {
      if (state.missionCar) {
        state.scene.remove(state.missionCar.mesh);
        state.missionCar = null;
      }
      for (const b of state.breakers) state.scene.remove(b.mesh);
      state.breakers = [];
      state.active = null;
      beacon.visible = false;
    },
  };
}
