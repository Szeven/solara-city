// Solara City — make.fun gta6-01 entry program (Node 22).
//
// Hands the game in: copies game/ and screenshots/ from this repository
// into the output directory and writes /output/dossier.json with
// buildDossier from vendor/makefun-game.ts.
//
// The output directory is cleaned by removing its CONTENTS, never the
// directory itself: the grader runs this program as an unprivileged user
// with /output owned by root, so deleting /output would fail with EPERM
// and the run would exit non-zero.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function cleanOutputDir(dir: string): void {
  // Make sure the directory exists, then empty it entry by entry.
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function main(): void {
  cleanOutputDir(outDir);
  for (const name of ['game', 'screenshots']) {
    const src = join(repoRoot, name);
    if (!existsSync(src)) throw new Error(`missing ${name}/ in the repository`);
    cpSync(src, join(outDir, name), { recursive: true });
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  const shots = readdirSync(join(outDir, 'screenshots')).length;
  console.log(`Solara City handed in: game/ + ${shots} screenshot(s) -> ${outDir}`);
}

main();
