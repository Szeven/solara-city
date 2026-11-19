// Solara City — dev server. Serves game/ over HTTP so the game can be
// played in a desktop browser. Node 22, standard library only.
//
//   node serve.ts --port 8322   # serves game/ on http://localhost:8322/

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(repoRoot, 'game');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function portFromArgs() {
  const i = process.argv.indexOf('--port');
  if (i >= 0 && process.argv[i + 1]) {
    const p = Number(process.argv[i + 1]);
    if (Number.isSafeInteger(p) && p > 0 && p < 65536) return p;
  }
  return 8322;
}

const port = portFromArgs();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = normalize(join(gameDir, rel));
    if (!file.startsWith(gameDir + sep)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      // Dev server: never serve a stale game file from the browser cache.
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Solara City on http://localhost:${port}/`);
});
