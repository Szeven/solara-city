# Solara City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Szeven/solara-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Szeven/solara-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara City is an original open-world crime game that runs entirely in your
browser from static files — no build step, no network requests, no Rockstar
material. Explore a sun-soaked 9x9 coastal city on foot or behind the wheel,
steal cars, outrun the Solara Police Department, and run four story jobs for
The Duchess.

## How to play

Serve `game/` with any static file server (or run `node serve.ts`) and open
`game/index.html`. Keyboard and mouse only.

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Shift | Sprint |
| E | Enter / exit a car, steal a parked car |
| Space | Handbrake (driving) / jump (on foot) |
| Mouse | Aim, click to fire the pistol |
| R | Reload |
| M | Toggle the map |
| Esc | Pause |

## What is inside

- **A living city**: 9x9 blocks of procedural buildings, an ocean to the
  west, a road graph with traffic lights, and pedestrians who stroll the
  sidewalks and flee when shots are fired.
- **Driving**: arcade handling, traffic AI that follows the road graph,
  car stealing with a wanted-level cost.
- **Wanted system**: 0–5 stars. Heat cools after 22 quiet seconds. Police
  cars chase and ram; officers on foot bust you up close.
- **Missions**: four jobs for The Duchess — The First Pickup ($500),
  Hot Wheels ($900), Breaker Down ($1,400) and Payday ($2,500) — each with
  a beacon and a minimap marker. Deliveries only count in the right car.
- **Combat**: hitscan pistol, 12 rounds, reload, tracers, and synthesized
  WebAudio gunfire, sirens and engine hum. All textures are procedural
  canvas art; all sound is synthesized. No image or audio files ship.
- **HUD and save**: cash, stars, health, ammo, speed, mission line and a
  live minimap. Progress saves to localStorage; continue from the title
  screen.

## Layout

- `game/index.html` — entry page, import map for three.js.
- `game/src/` — the game's own source, one system per file.
- `game/vendor/` — vendored three.js r160 (`three.module.min.js`).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`.
- `serve.ts` — a tiny static dev server for `game/`.

Built for the make.fun gta6-01 bounty. Solara City, The Duchess, and every
character, vehicle and street name in it are original.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
