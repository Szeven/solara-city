// Solara City — tuning, places and mission data.
// Every number here is the game's own design: a 9x9-block coastal city,
// ocean to the west, roads 14 m wide on a 50 m pitch.

export const CITY = {
  blocks: 9,
  pitch: 50,
  roadWidth: 14,
  blockSize: 36,
  half: 225, // the city spans -225..225 on both axes
  oceanEdge: -225, // west of this line is water
  beachWidth: 30,
};

// Road centrelines, one every 50 m from -225 to 225.
export const ROAD_LINES = [-225, -175, -125, -75, -25, 25, 75, 125, 175, 225];

// Named places, all on road intersections so markers sit in the open.
export const PLACES = {
  docks: { x: -175, z: 175, name: 'Docks' },
  marina: { x: -175, z: -175, name: 'Marina' },
  garage: { x: 175, z: 125, name: 'Sunset Garage' },
  club: { x: 125, z: -125, name: 'Club Mirage' },
  causeway: { x: -25, z: -175, name: 'Causeway' },
  plaza: { x: 25, z: 25, name: 'Meridian Plaza' },
  safehouse: { x: -125, z: 125, name: 'Safehouse' },
  hospital: { x: 75, z: -125, name: 'General Hospital' },
  beach: { x: -200, z: 25, name: 'Solara Beach' },
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10.5,
  radius: 0.45,
  height: 1.8,
  health: 100,
  turnSpeed: 9,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseMax: 9,
  forwardMax: 38,
  steer: 1.9,
  grip: 6,
  radius: 1.6,
};

// Wanted: heat rises with crimes, cools after 22 quiet seconds.
export const WANTED = {
  maxStars: 5,
  coolAfter: 22,
  coolRate: 0.35, // stars per second once cooling
  stealHeat: 1.0,
  shootHeat: 0.6,
  hitPedHeat: 1.0,
  hitCopHeat: 1.5,
  hitCarHeat: 0.2,
  copCars: [0, 1, 2, 3, 4, 5], // cop cars out, by star
  copFoot: [0, 0, 1, 2, 3, 4], // officers on foot, by star
};

export const WEAPON = {
  ammo: 12,
  reloadSeconds: 1.4,
  range: 90,
  damage: 34,
  fireSeconds: 0.22,
};

// The four jobs The Duchess hands out, in story order.
export const MISSIONS = [
  {
    id: 'm1',
    name: 'The First Pickup',
    reward: 500,
    giver: 'The Duchess',
    briefing: 'A package is waiting at the Docks. Walk in, pick it up, bring it to the Safehouse. No noise.',
    steps: [
      { kind: 'goto', place: 'docks', text: 'Go to the Docks' },
      { kind: 'pickup', place: 'docks', text: 'Pick up the package (E)' },
      { kind: 'goto', place: 'safehouse', text: 'Deliver to the Safehouse' },
      { kind: 'deliver', place: 'safehouse', text: 'Hand it over (E)' },
    ],
  },
  {
    id: 'm2',
    name: 'Hot Wheels',
    reward: 900,
    giver: 'The Duchess',
    briefing: 'A Comet GT is parked at the Marina. Take it. The Breakers want it at the Garage — do not scratch it.',
    steps: [
      { kind: 'goto', place: 'marina', text: 'Go to the Marina' },
      { kind: 'steal', place: 'marina', text: 'Steal the Comet GT (E)' },
      { kind: 'goto', place: 'garage', text: 'Drive it to Sunset Garage' },
      { kind: 'deliver', place: 'garage', text: 'Hand over the Comet GT (E)' },
    ],
  },
  {
    id: 'm3',
    name: 'Breaker Down',
    reward: 1400,
    giver: 'The Duchess',
    briefing: 'The Breakers are leaning on our drivers at the Causeway. Go there, clear them out, then get to Club Mirage.',
    steps: [
      { kind: 'goto', place: 'causeway', text: 'Go to the Causeway' },
      { kind: 'clear', place: 'causeway', text: 'Clear out the Breakers' },
      { kind: 'goto', place: 'club', text: 'Report to Club Mirage' },
      { kind: 'deliver', place: 'club', text: 'Tell The Duchess (E)' },
    ],
  },
  {
    id: 'm4',
    name: 'Payday',
    reward: 2500,
    giver: 'The Duchess',
    briefing: 'One last run. Pick up the payout at the Plaza, lose the tail, and bring it home to the Safehouse.',
    steps: [
      { kind: 'goto', place: 'plaza', text: 'Go to Meridian Plaza' },
      { kind: 'pickup', place: 'plaza', text: 'Pick up the payout (E)' },
      { kind: 'escape', place: 'safehouse', text: 'Lose the heat, then reach the Safehouse' },
      { kind: 'deliver', place: 'safehouse', text: 'Stash the payout (E)' },
    ],
  },
];

export const COLORS = {
  sky: 0x87b5d6,
  sun: 0xffe3b3,
  ocean: 0x2e6f8e,
  sand: 0xd9c08a,
  grass: 0x5d8a4a,
  road: 0x33363b,
  sidewalk: 0x9a9a92,
  building: [0xc9a06a, 0x8fa3b0, 0xb0705f, 0x7d8a6a, 0xa89a7d, 0x6f7f95],
  car: [0xc23b2e, 0x2e6fc2, 0xe0a92e, 0x3fae6a, 0x7a4fb0, 0xd8d8d8, 0x222222],
  cop: 0x1d2f4d,
  beacon: 0xffd34d,
};
