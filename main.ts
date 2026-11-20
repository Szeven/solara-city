// Solara City entry program (Node 22, standard library only).
// Copies game/ and screenshots/ from beside this file into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library. The grader runs this twice and both runs must write the same
// bytes, so the output directory is emptied of its *contents* only — the
// directory itself is never removed (the grader owns it and runs as an
// unprivileged user). Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Remove every entry inside a directory, leaving the directory in place.
function clearContents(dir: string): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

mkdirSync(outDir, { recursive: true });
clearContents(outDir);
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (kit reference/gate.json): text_max_bytes is the
// only one that shapes the dossier's bytes; the rest refuse an entry the
// scorer would refuse anyway (more than 4 screenshots or one over 256 KiB;
// more than 993 files in game/ or 48 MiB of game files in all; a path
// under game/ over 1000 bytes).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
// One line on stdout so a run's output shows the dossier landed.
console.log(`solara-city: wrote dossier.json (${dossier.length} bytes) to ${outDir}`);
