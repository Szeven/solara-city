// localStorage save for Solara City: cash, mission progress, health and
// position. Nothing leaves the browser.
const SAVE_KEY = 'solara-city-save-v1';
export const SAVE_VERSION = 1;

export function hasSave() {
  return loadSave() !== null;
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function saveGame(state) {
  try {
    const data = {
      version: SAVE_VERSION,
      cash: Math.floor(state.cash),
      missionIndex: state.missionIndex,
      missionsDone: state.missionsDone,
      health: Math.round(state.health),
      x: Math.round(state.x * 10) / 10,
      z: Math.round(state.z * 10) / 10,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // Storage may be unavailable; the game plays on regardless.
  }
}
