// Solara City tuning and world constants. One source of truth for the
// geometry every other module builds on: a 9x9 coastal city, ocean to the
// west, roads on a 50 m pitch with 14 m of asphalt and 36 m blocks.

export const CITY = {
  half: 250, // city spans x,z in [-250, 250]
  blocks: 9, // 9 blocks a side
  pitch: 50, // block centre to block centre
  block: 36, // block size
  roadWidth: 14,
  // Road centre lines (both axes). Note: NOT multiples of 50 — the grid
  // sits at +/-25, +/-75, +/-125, +/-175, +/-225.
  roads: [-225, -175, -125, -75, -25, 25, 75, 125, 175, 225],
  oceanX: -250, // water begins west of here
  beachX: -250, // sand strip along the shore
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10,
  radius: 0.6,
  height: 1.8,
  maxHealth: 100,
  pistolAmmo: 12,
  pistolReserve: 120,
};

export const CAR = {
  accel: 14,
  brake: 30,
  reverseAccel: 8,
  maxSpeed: 38,
  maxReverse: 10,
  steer: 1.9,
  grip: 6.5,
  handbrakeGrip: 2.2,
};

export const WANTED = {
  coolSeconds: 22, // quiet seconds until heat starts falling
  heatPerCrime: 34, // stealing a car, shooting a pedestrian
  heatPerKill: 45,
  decayPerSecond: 6,
  maxHeat: 100,
  // heat thresholds per star: 1 star from 15, then +18 a star
  starStep: 18,
  starBase: 15,
  maxStars: 5,
  policeCarsPerStar: 1,
  bustSeconds: 2, // officer within 2.2 m for this long busts the player
  bustRange: 2.4,
};

export const MISSIONS = [
  {
    id: 'pickup',
    name: 'The First Pickup',
    giver: 'The Duchess',
    pay: 500,
    brief: 'Pick up the package at the pier warehouse and bring it back to The Duchess at the marina.',
    steps: [
      { kind: 'goto', label: 'Reach the pier warehouse', at: [-238, -40] },
      { kind: 'goto', label: 'Deliver the package to The Duchess', at: [210, 210] },
    ],
  },
  {
    id: 'hotwheels',
    name: 'Hot Wheels',
    giver: 'The Duchess',
    pay: 900,
    brief: 'Steal the yellow Comet parked outside the Ocean View hotel and bring it to the lockup.',
    steps: [
      { kind: 'steal', label: 'Steal the yellow Comet', car: 'comet' },
      { kind: 'deliver', label: 'Deliver the Comet to the lockup', at: [175, -175] },
    ],
  },
  {
    id: 'breaker',
    name: 'Breaker Down',
    giver: 'The Duchess',
    pay: 1400,
    brief: 'The Duchess needs a getaway driver. Steal the blue Sultan, lose the cops, and park it at the pier.',
    steps: [
      { kind: 'steal', label: 'Steal the blue Sultan', car: 'sultan' },
      { kind: 'deliver', label: 'Park the Sultan at the pier', at: [-225, 75] },
    ],
  },
  {
    id: 'payday',
    name: 'Payday',
    giver: 'The Duchess',
    pay: 2500,
    brief: 'The big one. Grab the red Banshee, shake the two-star heat, and bring it home to the marina.',
    steps: [
      { kind: 'steal', label: 'Steal the red Banshee', car: 'banshee' },
      { kind: 'deliver', label: 'Deliver the Banshee to the marina', at: [210, 210] },
    ],
    startStars: 2,
  },
];

export const PALETTE = {
  sky: 0x87b5d6,
  sun: 0xffe9b0,
  asphalt: 0x2b2f36,
  sidewalk: 0x8d8f96,
  sand: 0xe8d29a,
  ocean: 0x1d6f8f,
  grass: 0x4d8a4a,
  buildingGlass: 0x9fc4d8,
  neonPink: 0xff2e88,
  neonCyan: 0x2ee6ff,
  neonGold: 0xffd23f,
};

export const SAVE_KEY = 'solara-city-save-v1';

// Camera defaults for the third-person rig (main.js).
export const CAMERA = {
  onFootDist: 8,
  carDist: 11,
  pitch: 0.32,
  minPitch: 0.08,
  maxPitch: 0.9,
  mouseSens: 0.0026,
  chaseLerp: 3.2,
};
