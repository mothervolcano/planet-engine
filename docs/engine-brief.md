# Procedural Planet Engine — Design Brief

## What this is

A procedural 2D planet rendering engine built on the HTML Canvas 2D API. It produces illustrated planet visuals by compositing layers of shapes, effects, and lighting onto a circle treated as a sphere projection.

The engine separates **primitives** (rendering operations) from **models** (creative compositions that wire primitives together). Model authoring follows a paint-flow interaction model: modules are functions with typed inputs and outputs, wiring is variable binding, and the compositing pipeline is handled by the environment — invisible to the model author.

The engine's geometry domain concepts — partitions, grids, guides, marks, plots, regions, distribution, selection — are part of this engine. The underlying mathematical primitives (points, vectors, angles, interpolation) and geometric calculations (chord computation, ray casting, circle intersection) are provided by an external library called **Topo**.

## Authoring model

Models are code-based, not visual. A model file reads as paint flow — you can trace what connects to what by following the variables.

- **Modules** are functions with typed inputs and outputs. A module call looks like a function call because it is one.
- **Wiring** is variable assignment. The output of one module feeds into the input of another by binding it to a name.
- **Evaluation** is eager — modules execute in the order they appear in code. No deferred evaluation, no dependency resolution. The code order is the evaluation order.
- **Composition** is functions. A reusable sub-patch (e.g., "strato bands") is a function that takes paints and returns paints. Functions compose naturally. No special abstraction needed.
- **Iteration** is explicit. The model author writes loops. Each iteration produces a paint. Paints accumulate into a collector that merges them with a specified blend mode.

## Geometry

The engine's geometry layer defines the domain concepts for spatial organization on the sphere. It uses **Topo** for the underlying math (points, vectors, chord computation, interpolation) but owns the higher-level concepts. See the Geometry Concepts document for full details.

### Coordinate space

Everything happens inside a circle of a given **radius**. Locations are addressed with **polar coordinates** (angle + distance from center). The geometry pipeline resolves these to pixel coordinates for rendering.

### Concepts

**Partition** — a bounded area within the circle. Two types: **band** (horizontal strip defined by two angles) and **disc** (circular area defined by a center point and radius). Partitions define where things happen.

**Region** — a selectable collection of partitions. Supports filter (non-destructive) and extract (destructive) selection with reusable criteria.

**Grid** — a sequence of guides constructed within a partition. The partition provides angular bounds; the grid provides the topology. Two types: **chord grid** (parallel horizontal guides) and **ray grid** (radial guides from a center point). The grid annotates each guide with per-guide parameters (density hint, size hint) derived from its global structural knowledge.

**Guide** — a single line produced by a grid. Interpolatable from 0 to 1. Chord guides: 0 = left, 1 = right. Ray guides: 0 = center, 1 = circumference. The guide is the interface between grid and distribution — distribution doesn't need to know the topology.

**Distribution** — the process of marking positions along guides. Operates per guide. Produces marks collected into a plot. Key parameter: **margins** (start/end on the 0–1 guide range) controlling the effective extent.

**Mark** — a positioned + sized location (x, y, size). The atomic unit of placement.

**Plot** — a selectable collection of marks. The compositional playground. Selection tools (filter/extract with reusable criteria) let the model author choose subsets to wire to different renderers.

**Selection** — a shared interface for any ordered collection (plots, regions). Two modes: **filter** (non-destructive, overlapping views) and **extract** (destructive, partitioning). Criteria types: direct, filtered, randomized, probabilistic.

### Geometry pipeline

```
Partition → Grid → Guides → Distribution → Plot → Selection(s) → Renderer(s)
                      ↓
                 Direct to guide/partition renderers (for continuous features)
```

## Rendering primitives

The engine provides three categories of renderer, matching the three geometry outputs they consume.

### Mark renderers

Draw discrete features at individual marks. Consume plots (or selections from plots). Each mark becomes one rendered feature.

**Spot** — filled circle. Optionally faded with a gradient mask.

**Blot** — filled circle with radial gradient fade. Soft, cloud-like.

**Crater** — filled circle with an offset radial cut, leaving a crescent rim. Simulates a crater lit from one side.

**Mandorla** — almond/vesica piscis shape between two points. Drawn with quadratic Bezier curves.

**Irregular star** — star polygon with randomized outer point lengths. Spiky, organic.

These are the initial set. The mark renderer interface (takes a mark + style parameters, produces a paint) is open to new shapes.

### Guide renderers

Draw continuous features along or between guides. Consume guide sequences directly from the grid. No distribution, no marks, no plot.

**Belt** — horizontal color stripe with soft top/bottom edges. Drawn as a vertical gradient that fades in, holds solid, and fades out. The space between adjacent guides defines the belt's vertical extent.

**Gradient belt** — horizontal stripe with arbitrary color stops. Multi-color atmospheric layers.

**Stroke** — a stroked line along a guide. Configurable thickness, opacity, and blur.

### Partition renderers

Draw features that fill a partition's area. Consume partitions directly.

**Base sphere** — fills the partition with a gradient from a base color to a shadow color. The foundation layer of every planet.

**Solid fill** — fills the partition with a single color.

**Gradient fill** — fills the partition with a linear or radial gradient.

## Effects

Effects transform paints — they take rendered output and modify it. Effects are modules: paint in, paint out.

### Pixel warp effects

Displace pixels to simulate organic distortion and sphere curvature.

**Wave warp** — sinusoidal displacement. Horizontal mode shifts rows; vertical mode shifts columns. Creates wavy, turbulent textures.

**Twist warp** — rotates pixels around a center point with strength that falls off with distance (cosine⁴ easing). Simulates vortex/storm features.

**Bulge warp** — pushes pixels outward from a center point. Creates dome/lump effects for surface irregularities.

**Ramp warp** — compresses pixels linearly across one axis. Simulates perspective foreshortening — a band tapers from full height on one side to compressed on the other, as if wrapping around the sphere.

### Masking effects

Control visibility by retaining or erasing pixels based on gradient patterns.

**Gradient mask** — linear opacity gradient. Keeps existing pixels where the gradient is opaque. Fades features at their edges.

**Radial gradient mask** — radial opacity gradient. Keeps center and fades edges (or vice versa).

**Gradient cut** — linear gradient erase. Removes pixels progressively. Used for shadow falloff and directional fading.

**Radial gradient cut** — radial gradient erase. The primary tool for crescent shapes, spotlight carving, and shadow terminator effects.

### Post-processing effects

**Correction blur** — Gaussian blur applied during compositing to smooth seams between layers.

**Anti-alias mask** — clips the canvas to a circle 1px inside the radius. Cleans up stray pixels at the sphere's edge.

**Fit sphere** — combines a radial mask and a radial cut to make features look like they wrap around the sphere rather than sitting flat on a disc.

## Lighting

Lighting modules simulate illumination on the sphere. They operate on the composited result after features are rendered. Lighting is a specialized set of effects — paint in, paint out — but semantically distinct because it's about the planet's relationship to light, not about feature shaping.

**Base shadow** — left-to-right gradient from base color to darkened color. The initial lit-sphere appearance.

**Shadow** — terminator shadow. Draws a dark sphere, carves it with a radial cut from an offset position, composites with multiply blending.

**Spotlight** — small bright region simulating specular highlight. A sphere carved down to a small area in the lit quadrant.

**Light edge** — thin bright crescent on the illuminated limb.

**Rim light** — bright ring at the planet's edge simulating atmospheric scattering. A radial gradient from dark center to bright edge, carved on one side and rotated for asymmetry.

## Compositing

Compositing is how paints are combined. The model author should never manage canvas contexts directly — compositing is handled by the environment through module outputs.

**Merge** — draw one canvas onto another. The primary compositing operation. Supports blend modes: source-over (default), screen, multiply, hard-light, etc.

**Merge cut** — erase pixels from one canvas where another has content (destination-out).

**Merge mask** — keep pixels from one canvas only where another has content (destination-in).

**Collector** — accumulates multiple paints with a specified blend mode. Used in iteration: each pass produces a paint, the collector merges them progressively.

## Environment

The environment is the invisible runtime that manages everything the model author shouldn't think about.

**Canvas pool** — when a module needs a scratch surface, the environment provides one. When a paint is consumed and no longer referenced, its canvas returns to the pool.

**Seeded randomization** — all random values draw from a single seeded PRNG owned by the environment. Same seed + same model topology = same planet. Reproducible renders.

**Output** — the environment takes the final paint and handles export (to image, to blob, to DOM element).

The environment is passed into the model, not global. Different renders can use different seeds, different pool sizes, different output targets.

## What this brief does NOT cover

- Implementation details, API surface, or code architecture
- Visual patching / graph editor — this is code-based, like csound
- Performance optimizations (OffscreenCanvas, workers) — possible later, not a design driver now
- Parameterized lighting (light source angle/direction) — a feature to consider, not a core concept
- Framework integration specifics — the engine should be framework-agnostic
- Topo library internals — the engine uses Topo for math primitives, not the other way around

## Open questions

1. **Paint opacity** — should paints be fully opaque (model code never sees pixel data) or semi-transparent (model code can inspect dimensions, apply raw canvas operations as an escape hatch)?

2. **Effect locality** — some effects apply to a single rendered element before merging (local), others apply to the accumulated layer after merging (global). How should the patching model express this distinction? Is it just "apply the effect before or after the merge call"?

3. **Conditional branching** — models may use random gates to choose between different topologies. Is this just an if/else on a scalar, or does it need a dedicated concept?
