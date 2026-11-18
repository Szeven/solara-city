// Solara City — every number that tunes the game, in one file.
// The city is a 9-by-9 grid of blocks on the coast. Roads are 14 m wide and blocks
// 36 m, so block centres sit 50 m apart; intersections run from -225 to +225 on
// both axes. West of the first road is a beach strip, then the ocean.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solara-city.save.v1';

export const CITY = {
  blocks: 9,
  block: 36,
  road: 14,
  half: 225,
  beachX: -239,
  oceanX: -260,
};

export const PLAYER = {
  radius: 0.55,
  height: 1.8,
  walk: 5.2,
  run: 9.0,
  health: 100,
  ammo: 12,
  reload: 1.4,
  enterRange: 3.2,
  touchRange: 3.0,
};

export const CAR = {
  accel: 16,
  brake: 30,
  reverse: 9,
  top: 34,
  topReverse: 9,
  steer: 1.9,
  grip: 6.5,
  length: 4.4,
  width: 2.0,
  health: 100,
  hitDamage: 34,
};

export const TRAFFIC = { count: 14, speed: 9, gap: 9, despawn: 260, spawn: 200 };
export const PEDS = { count: 26, walk: 1.6, flee: 4.2, despawn: 220 };

export const WANTED = {
  max: 5,
  steal: 1,
  runOver: 1,
  shootPed: 2,
  shootCop: 2,
  smashCopCar: 1,
  coolSeconds: 22,
  maxCars: 5,
  copTop: 26,
  bustRange: 3.2,
  bustTime: 1.6,
  officerSpeed: 5.6,
  officerHealth: 2,
};

export const MISSIONS = [
  {
    id: 'm1',
    name: 'The First Pickup',
    reward: 500,
    brief: 'The Duchess runs Club Mirage, and she needs a courier who does not ask questions. Pick up the package at the docks and bring it to her club.',
    objectives: [
      { type: 'goto', at: 'docks', text: 'Get to the docks pickup' },
      { type: 'interact', at: 'docks', text: 'Pick up the package (E)' },
      { type: 'goto', at: 'club', text: 'Deliver it to The Duchess at Club Mirage' },
    ],
  },
  {
    id: 'm2',
    name: 'Hot Wheels',
    reward: 900,
    brief: 'A Comet GT sits at the marina with the keys in it and its owner losing money at the casino. Bring it to the garage — quietly, if you can.',
    objectives: [
      { type: 'goto', at: 'marina', text: 'Find the Comet GT at the marina' },
      { type: 'steal', at: 'marina', text: 'Take the Comet GT (E)' },
      { type: 'goto', at: 'garage', text: 'Deliver the Comet GT to the garage' },
    ],
  },
  {
    id: 'm3',
    name: 'Breaker Down',
    reward: 1400,
    brief: 'The Breakers grabbed a Duchess shipment. Their courier is crossing the causeway. Stop the car, take the briefcase, bring it home.',
    objectives: [
      { type: 'goto', at: 'causeway', text: 'Reach the causeway ambush' },
      { type: 'shoot', at: 'causeway', text: 'Stop the Breaker courier car' },
      { type: 'interact', at: 'causeway', text: 'Grab the briefcase (E)' },
      { type: 'goto', at: 'club', text: 'Take the briefcase to The Duchess' },
    ],
  },
  {
    id: 'm4',
    name: 'Payday',
    reward: 2500,
    brief: 'One last job: the bank drop is at the plaza. Grab the money bag and get to the safehouse. The whole city will be watching.',
    objectives: [
      { type: 'goto', at: 'plaza', text: 'Reach the bank drop at the plaza' },
      { type: 'interact', at: 'plaza', text: 'Grab the money bag (E)' },
      { type: 'goto', at: 'safehouse', text: 'Escape to the safehouse' },
    ],
  },
];

// Named places, in world metres: x east, z south, y is the ground.
// Every place sits on a road intersection, so a mission marker and its
// beacon stand in the open (reachable and visible) and the special cars
// that spawn beside them start on tarmac, not inside a block.
export const PLACES = {
  docks: { x: -175, z: 175, label: 'Docks' },
  club: { x: 125, z: -125, label: 'Club Mirage' },
  marina: { x: -175, z: -175, label: 'Marina' },
  garage: { x: 175, z: 125, label: 'Garage' },
  causeway: { x: -25, z: -175, label: 'Causeway' },
  plaza: { x: 25, z: 25, label: 'Plaza' },
  safehouse: { x: -125, z: 125, label: 'Safehouse' },
  hospital: { x: 75, z: -125, label: 'Hospital' },
};

export const PALETTE = {
  sky: 0x87bfe8,
  fog: 0x9fc8e8,
  sun: 0xfff2d0,
  hemiSky: 0xbfd9ff,
  hemiGround: 0xc9a06a,
  ocean: 0x2a7fa8,
  sand: 0xe8d29a,
  asphalt: 0x3a3f46,
  sidewalk: 0x9aa0a8,
  grass: 0x5da24a,
  building: ['#e8b4b8', '#a8d8c8', '#f2d38a', '#b8c8e8', '#e8a87c', '#d8b8e8'],
  glass: ['#5a7a9a', '#3a5a7a', '#6a8aa8'],
  car: [0xd84a4a, 0x3a7ad8, 0xe8c832, 0x4ad87a, 0xe8e8e8, 0x2a2a2e, 0xd87a2a, 0x8a4ad8],
  taxi: 0xe8c832,
  cop: 0x2a4ad8,
  copWhite: 0xf2f2f2,
  player: 0x2a9ad8,
  playerPants: 0x2a2a3a,
  skin: 0xd8a878,
  pedShirt: [0xd84a6a, 0x4ad8a8, 0xe8e8e8, 0x7a5ad8, 0x2a8a5a, 0xd8a03a],
  marker: 0xffd23a,
  markerRing: 0xff6a3a,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const TITLE = 'SOLARA CITY';
export const TAGLINE = 'A sun-soaked open-world crime story';
