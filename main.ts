// Solara City — the entry program. It copies game/ and screenshots/ from
// this repository into the output directory and writes out/dossier.json
// with the kit's buildDossier. Node 22, standard library only; it runs
// twice in the grader and both runs must write the same bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const name of ['game', 'screenshots']) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) {
    throw new Error(`Solara City: missing ${name}/ — run from the repository root with game/ and screenshots/ present.`);
  }
  cpSync(src, join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

const shots = readdirSync(join(outDir, 'screenshots')).filter((f) => !f.startsWith('.'));
console.log(`Solara City handed in: game/ + ${shots.length} screenshot(s) -> ${outDir}`);
