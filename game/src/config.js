// Solara City — tuning, city layout, missions, places.
// Everything the other modules agree on lives here.
export const CITY = {
  pitch: 50, // metres between road centrelines, one block apart
  roadWidth: 14,
  blockSize: 36,
  roads: [-225, -175, -125, -75, -25, 25, 75, 125, 175, 225],
  blocks: [-200, -150, -100, -50, 0, 50, 100, 150, 200],
  oceanX: -232, // the water starts just west of the last road
  bounds: 250, // playfield half-extent; the ocean covers x < oceanX
};

export const PLAYER = {
  walkSpeed: 5.2,
  runSpeed: 9.0,
  radius: 0.55,
  health: 100,
  eyeHeight: 1.62,
};

export const CAR = {
  accel: 16,
  brake: 30,
  reverseAccel: 10,
  maxForward: 34, // ~122 km/h
  maxReverse: 10,
  steerMax: 0.55,
  grip: 6.5,
  radius: 1.6,
};

export const TRAFFIC = {
  count: 16,
  cruiseMin: 7,
  cruiseMax: 12,
  parked: 10,
};

export const PEDS = {
  count: 26,
  walkMin: 1.0,
  walkMax: 1.9,
  fleeRadius: 18,
};

export const WANTED = {
  maxStars: 5,
  coolSeconds: 22, // quiet time before heat starts falling
  decayPerSecond: 0.25,
  stealHeat: 1.0,
  shootHeat: 0.6,
  killHeat: 1.0,
  ramHeat: 0.3,
  copKillHeat: 2.0,
  bustSeconds: 2.0, // an officer this close for this long busts you
  cruiserPerStar: 1,
  officerPerStar: 1,
};

export const COMBAT = {
  pistolAmmo: 12,
  pistolReserve: 48,
  pistolRange: 90,
  pistolDamage: 34,
  reloadSeconds: 1.4,
  fireInterval: 0.22,
};

// The Duchess's jobs. Each step is a goto marker, a pickup, a car to
// steal and deliver, or an escape. Positions sit on road centrelines.
export const MISSIONS = [
  {
    id: 1,
    name: 'The First Pickup',
    pay: 500,
    brief: 'A package is waiting at the Docks. Pick it up and bring it to the Marina. No questions.',
    steps: [
      { type: 'goto', label: 'Go to the Docks', pos: [-225, 150] },
      { type: 'pickup', label: 'Pick up the package', pos: [-225, 150], radius: 4 },
      { type: 'goto', label: 'Deliver to the Marina', pos: [-150, 225] },
    ],
  },
  {
    id: 2,
    name: 'Hot Wheels',
    pay: 900,
    brief: 'A Comet GT is parked by the Bank. Take it — quietly — and bring it to the Garage.',
    steps: [
      { type: 'steal', label: 'Steal the Comet GT', pos: [25, -25], car: 'comet' },
      { type: 'goto', label: 'Deliver it to the Garage', pos: [200, -125], inCar: true },
    ],
  },
  {
    id: 3,
    name: 'Breaker Down',
    pay: 1400,
    brief: 'A van broke down by the North Gate. Get it running and drive it back to the Garage.',
    steps: [
      { type: 'goto', label: 'Reach the broken van', pos: [75, -225] },
      { type: 'wait', label: 'Fix the van (stay close)', pos: [75, -225], seconds: 5 },
      { type: 'goto', label: 'Drive the van to the Garage', pos: [200, -125], inCar: true },
    ],
  },
  {
    id: 4,
    name: 'Payday',
    pay: 2500,
    brief: 'The Bank case. Grab it and get to the Safehouse. The whole city will be looking.',
    steps: [
      { type: 'pickup', label: 'Grab the case at the Bank', pos: [0, 25], radius: 4, heat: 3 },
      { type: 'goto', label: 'Escape to the Safehouse', pos: [100, -225] },
    ],
  },
];

export const PLACES = {
  docks: { name: 'Docks', pos: [-225, 150] },
  marina: { name: 'Marina', pos: [-150, 225] },
  bank: { name: 'Solara Bank', pos: [0, 25] },
  garage: { name: 'Garage', pos: [200, -125] },
  safehouse: { name: 'Safehouse', pos: [100, -225] },
  northGate: { name: 'North Gate', pos: [75, -225] },
  plaza: { name: 'Central Plaza', pos: [0, 0] },
  beach: { name: 'West Beach', pos: [-225, 0] },
};

export const CAR_MODELS = {
  sedan: { name: 'Sedano', top: 30, accel: 15, color: 0x3a6ea5 },
  hatch: { name: 'Pip', top: 26, accel: 17, color: 0xc2a23d },
  comet: { name: 'Comet GT', top: 38, accel: 20, color: 0xc0392b },
  van: { name: 'Mule Van', top: 24, accel: 12, color: 0x7f8c8d },
  taxi: { name: 'Cab', top: 28, accel: 15, color: 0xf1c40f },
  cruiser: { name: 'SCPD Cruiser', top: 36, accel: 19, color: 0x1b2a4a },
};

export const COLORS = {
  sky: 0x87bfe8,
  sun: 0xfff2cf,
  ocean: 0x1e6f8e,
  sand: 0xe8d9a8,
  grass: 0x6fae5a,
  asphalt: 0x33363b,
  sidewalk: 0x9a9a92,
  buildingGlass: 0x2c4a63,
};
