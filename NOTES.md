# Solara City — make.fun gta6-01 entry notes

## What it is

Solara City — an original open-world crime game in the spirit of GTA 6. No
Rockstar name, logo, character, map or asset anywhere. Jax Marlowe, The
Duchess (Club Mirage), the Breakers, the Comet GT — all invented here. A 9x9
block coastal city (roads 14 m, blocks 36 m, pitch 50 m, ocean west), on foot
(walk/run) and driving (arcade model), traffic AI on the road graph,
pedestrians who stroll and flee, car stealing with E, wanted system 0–5
stars (heat cools after 22 quiet s), police cars that chase and ram,
officers on foot who bust, 4 missions for The Duchess (The First Pickup
$500, Hot Wheels $900, Breaker Down $1,400, Payday $2,500) with beacon and
minimap marker, hitscan pistol combat (12 ammo, reload, tracers), HUD
(cash, stars, health, ammo, speed, mission line, minimap), title screen
with job list + Free Roam + Continue, save in localStorage, all sound
synthesized with WebAudio (engine, siren, shots, jingle, ambient loop), all
textures procedural canvas. No image or audio file is shipped.

## Layout

- `game/index.html` — page, import map (`three` → `vendor/three.module.min.js`), HUD DOM.
- `game/src/config.js` — tuning, places, missions, colours.
- `game/src/random.js` — seeded RNG (mulberry32).
- `game/src/textures.js` — procedural canvas textures.
- `game/src/city.js` — city builder, road graph, colliders.
- `game/src/render.js` — renderer, scene, sun, chase camera.
- `game/src/audio.js` — WebAudio synth.
- `game/src/input.js` — keyboard and mouse.
- `game/src/vehicles.js` — car meshes, arcade driving, traffic AI.
- `game/src/people.js` — pedestrians.
- `game/src/police.js` — cruisers and officers, wanted-level spawns.
- `game/src/player.js` — on foot, driving, shooting.
- `game/src/missions.js` — the four jobs, beacon, mission car, Breakers.
- `game/src/hud.js` — HUD, minimap, title / pause / busted screens.
- `game/src/shots.js` — screenshot staging via `?shot=<name>&seed=7`.
- `game/src/main.js` — bootstrap, loop, state machine, save.
- `game/vendor/three.module.min.js` — three.js r160 (third-party library).
- `main.ts` — entry program: copies game/ + screenshots/ to /output, writes dossier.json.
- `serve.ts` — dev server (port 8322).
- `vendor/makefun-game.ts` — the kit's library, unchanged.
- `shots.json` — the four screenshot scenes.

## Commands

```sh
# serve the game (dev server, port 8322)
node serve.ts --port 8322            # serves game/ on http://localhost:8322/
# syntax checks (all game/src/*.js as ES modules, main.ts, serve.ts)
for f in game/src/*.js; do cp "$f" /tmp/check.mjs && node --check /tmp/check.mjs; done
node --check main.ts && node --check serve.ts
# build the entry output (MAKEFUN_OUTPUT_DIR stands in for /output)
rm -rf out && mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# pre-submit checks
node ~/workspace/makefun/gta6-01-kit/cli/makefun.mjs check --kit ~/workspace/makefun/gta6-01-kit --repo . --worktree
```

## Screenshots

Taken with headless Firefox under Xvfb (Xvfb + Mesa llvmpipe + Firefox
BiDi), driving the real game for a few seconds per shot, same seed each
time so a shot repeats. Each shot URL is
`http://localhost:8322/?shot=<name>&seed=7`; the staging is in
`game/src/shots.js`.

| file | scene |
| --- | --- |
| screenshots/1-cover.jpg | getaway in progress: driving, 3 stars, cop behind, job on HUD |
| screenshots/2-street.jpg | on foot downtown, traffic and pedestrians |
| screenshots/3-mission.jpg | first job at the docks, package marker + beacon in view |
| screenshots/4-chase.jpg | Comet GT, 5 stars, cops closing in |

## Checks run (2026-11-20, before submit)

- `node --check` on all `game/src/*.js` (as `.mjs` copies), `main.ts`, `serve.ts` — all pass.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` — exits 0, writes `out/dossier.json` (schema makefun/dossier/v1, 4 images, 86,863 chars of text).
- Kit check (`cli/makefun.mjs check --kit ... --repo . --worktree`): 4 passed, 0 failed, 17 skipped (transcript checks run on the site), 5 at submission (repo public / owner / created-after-open / commit-in-repo / duplicate-snapshot — resolved by push + submit).
- Browser load (headless Firefox under Xvfb, BiDi): all 4 shots render the game with HUD + minimap — cover (3 stars, cop behind, job on HUD), street (on foot downtown), mission (beacon at the Docks), chase (5 stars, cops closing in). Screenshots are 1280x720 JPEGs, ~100 KB each.
- Note: `~/workspace/bidi-shot.js` did not call `session.end` on its success path, so a second run failed with "session not created" — fixed by ending the session after a successful capture.
