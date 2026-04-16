export interface SeededRandom {
  next(): number;
  uniform(min: number, max: number): number;
  int(min: number, max: number): number;
  normal(mean: number, sigma: number): number;
  chance(probability: number): boolean;
  pick<T>(arr: readonly T[]): T;
  pickN<T>(arr: readonly T[], n: number): T[];
  shuffle<T>(arr: readonly T[]): T[];
  fork(): SeededRandom;
}

// --- SplitMix64 seed expansion ---

function splitMix64(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

// --- xoshiro128** core ---

function xoshiro128ss(s0: number, s1: number, s2: number, s3: number): () => number {
  let a = s0 >>> 0;
  let b = s1 >>> 0;
  let c = s2 >>> 0;
  let d = s3 >>> 0;

  return () => {
    const result = (Math.imul(rotl(Math.imul(b, 5) >>> 0, 7), 9)) >>> 0;
    const t = (b << 9) >>> 0;

    c = (c ^ a) >>> 0;
    d = (d ^ b) >>> 0;
    b = (b ^ c) >>> 0;
    a = (a ^ d) >>> 0;

    c = (c ^ t) >>> 0;
    d = rotl(d, 11);

    return result;
  };
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

// --- SeededRandom implementation ---

export function createRandom(seed: number): SeededRandom {
  const expand = splitMix64(seed);
  const core = xoshiro128ss(expand(), expand(), expand(), expand());

  function next(): number {
    return core() / 0x100000000;
  }

  function uniform(min: number, max: number): number {
    return min + next() * (max - min);
  }

  function int(min: number, max: number): number {
    return Math.floor(uniform(min, max));
  }

  let cachedNormal: number | null = null;

  function normal(mean: number, sigma: number): number {
    if (cachedNormal !== null) {
      const val = mean + sigma * cachedNormal;
      cachedNormal = null;
      return val;
    }

    let u1: number;
    let u2: number;
    do {
      u1 = next();
    } while (u1 === 0);
    u2 = next();

    const mag = sigma * Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    cachedNormal = Math.sin(angle) * mag / sigma;
    return mean + mag * Math.cos(angle);
  }

  function chance(probability: number): boolean {
    return next() < probability;
  }

  function pick<T>(arr: readonly T[]): T {
    return arr[int(0, arr.length)]!;
  }

  function pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = arr.slice();
    const count = Math.min(n, copy.length);
    for (let i = 0; i < count; i++) {
      const j = int(i, copy.length);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, count);
  }

  function shuffle<T>(arr: readonly T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i + 1);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  function fork(): SeededRandom {
    const childSeed = core();
    return createRandom(childSeed);
  }

  return { next, uniform, int, normal, chance, pick, pickN, shuffle, fork };
}
