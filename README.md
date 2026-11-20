# Solara City — make.fun gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Szeven/solara-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Szeven/solara-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara City is an original open-world crime game in the spirit of GTA 6,
built for the make.fun gta6-01 bounty. No Rockstar art, names, or assets —
the city, the story, the cars, and the sound are all made for this entry.

You play a wheelman new to Solara City, a sun-soaked 9×9 coastal city
where the ocean meets the west edge. Walk the streets or steal a car and
drive: traffic follows the road graph, pedestrians stroll the sidewalks
and flee when trouble starts, and the Solara City police answer with
cruisers and officers on foot as your wanted level climbs from 0 to 5
stars. The Duchess runs the city's jobs — four missions, from a $500
pickup at the Docks to a $2,500 payday — with a beacon and a minimap
marker guiding you there. A hitscan pistol (12 rounds, reload with R),
a cash and health HUD, a minimap, a title screen with a job list, and a
localStorage save round it out. All sound is synthesized in WebAudio and
all textures are drawn on canvas at run time; no image or audio files
are shipped.

## How to play

Serve `game/` with any static server (or `node serve.ts`, then open
http://localhost:8322) and open `game/index.html` in a desktop browser.

- **W A S D** — move / drive · **Mouse** — look / aim · **Shift** — run
- **E** — steal / enter a car, exit it · **Space** — brake / handbrake
- **Left click** — fire the pistol · **R** — reload
- **1–4** — start a job for The Duchess · **P** — pause · **M** — mute

## What is in the repo

- `game/` — the playable game: `index.html` plus ES modules under
  `game/src/`, with three.js r160 vendored under `game/vendor/`.
- `screenshots/` — four renders of the game itself, taken in a browser.
- `main.ts` — hands the entry in: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json` with
  `vendor/makefun-game.ts`.
- `serve.ts` — a small dev server for play-testing.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
