# Solara City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Szeven/solara-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Szeven/solara-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara City is an original open-world crime game in the spirit of GTA 6, built for the make.fun gta6-01 bounty. No Rockstar name, logo, character, map or asset appears anywhere: the city, its people, its cars and its story are all invented here.

## The game

A sun-soaked 9x9-block coastal city, ocean to the west. Explore it on foot or by car, steal cars, outrun the police, and work four jobs for The Duchess — a fixer who runs the city's night trade out of Club Mirage.

- **Open world:** drive and walk a full city grid with traffic, pedestrians, a beach and a marina.
- **Wanted system:** 0–5 stars. Steal cars, shoot, or hit people and the police come — cruisers that chase and ram, officers on foot who try to bust you. Lay low for 22 quiet seconds and the heat cools.
- **Missions:** four jobs with a beacon and minimap marker — The First Pickup ($500), Hot Wheels ($900), Breaker Down ($1,400), Payday ($2,500).
- **Combat:** a hitscan pistol with 12 rounds, reload, tracers and muzzle flash.
- **HUD:** cash, wanted stars, health, ammo, speed, mission line and a live minimap.
- **Save:** progress (cash, jobs done, position) is kept in localStorage.
- **Sound and art:** every sound is synthesized with WebAudio (engine, sirens, gunshots, jingles, ambience) and every texture is drawn procedurally on canvas. No image or audio file is shipped.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Shift | Run |
| E | Steal / enter a car, interact |
| Mouse drag | Orbit camera |
| Left click | Shoot |
| R | Reload |
| Space / Enter | Confirm |
| P / Esc | Pause |
| M | Mute |

## Run it

Serve `game/` with any static server and open `game/index.html`, or run the dev server:

```sh
node serve.ts --port 8322   # serves game/ on http://localhost:8322/
```

The entry program `main.ts` (Node 22, standard library only) hands the game in:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

## Tech

- three.js r160, vendored under `game/vendor/`
- ES modules under `game/src/`, one job per file
- No network requests at runtime; fully offline

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
