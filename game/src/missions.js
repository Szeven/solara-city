// Missions and story: four jobs for The Duchess, each a chain of objectives with
// a marker in the world and on the minimap. This module is pure logic — the world
// supplies the hooks (spawn a car, pay cash, announce a line, add wanted stars).

import { MISSIONS, PLACES } from './config.js';

export function createMissions(hooks) {
  const state = {
    index: -1, // -1 is free roam, otherwise MISSIONS[index]
    obj: 0,
    done: [],
    failed: false,
    packageAt: null,
    briefcaseAt: null,
    comet: null,
    courier: null,
  };

  function def() {
    return state.index >= 0 ? MISSIONS[state.index] : null;
  }

  function objective() {
    const d = def();
    return d ? d.objectives[state.obj] : null;
  }

  function markerPos() {
    const o = objective();
    if (!o) return null;
    if (o.type === 'shoot' && state.courier) return { x: state.courier.x, z: state.courier.z, label: 'Breaker courier' };
    if (o.type === 'interact' && state.briefcaseAt) return { ...state.briefcaseAt, label: 'Briefcase' };
    if (o.type === 'interact' && state.packageAt) return { ...state.packageAt, label: 'Package' };
    const p = PLACES[o.at];
    return p ? { x: p.x, z: p.z, label: p.label } : null;
  }

  function start(index) {
    state.index = index;
    state.obj = 0;
    state.failed = false;
    state.packageAt = null;
    state.briefcaseAt = null;
    state.comet = null;
    state.courier = null;
    const d = def();
    hooks.announce(`${d.name} — ${d.brief}`);
    if (d.id === 'm2') state.comet = hooks.spawnSpecialCar('sport', PLACES.marina.x + 6, PLACES.marina.z, 0.4, 0xe8c832);
    if (d.id === 'm3') state.courier = hooks.spawnSpecialCar('courier', PLACES.causeway.x, PLACES.causeway.z, 0, 0x8a1a1a);
  }

  function advance(message) {
    const d = def();
    state.obj += 1;
    if (message) hooks.announce(message);
    if (state.obj >= d.objectives.length) {
      hooks.addCash(d.reward);
      hooks.jingle();
      state.done.push(d.id);
      hooks.announce(`Job done — $${d.reward} in the bag.`);
      const next = state.index + 1;
      state.index = -1;
      state.obj = 0;
      return { event: 'complete', mission: d, next: next < MISSIONS.length ? next : null };
    }
    return { event: 'objective' };
  }

  function fail(reason) {
    state.failed = true;
    const d = def();
    hooks.announce(reason);
    state.index = -1;
    state.obj = 0;
    return { event: 'failed', mission: d };
  }

  /** Distance-driven objectives and per-frame mission logic. */
  function update(px, pz, player) {
    const o = objective();
    if (!o) return null;
    const m = markerPos();
    if (!m) return null;
    const d = Math.hypot(m.x - px, m.z - pz);
    if (o.type === 'goto' && d < 7) return advance('Objective complete.');
    if (o.type === 'shoot' && state.courier && state.courier.dead) {
      state.briefcaseAt = { x: state.courier.x, z: state.courier.z };
      return advance('Courier stopped. Grab the briefcase.');
    }
    return null;
  }

  /** The player pressed E near the marker. */
  function interact(px, pz) {
    const o = objective();
    if (!o || o.type !== 'interact') return null;
    const m = markerPos();
    if (!m || Math.hypot(m.x - px, m.z - pz) > 4) return null;
    const d = def();
    if (d.id === 'm1' && state.obj === 1) {
      state.packageAt = null;
      return advance('Package picked up. Take it to Club Mirage.');
    }
    if (d.id === 'm3' && state.obj === 2) {
      state.briefcaseAt = null;
      return advance('Briefcase secured. Bring it to The Duchess.');
    }
    if (d.id === 'm4' && state.obj === 1) {
      hooks.police.addStars(4);
      return advance('Money bag grabbed — the whole city is coming. Run!');
    }
    return null;
  }

  /** The player got into a car: the steal objective, and the Comet GT handover. */
  function carEntered(car) {
    const o = objective();
    if (!o) return null;
    if (o.type === 'steal' && car === state.comet) {
      hooks.police.addStars(1);
      return advance('The Comet GT is yours. Lose the heat and deliver it.');
    }
    return null;
  }

  /** A special car was destroyed: the courier in mission 3. */
  function carDestroyed(car) {
    if (state.courier && car === state.courier) return update(0, 0, null);
    return null;
  }

  function interactPrompt(px, pz) {
    const o = objective();
    if (!o || o.type !== 'interact') return null;
    const m = markerPos();
    if (!m || Math.hypot(m.x - px, m.z - pz) > 4) return null;
    return 'Press E';
  }

  return {
    state,
    start,
    def,
    objective,
    markerPos,
    update,
    interact,
    carEntered,
    carDestroyed,
    interactPrompt,
    advance,
    fail,
    isDone(id) {
      return state.done.includes(id);
    },
    completedCount() {
      return state.done.length;
    },
  };
}
