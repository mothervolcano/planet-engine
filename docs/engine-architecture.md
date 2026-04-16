# Engine Architecture

This document specifies the architecture of the procedural planet rendering engine described in the [Engine Brief](./engine-brief.md) and the [Geometry Concepts](./geometry-concepts.md). It covers package structure, core abstractions, module design, the geometry pipeline, compositing, and the model authoring experience.

The engine is a **standalone, framework-agnostic TypeScript package** — no React, no D3, no framework dependencies. The existing visualization app becomes a consumer of this engine.

---

## Design decisions

These decisions were made upfront and shape the entire architecture.

| Decision | Rationale |
|----------|-----------|
| **Opaque paint handles** | Model code never touches `CanvasRenderingContext2D`. Eliminates an entire class of state-management bugs (forgotten `save()`/`restore()`, stale transforms, leaked alpha). |
| **Environment as explicit parameter** | No globals, no React context. Two planets can render simultaneously with different seeds and pools. |
| **Modules are functions** | No class hierarchies, no registries. A module is a function with typed inputs and outputs. Composition is variable binding. |
| **Eager evaluation** | Code order is execution order. No dependency graphs, no deferred evaluation. |
| **Band/belt naming split** | `band` = geometry partition (horizontal angular strip). `belt` = guide renderer (colored stripe between adjacent guides). The partition describes *where*, the renderer describes *what gets drawn*. |

---

## Package structure

```
planet-engine/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # Public barrel export
    │
    ├── core/
    │   ├── paint.ts                # Paint opaque type + internal unwrap
    │   ├── environment.ts          # Environment: createEnvironment()
    │   ├── pool.ts                 # Canvas pool: acquire/release lifecycle
    │   ├── prng.ts                 # Seeded PRNG (xoshiro128**)
    │   └── types.ts                # BlendMode, Point, Sphere
    │
    ├── geometry/
    │   ├── partition.ts            # Band, Disc constructors
    │   ├── region.ts               # Region (selectable collection of partitions)
    │   ├── grid.ts                 # chordGrid(), rayGrid() → Grid
    │   ├── guide.ts                # Guide type + interpolation
    │   ├── distribution.ts         # distribute() → Plot
    │   ├── mark.ts                 # Mark type
    │   ├── plot.ts                 # Plot (selectable collection of marks)
    │   └── selection.ts            # SelectionCriterion, filter/extract logic
    │
    ├── renderers/
    │   ├── mark/                   # spot, blot, crater, mandorla, irregular-star
    │   ├── guide/                  # belt, gradient-belt, stroke
    │   └── partition/              # base-sphere, solid-fill, gradient-fill
    │
    ├── effects/
    │   ├── warp/                   # wave, twist, bulge, ramp
    │   ├── mask/                   # gradient-mask, radial-gradient-mask, gradient-cut, radial-gradient-cut
    │   └── post/                   # correction-blur, anti-alias-mask, fit-sphere
    │
    ├── lighting/                   # base-shadow, shadow, spotlight, light-edge, rim-light
    │
    └── compositing/                # merge, mergeCut, mergeMask, collector
```

---

## Core abstractions

### Paint

The central abstraction. A branded opaque type wrapping a canvas surface. Model code sees only `width` and `height` — never the context, never the pixel data.

```ts
// Public type
type Paint = {
  readonly [PAINT_BRAND]: true
  readonly width: number
  readonly height: number
}
```

Internally, the engine maintains a `WeakMap<Paint, PaintInternal>` that maps each paint to its canvas, context, and pool-ownership flag. Three internal-only functions operate on this map:

- **`createPaint(canvas, ctx, poolOwned)`** — wraps a canvas as a paint
- **`unwrap(paint)`** — retrieves the internal canvas/context (engine modules only)
- **`consume(paint, pool)`** — returns the canvas to the pool and invalidates the handle

These are never exported from the package.

### Environment

The runtime that every module receives as its first argument.

```ts
interface Environment {
  readonly radius: number
  readonly diameter: number
  readonly center: Point
  readonly random: SeededRandom

  createPaint(): Paint                            // sized to diameter × diameter
  createPaintSized(w: number, h: number): Paint   // arbitrary size

  toImage(paint: Paint): Promise<HTMLImageElement>
  toBlob(paint: Paint): Promise<Blob>
  toCanvas(paint: Paint): HTMLCanvasElement
  toDataURL(paint: Paint): string

  dispose(): void
}

function createEnvironment(config: {
  radius: number
  seed: number
  poolInitialSize?: number
}): Environment
```

The environment owns the canvas pool and the seeded PRNG. It is created once per render and passed into the model function. Different renders can use different seeds, different pool sizes, different output targets — no shared state.

### Canvas pool

Dynamically allocates and reclaims canvas surfaces.

```ts
interface CanvasPool {
  acquire(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
  release(canvas: HTMLCanvasElement): void
  readonly activeCount: number
  dispose(): void
}
```

**Lifecycle rules:**

1. `env.createPaint()` acquires from the pool (creating a canvas if the pool is empty).
2. `acquire` resizes the canvas if dimensions differ, clears it, and resets context state (`setTransform`, `globalAlpha`, `globalCompositeOperation`, `filter`).
3. Compositing operations (`merge`, `collector.add`) consume their input paints, returning canvases to the pool automatically.
4. `env.dispose()` reclaims everything.

All contexts are created with `willReadFrequently: true` since pixel warp effects read `ImageData`.

### Seeded PRNG

A xoshiro128** implementation seeded from a single number via SplitMix expansion.

```ts
interface SeededRandom {
  next(): number                                      // uniform [0, 1)
  uniform(min: number, max: number): number
  int(min: number, max: number): number               // [min, max)
  normal(mean: number, sigma: number): number          // Box-Muller
  chance(probability: number): boolean
  pick<T>(arr: readonly T[]): T
  pickN<T>(arr: readonly T[], n: number): T[]          // without replacement
  shuffle<T>(arr: readonly T[]): T[]                   // Fisher-Yates
  fork(): SeededRandom                                 // independent child
}
```

Same seed + same model topology = same planet. `fork()` creates isolated sub-sequences for loop bodies that should be independent of iteration count.

---

## Geometry pipeline

```
Partition → Grid → Guides → Distribution → Plot → Selection(s) → Renderer(s)
                     ↓
               Direct to guide/partition renderers
```

### Partition

A bounded area within the sphere. Carries no pixel dimensions — it describes a shape relative to the circle, resolved against `env.radius` when needed.

```ts
type Band = { kind: 'band'; angleStart: number; angleEnd: number }
type Disc = { kind: 'disc'; center: Point; radius: number }
type Partition = Band | Disc

function band(angleStart: number, angleEnd: number): Band
function disc(center: Point, radius: number): Disc
function fullSphere(): Band   // band(-90, 90)
```

`band` is the horizontal strip partition — 0° is the equator, negative angles address the upper half, positive the lower. A `band(-90, 90)` covers the full sphere.

### Grid

An ordered sequence of annotated guides, constructed within a partition.

```ts
interface Grid {
  readonly guides: readonly Guide[]
  readonly partition: Partition
}

function chordGrid(env: Environment, partition: Partition, params: ChordGridParams): Grid
function rayGrid(env: Environment, partition: Partition, params: RayGridParams): Grid
```

**Chord grid** — parallel horizontal chords. Longest at 0° (equator), shortest near ±90° (poles). Naturally encodes sphere projection. Parameters: `count`, `jitter` (0–1 spacing randomization).

**Ray grid** — radial rays from center to circumference. Parameters: `count`, `jitter`.

The grid annotates each guide with per-guide parameters derived from its global structural knowledge:

```ts
interface GuideAnnotations {
  readonly index: number
  readonly densityHint: number    // 0–1, relative to densest guide
  readonly sizeHint: number       // 0–1, relative to largest guide
  readonly length: number         // pixels
}
```

For a chord grid: the equator guide gets `densityHint: 1.0`, near-pole guides get progressively smaller values. This is the mechanism by which global patterns emerge from a per-guide algorithm.

A grid can be consumed in two ways:
- **Via distribution** → marks → plot → renderers (discrete features)
- **Directly by a guide renderer** (continuous features like belts/stripes — no marks, no plot)

### Guide

A single line produced by a grid. Interpolatable from 0 to 1.

```ts
interface Guide {
  readonly kind: 'chord' | 'ray'
  readonly start: Point
  readonly end: Point
  readonly annotations: GuideAnnotations
  interpolate(t: number): Point
}
```

**Chord guide**: 0 = left endpoint, 1 = right endpoint.
**Ray guide**: 0 = center (origin), 1 = periphery (circumference).

Interpolation is defined as a function on the interface, not assumed to be linear. This allows future curved guide types (arcs, spirals) without changing the contract.

### Distribution

Marks positions along each guide of a grid, producing a Plot.

```ts
interface DistributionParams {
  density: number                     // base marks per guide (modulated by densityHint)
  margins?: [number, number]          // [start, end] on 0–1 range, default [0, 1]
  positionJitter?: number             // 0–1
  sizeRange?: [number, number]        // [min, max] in pixels
}

function distribute(env: Environment, grid: Grid, params: DistributionParams): Plot
```

The distribution algorithm is per-guide and can be simple — the visual variation comes from the grid modulating parameters per guide, not from the distribution being complex.

### Mark

The atomic unit of placement: `{ x: number, y: number, size: number }`. A position and a size — nothing more.

### Plot

A selectable collection of marks.

```ts
interface Plot {
  readonly marks: readonly Mark[]
  filter(criterion: SelectionCriterion, random: SeededRandom): Plot
  extract(criterion: SelectionCriterion, random: SeededRandom): Plot
}
```

`filter` is non-destructive (returns a view). `extract` is destructive (removes matched marks from the source and returns them).

### Region

A selectable collection of partitions, with the same filter/extract interface as Plot.

```ts
interface Region {
  readonly partitions: readonly Partition[]
  filter(criterion: SelectionCriterion, random: SeededRandom): Region
  extract(criterion: SelectionCriterion, random: SeededRandom): Region
}
```

### Selection criteria

Reusable criteria describing *how* to pick elements, applicable to any selectable collection:

```ts
type SelectionCriterion =
  | { kind: 'all' }
  | { kind: 'alternated' }
  | { kind: 'random'; count: number }
  | { kind: 'probabilistic'; probability: number; bias?: 'lo' | 'hi' | 'mid' | 'any' }
  | { kind: 'range'; start: number; end: number }
  | { kind: 'indices'; indices: number[] }
```

These correspond to the existing `ALL`, `ALTERNATED`, `MOST`, `SOME`, `ONE` with `LO`/`HI`/`MID`/`ANY` biases — but generalized into a shared interface.

---

## Module pattern

Every module is a plain function. First argument is always `Environment`. Returns `Paint` (renderers, effects, lighting) or geometry values (geometry modules).

```ts
// Renderer — geometry in, paint out
(env: Environment, mark: Mark, style: SpotStyle) => Paint

// Effect — paint in, paint out
(env: Environment, input: Paint, params: TwistWarpParams) => Paint

// Compositor — paints in, paint out
(env: Environment, base: Paint, overlay: Paint, options?: MergeOptions) => Paint
```

No classes, no registries, no callback indirection. **Effect locality is code position**: apply before merge = local, apply after merge = global.

### Renderers

Three categories, matching the three geometry outputs they consume:

**Mark renderers** — consume individual marks from a plot:
- `spot(env, mark, style)` — filled circle, optionally faded
- `blot(env, mark, style)` — radial gradient fade, cloud-like
- `crater(env, mark, style)` — crescent rim from offset radial cut
- `mandorla(env, mark, style)` — vesica piscis shape
- `irregularStar(env, mark, style)` — star polygon with randomized points

**Guide renderers** — consume guide pairs directly from a grid:
- `belt(env, guideA, guideB, style)` — horizontal color stripe with soft edges
- `gradientBelt(env, guideA, guideB, style)` — multi-color stripe with arbitrary stops
- `stroke(env, guide, style)` — stroked line along a guide

**Partition renderers** — consume partitions directly:
- `baseSphere(env, style)` — gradient from base color to shadow color
- `solidFill(env, partition, style)` — single color fill
- `gradientFill(env, partition, style)` — linear or radial gradient fill

### Effects

Paint in, paint out:

**Pixel warp:**
- `waveWarp(env, paint, params)` — sinusoidal displacement (horizontal/vertical)
- `twistWarp(env, paint, params)` — vortex rotation with cosine⁴ falloff
- `bulgeWarp(env, paint, params)` — outward push from center
- `rampWarp(env, paint, params)` — linear compression (perspective foreshortening)

**Masking:**
- `gradientMask(env, paint, params)` — linear opacity gradient
- `radialGradientMask(env, paint, params)` — radial opacity gradient
- `gradientCut(env, paint, params)` — linear gradient erase
- `radialGradientCut(env, paint, params)` — radial gradient erase

**Post-processing:**
- `correctionBlur(env, paint, params)` — Gaussian blur for seam smoothing
- `antiAliasMask(env, paint)` — clips to circle 1px inside radius
- `fitSphere(env, paint)` — radial mask + cut for sphere wrapping

### Lighting

Specialized effects for illumination — paint in, paint out:

- `baseShadow(env, paint, params)` — left-to-right lit-sphere gradient
- `shadow(env, paint, params)` — terminator shadow via radial cut
- `spotlight(env, paint, params)` — specular highlight
- `lightEdge(env, paint, params)` — thin crescent on lit limb
- `rimLight(env, paint, params)` — atmospheric scattering ring

---

## Compositing

```ts
merge(env, base, overlay, { blendMode?, opacity?, blur?, offset? }): Paint
mergeCut(env, base, cutter): Paint       // destination-out
mergeMask(env, base, mask): Paint         // destination-in
```

`merge` draws the overlay onto the base canvas using the specified `globalCompositeOperation`, consumes the overlay paint (returning its canvas to the pool), and returns the base paint.

**Blend modes:** `source-over`, `multiply`, `screen`, `hard-light`, `overlay`, `destination-out`, `destination-in`.

### Collector

Accumulates multiple paints with a specified blend mode. Used in iteration patterns.

```ts
interface Collector {
  add(paint: Paint): void
  result(): Paint
}

function collector(env: Environment, options?: { blendMode?: BlendMode; opacity?: number }): Collector
```

The collector maintains a single accumulation canvas internally. Each `add()` merges the input paint onto it and returns the input canvas to the pool. `result()` returns the accumulation canvas as a paint.

---

## What a model looks like

A model is a function that takes an `Environment` and returns a `Paint`. The flow is visible — you can trace what connects to what by following the variables.

```ts
import {
  type Environment, type Paint,
  band, chordGrid, distribute,
  baseSphere, belt, spot,
  twistWarp, fitSphere, shadow, rimLight, antiAliasMask,
  merge, collector,
} from '@mv/planet-engine'

export function stratoGas(env: Environment): Paint {
  const { random } = env

  // ── Base layer ──
  let result = baseSphere(env, { baseColor: '#09337E', shadowColor: '#021133' })

  // ── Belts ──
  const grid = chordGrid(env, band(-90, 90), { count: 8, jitter: 0.3 })

  const beltAcc = collector(env)
  for (let i = 0; i < grid.guides.length - 1; i++) {
    beltAcc.add(
      belt(env, grid.guides[i], grid.guides[i + 1], { color: random.pick(colors) })
    )
  }
  result = merge(env, result, beltAcc.result())

  // ── Storm features via distribution → selection → renderer ──
  const plot = distribute(env, grid, { density: 5, margins: [0.1, 0.9] })
  const storms = plot.extract({ kind: 'probabilistic', probability: 0.3 }, random)

  const stormAcc = collector(env, { blendMode: 'screen' })
  for (const m of storms.marks) {
    let s = spot(env, m, { color: 'white' })
    s = twistWarp(env, s, { angle: random.uniform(30, 120), radius: m.size * 3 })
    stormAcc.add(s)
  }
  result = merge(env, result, stormAcc.result())

  // ── Lighting ──
  result = fitSphere(env, result)
  result = shadow(env, result, { color: '#021133' })
  result = rimLight(env, result, { color: '#09337E' })
  result = antiAliasMask(env, result)

  return result
}
```

Key properties of this authoring experience:

- **No canvas management** — no `ctx.save()`, `ctx.restore()`, `clearRect()`, canvas sizing
- **Paint flow is visible** — `result` is rebound at each step, readable top to bottom
- **Loops are explicit** — the model author writes `for` loops with collectors
- **Effect locality is code position** — `twistWarp` before `stormAcc.add` = local; if it were after `merge` = global
- **Reproducible** — all randomness flows through `env.random`

### Calling a model

```ts
import { createEnvironment } from '@mv/planet-engine'
import { stratoGas } from './models/strato-gas'

const env = createEnvironment({ radius: 200, seed: 42 })
const paint = stratoGas(env)
const img = await env.toImage(paint)
document.body.appendChild(img)
env.dispose()
```

---

## Public API boundary

### Exported

- `createEnvironment` + `Environment`, `EnvironmentConfig` types
- Geometry constructors: `band`, `disc`, `fullSphere`, `region`
- Grid constructors: `chordGrid`, `rayGrid`
- Distribution: `distribute`
- All geometry types: `Partition`, `Band`, `Disc`, `Region`, `Grid`, `Guide`, `Mark`, `Plot`, `SelectionCriterion`, `PositionBias`
- All renderers: `spot`, `blot`, `crater`, `mandorla`, `irregularStar`, `belt`, `gradientBelt`, `stroke`, `baseSphere`, `solidFill`, `gradientFill`
- All effects: `waveWarp`, `twistWarp`, `bulgeWarp`, `rampWarp`, `gradientMask`, `radialGradientMask`, `gradientCut`, `radialGradientCut`, `correctionBlur`, `antiAliasMask`, `fitSphere`
- All lighting: `baseShadow`, `shadow`, `spotlight`, `lightEdge`, `rimLight`
- Compositing: `merge`, `mergeCut`, `mergeMask`, `collector`
- Types: `Paint` (opaque), `BlendMode`, `Collector`

### Internal (not exported)

- `CanvasPool`, pool internals
- `PaintInternal`, `unwrap()`, `consume()`, `createPaint()`
- Raw canvas operations (`getImageData`, `putImageData`, `drawImage`)
- Pixel manipulation (bilinear sampling, convolution kernels)
- DOM operations (`document.createElement('canvas')`)

---

## Topo dependency

The engine imports **Topo** for math primitives: point/vector types, chord computation (center + radius + angle → two endpoints), ray-circle intersection, and interpolation. The engine's geometry layer (`grid.ts`, `guide.ts`) calls Topo; model authors don't interact with Topo directly.

---

## Resolved open questions

| Question | Decision |
|----------|----------|
| Paint opacity (brief §Open questions #1) | **Fully opaque.** Only `width`/`height` readable. No escape hatch. |
| Effect locality (brief §Open questions #2) | **Code position.** Apply before merge = local, apply after merge = global. No special concept needed. |
| Conditional branching (brief §Open questions #3) | Plain `if`/`else` on scalars from `env.random`. No dedicated concept. |
| Sphere as context vs parameter (geometry §Open questions #1) | Sphere lives in `Environment`. Geometry functions receive `env` and read `env.radius`. |
| Guide annotation schema (geometry §Open questions #2) | **Fixed structure**: `{ index, densityHint, sizeHint, length }`. Structured for interchangeability; extensible later if needed. |
| Guide curvature (geometry §Open questions #3) | **Interpolation is a function** on the Guide interface, not a lerp assumption. Allows future curved guides without contract changes. |
