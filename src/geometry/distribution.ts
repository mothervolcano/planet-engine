import type { Environment } from "../core/environment";
import type { Grid } from "./grid";
import type { Mark } from "./mark";
import type { Partition } from "./partition";
import type { Plot } from "./plot";
import type { SeededRandom } from "../core/prng";
import { mark } from "./mark";
import { resolvePartition } from "./partition";
import { createPlot } from "./plot";

// ─── Grid distribution ────────────────────────────────────────────────────────

/**
 * Parameters for grid-based mark distribution.
 * - `density` = marks per guide (scaled by `guide.annotations.densityHint`)
 * - `positionJitter` applies along the guide axis
 */
export interface DistributionParams {
  density: number;
  margins?: [number, number];
  positionJitter?: number;
  sizeRange?: [number, number];
}

// ─── Partition scatter params ─────────────────────────────────────────────────

export type UniformScatter = {
  mode?: "uniform";
  /** Total number of marks to place. */
  density: number;
  margins?: [number, number];
  sizeRange?: [number, number];
};

export type PoissonScatter = {
  mode: "poisson";
  /** Minimum distance between any two marks, as a fraction of env.radius. */
  minSpacing: number;
  /** Candidate points tried per active point before giving up (default 30). */
  maxAttempts?: number;
  margins?: [number, number];
  sizeRange?: [number, number];
};

export type NoiseMaskedScatter = {
  mode: "noise-masked";
  /** Number of candidate points generated before applying the mask. */
  density: number;
  /** Spatial frequency of the noise mask — higher = finer detail. */
  noiseScale: number;
  /** Acceptance threshold in [0, 1]. Higher = fewer marks accepted. */
  threshold: number;
  /** Number of noise octaves (default 1). */
  octaves?: number;
  margins?: [number, number];
  sizeRange?: [number, number];
};

export type ClusteredScatter = {
  mode: "clustered";
  /** Number of cluster centers. */
  clusterCount: number;
  /** Marks generated per cluster center. */
  marksPerCluster: number;
  /** Std-dev of mark positions around each cluster center, as a fraction of env.radius. */
  clusterSpread: number;
  margins?: [number, number];
  sizeRange?: [number, number];
};

export type ScatterParams =
  | UniformScatter
  | PoissonScatter
  | NoiseMaskedScatter
  | ClusteredScatter;

// ─── Overloads ────────────────────────────────────────────────────────────────

export function distribute(env: Environment, grid: Grid, params: DistributionParams): Plot;
export function distribute(env: Environment, partition: Partition, params: ScatterParams): Plot;
export function distribute(
  env: Environment,
  second: Grid | Partition,
  params: DistributionParams | ScatterParams,
): Plot {
  if ('guides' in second) {
    return distributeGrid(env, second, params as DistributionParams);
  }
  return distributePartition(env, second, params as ScatterParams);
}

// ─── Grid mode ────────────────────────────────────────────────────────────────

function distributeGrid(env: Environment, grid: Grid, params: DistributionParams): Plot {
  const {
    density,
    margins = [0, 1],
    positionJitter = 0,
    sizeRange = [0.01, 0.07],
  } = params;
  const { random, radius } = env;

  const [marginStart, marginEnd] = margins;
  const effectiveRange = marginEnd - marginStart;
  const marks: Mark[] = [];

  for (const guide of grid.guides) {
    const effectiveDensity = density * guide.annotations.densityHint;
    const markCount = Math.max(1, Math.round(effectiveDensity));

    if (markCount <= 0) continue;

    const spacing = effectiveRange / markCount;

    for (let i = 0; i < markCount; i++) {
      let t = marginStart + spacing * (i + 0.5);

      if (positionJitter > 0) {
        t += positionJitter * spacing * random.uniform(-0.5, 0.5);
        t = Math.max(marginStart, Math.min(marginEnd, t));
      }

      const pos = guide.interpolate(t);
      const size =
        random.uniform(sizeRange[0], sizeRange[1]) * guide.annotations.sizeHint * radius;

      marks.push(mark(pos.x, pos.y, size));
    }
  }

  return createPlot(marks);
}

// ─── Partition mode dispatch ──────────────────────────────────────────────────

function distributePartition(env: Environment, partition: Partition, params: ScatterParams): Plot {
  const resolved = resolvePartition(env.center, env.radius, partition);
  const mode = params.mode ?? "uniform";

  switch (mode) {
    case "uniform":      return scatterUniform(env, resolved, params as UniformScatter);
    case "poisson":      return scatterPoisson(env, resolved, params as PoissonScatter);
    case "noise-masked": return scatterNoiseMasked(env, resolved, params as NoiseMaskedScatter);
    case "clustered":    return scatterClustered(env, resolved, params as ClusteredScatter);
  }
}

// ─── Scatter modes ────────────────────────────────────────────────────────────

function scatterUniform(env: Environment, resolved: Partition, params: UniformScatter): Plot {
  const { density, margins = [0, 1], sizeRange = [0.01, 0.07] } = params;
  const { random, radius } = env;
  const markCount = Math.max(0, Math.round(density));
  const marks: Mark[] = [];

  for (let i = 0; i < markCount; i++) {
    const [x, y] = samplePoint(env, resolved, margins);
    const size = random.uniform(sizeRange[0], sizeRange[1]) * radius;
    marks.push(mark(x, y, size));
  }

  return createPlot(marks);
}

function scatterPoisson(env: Environment, resolved: Partition, params: PoissonScatter): Plot {
  const { minSpacing, maxAttempts = 30, margins = [0, 1], sizeRange = [0.01, 0.07] } = params;
  const { random, radius } = env;

  const r = minSpacing * radius;
  const r2 = r * r;
  const cellSize = r / Math.SQRT2;

  const [bx0, by0, bx1, by1] = boundingBox(env, resolved, margins);
  const cols = Math.ceil((bx1 - bx0) / cellSize);
  const rows = Math.ceil((by1 - by0) / cellSize);

  const grid = new Int32Array(cols * rows).fill(-1);
  const points: [number, number][] = [];
  const active: number[] = [];

  const insertPoint = (x: number, y: number): void => {
    const idx = points.length;
    points.push([x, y]);
    active.push(idx);
    const col = Math.floor((x - bx0) / cellSize);
    const row = Math.floor((y - by0) / cellSize);
    grid[row * cols + col] = idx;
  };

  const isTooClose = (x: number, y: number): boolean => {
    const col = Math.floor((x - bx0) / cellSize);
    const row = Math.floor((y - by0) / cellSize);
    for (let rr = Math.max(0, row - 2); rr <= Math.min(rows - 1, row + 2); rr++) {
      for (let cc = Math.max(0, col - 2); cc <= Math.min(cols - 1, col + 2); cc++) {
        const idx = grid[rr * cols + cc] ?? -1;
        if (idx === -1) continue;
        const [px, py] = points[idx]!;
        if ((x - px) ** 2 + (y - py) ** 2 < r2) return true;
      }
    }
    return false;
  };

  const [sx, sy] = samplePoint(env, resolved, margins);
  insertPoint(sx, sy);

  while (active.length > 0) {
    const ai = random.int(0, active.length);
    const [ox, oy] = points[active[ai]!]!;
    let found = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = random.uniform(0, 2 * Math.PI);
      const dist  = random.uniform(r, 2 * r);
      const cx = ox + dist * Math.cos(angle);
      const cy = oy + dist * Math.sin(angle);

      if (!isInside(cx, cy, env, resolved, margins)) continue;
      if (isTooClose(cx, cy)) continue;

      insertPoint(cx, cy);
      found = true;
      break;
    }

    if (!found) active.splice(ai, 1);
  }

  const marks: Mark[] = points.map(([x, y]) =>
    mark(x, y, random.uniform(sizeRange[0], sizeRange[1]) * radius),
  );

  return createPlot(marks);
}

function scatterNoiseMasked(env: Environment, resolved: Partition, params: NoiseMaskedScatter): Plot {
  const { density, noiseScale, threshold, octaves = 1, margins = [0, 1], sizeRange = [0.01, 0.07] } = params;
  const { random, radius } = env;

  const noise = makeValueNoise(random.fork());
  const markCount = Math.max(0, Math.round(density));
  const marks: Mark[] = [];

  for (let i = 0; i < markCount; i++) {
    const [x, y] = samplePoint(env, resolved, margins);

    let n = 0;
    let amp = 1;
    let freq = noiseScale;
    let totalAmp = 0;
    for (let o = 0; o < octaves; o++) {
      n += noise(x * freq, y * freq) * amp;
      totalAmp += amp;
      amp  *= 0.5;
      freq *= 2;
    }
    n /= totalAmp;

    if (n > threshold) {
      const size = random.uniform(sizeRange[0], sizeRange[1]) * radius;
      marks.push(mark(x, y, size));
    }
  }

  return createPlot(marks);
}

function scatterClustered(env: Environment, resolved: Partition, params: ClusteredScatter): Plot {
  const { clusterCount, marksPerCluster, clusterSpread, margins = [0, 1], sizeRange = [0.01, 0.07] } = params;
  const { random, radius } = env;
  const spreadPx = clusterSpread * radius;
  const marks: Mark[] = [];

  for (let c = 0; c < clusterCount; c++) {
    const [cx, cy] = samplePoint(env, resolved, margins);

    for (let m = 0; m < marksPerCluster; m++) {
      const x = cx + random.normal(0, spreadPx);
      const y = cy + random.normal(0, spreadPx);

      if (!isInside(x, y, env, resolved, margins)) continue;

      const size = random.uniform(sizeRange[0], sizeRange[1]) * radius;
      marks.push(mark(x, y, size));
    }
  }

  return createPlot(marks);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function samplePoint(env: Environment, resolved: Partition, margins: [number, number]): [number, number] {
  const { random, radius, center } = env;

  if (resolved.kind === 'band') {
    const yStart = resolved.yStart!;
    const yEnd   = resolved.yEnd!;
    const yRange = yEnd - yStart;
    const effYStart = yStart + yRange * margins[0];
    const effYEnd   = yStart + yRange * margins[1];
    const y  = random.uniform(effYStart, effYEnd);
    const dy = y - center.y;
    const hw = Math.sqrt(Math.max(0, radius * radius - dy * dy));
    return [random.uniform(center.x - hw, center.x + hw), y];
  } else {
    const { center: dc, radius: dr } = resolved;
    const r     = Math.sqrt(random.uniform((dr * margins[0]) ** 2, (dr * margins[1]) ** 2));
    const theta = random.uniform(0, 2 * Math.PI);
    return [dc.x + r * Math.cos(theta), dc.y + r * Math.sin(theta)];
  }
}

function isInside(x: number, y: number, env: Environment, resolved: Partition, margins: [number, number]): boolean {
  if (resolved.kind === 'band') {
    const yStart = resolved.yStart!;
    const yEnd   = resolved.yEnd!;
    const yRange = yEnd - yStart;
    const effYStart = yStart + yRange * margins[0];
    const effYEnd   = yStart + yRange * margins[1];
    if (y < effYStart || y > effYEnd) return false;
    const dy = y - env.center.y;
    const hw = Math.sqrt(Math.max(0, env.radius * env.radius - dy * dy));
    return x >= env.center.x - hw && x <= env.center.x + hw;
  } else {
    const { center: dc, radius: dr } = resolved;
    const d2   = (x - dc.x) ** 2 + (y - dc.y) ** 2;
    const rMin = dr * margins[0];
    const rMax = dr * margins[1];
    return d2 >= rMin * rMin && d2 <= rMax * rMax;
  }
}

function boundingBox(env: Environment, resolved: Partition, margins: [number, number]): [number, number, number, number] {
  if (resolved.kind === 'band') {
    const yStart = resolved.yStart!;
    const yEnd   = resolved.yEnd!;
    const yRange = yEnd - yStart;
    return [
      env.center.x - env.radius,
      yStart + yRange * margins[0],
      env.center.x + env.radius,
      yStart + yRange * margins[1],
    ];
  } else {
    const { center: dc, radius: dr } = resolved;
    const rMax = dr * margins[1];
    return [dc.x - rMax, dc.y - rMax, dc.x + rMax, dc.y + rMax];
  }
}

// ─── Value noise ──────────────────────────────────────────────────────────────

function makeValueNoise(random: SeededRandom): (x: number, y: number) => number {
  const SIZE = 64;
  const table = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < table.length; i++) table[i] = random.next();

  return (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const ix  = ((xi % SIZE) + SIZE) % SIZE;
    const iy  = ((yi % SIZE) + SIZE) % SIZE;
    const ix1 = (ix + 1) % SIZE;
    const iy1 = (iy + 1) % SIZE;

    // Smoothstep
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);

    const v00 = table[iy  * SIZE + ix ]!;
    const v10 = table[iy  * SIZE + ix1]!;
    const v01 = table[iy1 * SIZE + ix ]!;
    const v11 = table[iy1 * SIZE + ix1]!;

    return v00 + sx * (v10 - v00) + sy * (v01 - v00) + sx * sy * (v00 - v10 - v01 + v11);
  };
}
