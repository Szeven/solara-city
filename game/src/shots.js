// Solara City — screenshot staging: deterministic scenes for the four
// screenshots, driven by ?shot=<name> in the page URL.
import { buildCarMesh, Car } from './vehicles.js';

function putPlayerInCar(game, model, x, z, heading, speed) {
  const car = new Car(buildCarMesh(model, model === 'comet' ? 0xc0392b : 0x3a6ea5), model, x, z, heading);
  car.isPlayer = true;
  car.speed = speed;
  game.traffic.cars.push(car);
  game.scene.add(car.mesh);
  const p = game.player;
  p.inCar = true;
  p.car = car;
  p.x = x;
  p.z = z;
  // Player faces the way the car points: view forward is -yaw.
  p.yaw = Math.atan2(-Math.sin(heading), -Math.cos(heading));
  p.pitch = 0;
  return car;
}

function addCruiser(game, x, z, heading) {
  const car = new Car(buildCarMesh('cruiser', 0x1b2a4a), 'cruiser', x, z, heading);
  car.isPolice = true;
  game.police.cruisers.push(car);
  game.scene.add(car.mesh);
  return car;
}

export function applyShot(game, name) {
  const p = game.player;
  game.state = 'playing';
  game.hud.hideAll();
  if (name === 'cover') {
    // Getaway downtown: the player in a Comet GT, 3 stars, a cruiser
    // ahead-left in frame, the Docks job beacon glowing in the distance.
    putPlayerInCar(game, 'comet', 25, 60, Math.PI, 3);
    addCruiser(game, 21, 46, Math.PI);
    game.cruiseSpeed = 3;
    game.setHeat(3);
    game.missions.start(1, game);
  } else if (name === 'street') {
    // On foot downtown, standing on the x=25 road looking north down
    // the street: traffic ahead, buildings on both sides.
    p.x = 25;
    p.z = 75;
    p.yaw = 0;
    p.pitch = 0.05;
    p.inCar = false;
    game.setHeat(0);
  } else if (name === 'mission') {
    // The First Pickup at the Docks: standing on the sidewalk at the
    // block's west edge, facing the beacon pillar over the package
    // on the road, ocean behind it.
    game.missions.start(1, game);
    p.x = -215;
    p.z = 150;
    // Face west toward the beacon: view forward is (-sin yaw, -cos yaw).
    p.yaw = Math.PI / 2;
    p.pitch = 0.05;
    p.inCar = false;
    game.setHeat(0);
  } else if (name === 'chase') {
    // Five stars, flat out in the Comet GT with two cruisers on the tail.
    putPlayerInCar(game, 'comet', 75, 150, Math.PI, 9);
    addCruiser(game, 71, 168, Math.PI);
    addCruiser(game, 79, 174, Math.PI);
    game.cruiseSpeed = 9;
    game.setHeat(5);
  }
  p.syncBody();
  game.cameraRig.snap(game);
  game.hud.update(game);
  window.__shotReady = true;
}
