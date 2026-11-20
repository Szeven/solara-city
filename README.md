# Solara City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Szeven/solara-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Szeven/solara-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara City is an original open-world crime game that runs entirely in the browser: a sun-soaked 9×9 coastal city to explore on foot and by car, with traffic, pedestrians, car stealing, a wanted level with police who chase and bust, four story missions for The Duchess, a pistol, a HUD with a minimap, and a save that persists between sessions. Every texture is drawn on canvas and every sound is synthesized with WebAudio — no image or audio files are shipped.

Play it with keyboard and mouse. WASD moves, Shift runs, E steals or enters a car, Space is the handbrake, click shoots, R reloads. Earn cash from missions, watch your wanted stars, and lay low for 22 quiet seconds to cool the heat.

Run it locally:

```sh
node serve.ts
```

then open http://127.0.0.1:8080 in a desktop browser. No build step and no network requests: `game/index.html` plus its ES modules is the whole game, with three.js r160 vendored under `game/vendor/`.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
