[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solara City

[![make.fun bounty](https://img.shields.io/badge/make.fun-gta6--01-blue)](https://make.fun/bounty/gta6-01)
[![make.fun entry](https://img.shields.io/badge/make.fun-entry-brightgreen)](https://make.fun)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Solara City** is an original open-world crime game in the spirit of GTA 6,
built for the make.fun bounty [gta6-01](https://make.fun/bounty/gta6-01). It runs
offline in a desktop browser from static files — no build step, no network
request, no account. Three.js (r160) is vendored under `game/vendor/`.

## The game

Jax Marlowe came back to Solara City broke. The Duchess, who runs Club Mirage,
has work for a wheelman she can trust — and the Breakers want him gone. Steal
cars, outrun the cops, finish the jobs, get paid.

- **A city to explore** — a 9×9 block coastal grid with downtown towers, the
  docks, the marina, the plaza and the beach, all procedural: no image or audio
  file is shipped, everything is drawn and synthesized in code.
- **On foot and by car** — walk, run, and drive with an arcade model; steal any
  parked or traffic car with E (the law notices).
- **Traffic and pedestrians** — cars drive the road graph and brake for each
  other; pedestrians stroll the sidewalks and flee from gunshots and speeding
  cars.
- **A wanted system and police** — 5 stars of heat that cools when you lie low;
  police cars spawn, chase and ram; officers get out on foot to make the bust.
- **Missions and a story** — four jobs for The Duchess (The First Pickup, Hot
  Wheels, Breaker Down, Payday), each a chain of objectives with a beacon in the
  world and a marker on the minimap, paying $500–$2,500.
- **Combat** — a pistol with hitscan shots, tracers, muzzle flash, reloads, and
  car health that ends in explosions of consequences.
- **HUD with a minimap** — cash, wanted stars, health, ammo, speed, the mission
  line, and a live minimap with the objective, the police and traffic on it.
- **Start and save** — a title screen with the job list, free roam, and a
  Continue that resumes your cash and finished jobs from localStorage.
- **Sound** — every sound is synthesized with WebAudio: engine hum, a two-tone
  siren, gunshots, pickup chimes, a mission jingle and a sunset synth loop.

## How to play

```
node serve.ts            # serves game/ on http://localhost:8080
```

Open the page and press **1–4** to start a job, **Enter** for Free Roam, or **C**
to continue your save.

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| Shift | Run |
| Mouse drag | Orbit the camera |
| E | Enter a car / interact / get out |
| Click | Shoot |
| R | Reload |
| P / Esc | Pause |
| M | Mute |

## Screenshots

The four screenshots in `screenshots/` are real renders of the game, staged by
`game/src/shots.js` behind `?shot=cover|street|mission|chase`:

1. **Cover** — a getaway in progress: driving, 3 stars, cops behind, a job on
   the HUD.
2. **Street** — on foot downtown, traffic and pedestrians all around.
3. **Mission** — the first job at the docks, package marker and beacon in view.
4. **Chase** — the Comet GT at the marina, 5 stars, cops closing in.

## Layout

```
game/
  index.html            the page, HUD and import map
  src/
    main.js             boot, screens, the fixed-step loop
    config.js           tuning, jobs, places, palette
    world.js            the state machine and the step loop
    city.js             the 9x9 grid, buildings, road graph
    render.js           three.js scene, camera, minimap, beacon
    player.js           on foot, driving, shooting
    vehicles.js         car model, traffic AI, arcade driving
    people.js           pedestrians and officers
    police.js           the wanted system
    missions.js         the four jobs
    audio.js            synthesized WebAudio sound
    hud.js              the DOM HUD and the title screen
    save.js             localStorage save / load
    shots.js            the screenshot scenes
    random.js           seeded random
    input.js            keyboard and mouse
  vendor/
    three.module.min.js three.js r160 (MIT), vendored
main.ts                 the entry program: copies game/ + screenshots/ to
                        /output and writes dossier.json
```

## License

MIT — see [LICENSE](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
