// Seeded random numbers (mulberry32) so the city, traffic and shots are
// repeatable from one seed, and the same seed replays the same scene.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [a, b).
    range(a, b) {
      return a + (b - a) * next();
    },
    // Integer in [a, b] inclusive.
    int(a, b) {
      return a + Math.floor(next() * (b - a + 1));
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
    // One element of arr, uniformly.
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    // In-place Fisher-Yates shuffle, returns the same array.
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

// A deterministic 2D hash for per-block variation: same input, same output.
export function hash2(x, z, seed = 7) {
  let h = (x * 374761393 + z * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
