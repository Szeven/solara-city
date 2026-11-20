// Screenshot scenes. ?shot=title|drive|mission|wanted puts the game
// into a fixed, readable state for its screenshot: the title screen over
// the city, driving downtown at dusk, a mission in progress with its
// beacon, or a three-star police chase. Shot mode disables pointer lock
// and drives the camera from a fixed angle so every shot is repeatable.

export const SHOT_NAMES = ['title', 'drive', 'mission', 'wanted'];

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const s = q.get('shot');
  return SHOT_NAMES.includes(s) ? s : null;
}

// Each setup receives the game object (player, traffic, police,
// missions, camera rig) and arranges the scene. Returns the camera
// mode to use: 'orbit' (slow cinematic orbit) or 'chase' (behind car).
// hideHint hides the control hint bar so it never overlaps a screenshot.
export function setupShot(name, game) {
  const { player, traffic, police, missions } = game;
  if (name === 'title') {
    // Player on foot on the marina plaza, city behind, title overlay up.
    player.reset(190, 190);
    player.heading = Math.PI * 0.75;
    return { mode: 'orbit', target: { x: 120, z: 120 }, dist: 90, height: 42, yaw: 0.6, hideHint: true };
  }
  if (name === 'drive') {
    // Put the player in a traffic car on Ocean Drive at dusk light.
    const car = traffic.nearest(0, -25, 500) || traffic.cars[0];
    player.inCar = car;
    car.parked = false;
    car.speed = 16;
    player.pos.copy(car.pos);
    player.mesh.visible = false;
    return { mode: 'chase', target: null, hideHint: true };
  }
  if (name === 'mission') {
    // First job active: the player on foot at the pier warehouse with
    // the beacon pillar marking the pickup.
    missions.start('pickup');
    player.reset(-228, -30);
    player.heading = Math.PI;
    return { mode: 'orbit', target: { x: -228, z: -40 }, dist: 42, height: 26, yaw: 2.4, hideHint: true };
  }
  if (name === 'wanted') {
    // Three stars, police cars closing in, player driving away.
    const car = traffic.nearest(25, 25, 500) || traffic.cars[0];
    player.inCar = car;
    car.parked = false;
    car.speed = 22;
    player.pos.copy(car.pos);
    player.mesh.visible = false;
    police.setStars(3);
    return { mode: 'chase', target: null, hideHint: true };
  }
  return { mode: 'chase', target: null, hideHint: true };
}
