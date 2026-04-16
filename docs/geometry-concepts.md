# Geometry Concepts

## The coordinate space

Everything happens inside a circle. The circle represents a 2D projection of a sphere — a disc that we treat as if it has depth through shading and distortion.

The circle is defined by a single value: **radius**. The center is always at (radius, radius) in canvas space, so the bounding box is a square of side 2×radius with the circle inscribed.

There is no single coordinate system for addressing locations on the disc. Instead, each grid topology defines its own way of parameterizing the space — chord grids use angles from horizontal, ray grids use angles from a center point. What unifies them is the **guide**: regardless of how a grid addresses its geometry, every guide provides a normalized 0→1 interface for positioning along it.

Individual locations on the disc are addressed with **polar coordinates** — an angle and a distance from center. This is the natural system for direct point placement without going through the grid/distribution pipeline.

The final output of the geometry pipeline is always in **pixel coordinates** — positions (x, y) and sizes in pixels, relative to the bounding box origin. This is the rendering coordinate system. The model author works with polar coordinates, partitions, and grid-specific parameters, and the engine resolves those to pixels.

---

## Concept hierarchy

```
Space (the circle)
  └─ Partition (a bounded area — belt or disc)
       └─ Grid (topology + guides, constructed within a partition)
            └─ Guide (a single line, interpolatable 0→1, carrying annotations)
                 └─ Distribution (marking positions along guides)
                      └─ Plot (selectable collection of marks)

Region = selectable collection of Partitions
Plot = selectable collection of Marks
```

**Selection** is a shared interface — both regions and plots support the same filter/extract operations with the same reusable criteria.

---

### Space

#### Sphere

The root. A circle of a given radius. All geometry is relative to a sphere. The sphere defines the coordinate space and the bounding box.

The radius belongs here, not embedded in every grid or guide definition.

---

### Partitions

A partition is a single bounded area within the base circle. It is the primitive spatial unit — it defines "where" before anything else happens. Partitions are inputs to grid construction: you create a partition, then construct a grid within it.

Partitions also serve as general-purpose spatial constraints for any part of the pipeline — renderers, effects, masks, lighting — anywhere something needs to know "stay within this area."

A partition carries no pixel dimensions — it describes a shape relative to the circle, meaningful across different render sizes. The sphere's radius resolves a partition to concrete pixel bounds when needed.

#### Belt

A horizontal strip defined by two angles. 0° is the horizontal diameter (the widest chord). Negative angles define chords in the upper half, positive in the lower.

- A belt from -15° to 15° is a narrow strip around the middle.
- A belt from -60° to 0° covers the upper portion.
- A belt from -90° to 90° is the full circle.

#### Disc

A circular area defined by a center point and a radius. The center can be anywhere within the base circle.

---

### Regions

A region is a selectable collection of **partitions**. It provides the shared selection interface: filter, extract, direct, randomized, probabilistic — the same operations and reusable criteria available on any selectable collection.

A selection from a region produces another region (a subset of partitions with the same interface).

Regions enable working with multiple areas at once. Define 5 belt partitions, collect them into a region, extract 3 at random, feed each to a different grid. Or select the odd-numbered partitions for one renderer and the even-numbered for another.

---

### Grids

A grid is a sequence of guides constructed within a **partition**. The partition provides angular bounds; the grid provides the topology. Any partition type works with any grid type — the grid only reads the partition's angular extent to constrain where it lays guides.

The grid's **center** defaults to the center of the partition and is adjustable relative to it. For a chord grid the center determines the chord geometry. For a ray grid the center is the origin from which rays emanate.

The grid is a first-class creative primitive. Different grid topologies produce fundamentally different visual results. Choosing and parameterizing the grid is the first major authoring decision for a layer.

All grid types share the same contract: they produce an **ordered sequence of guides**. What varies is the geometry that defines those guides.

Because the grid owns the global structure — how many guides, their order, their relative lengths — it has the knowledge to **annotate each guide with per-guide parameters**. These annotations inform the subsequent distribution pass. For example, a chord grid knows which guide is longest (the equator) and which are short (near the poles), so it can tell the distribution step "more marks here, fewer there, larger here, smaller there."

This is the mechanism by which global patterns emerge from a per-guide algorithm. The distribution logic itself can be uniform — "place N marks along this guide" — but the grid modulates N per guide based on its structural knowledge, producing density gradients, size falloff, and other large-scale patterns.

A grid can be consumed in two ways:

- **Via distribution** — marks are scattered along guides, collected into a plot, and fed to renderers that draw discrete features at each mark.
- **Directly by a renderer** — the guide sequence itself is the input. Renderers that draw continuous features (bands, gradients, stripes) consume guides directly, using the space between adjacent guides to define the extent of each feature. No distribution step, no marks, no plot.

#### Chord grid

Produces parallel chord guides within the partition's angular range. Each guide is a chord — a horizontal segment whose length is determined by its angle. 0° is the equator (the full diameter), negative angles produce chords in the upper half, positive angles in the lower. At ±90° the chord degenerates to a point at the pole. Chords near the equator are long; near the poles, short.

The chord grid naturally encodes sphere projection: features distributed on it are denser where chords are longer and sparser where they're short. This produces the banded, stratified look of gas giant atmospheres and horizontal cloud layers.

Parameters: partition, guide count, spacing jitter, center offset (relative to partition center).

Global knowledge available for per-guide annotation: guide index, guide length relative to the longest guide, distance from center guide.

#### Ray grid

Produces radial ray guides within the partition's angular range, emanating from the grid's center. Each guide is a ray — a segment from the center to the base circle's circumference. Every ray extends to the perimeter; its length is determined by where the ray meets the circumference. Rays from a centered origin are all equal length; rays from an off-center origin vary, with shorter rays pointing toward the near edge and longer rays pointing toward the far edge.

Parameters: partition, guide count, spacing jitter, center offset (relative to partition center).

Global knowledge available for per-guide annotation: guide index, angular position, guide length.

#### Other potential topologies

- **Concentric arcs** — guides that curve rather than run straight. Features follow contours.
- **Spiral** — guides that wind outward from a center.

These are noted as possibilities, not commitments. The grid contract (ordered sequence of guides with per-guide annotations) should be general enough to accommodate new topologies without changing the distribution or rendering pipeline.

---

### Guides

A guide is a single line produced by a grid. It is the unit of work for distribution — the thing you distribute marks along.

A guide has two aspects:

- **Geometry** — a segment defined by two endpoints, with a length. Interpolatable from 0 to 1: given a normalized position, the guide resolves it to a pixel coordinate.
- **Annotations** — per-guide parameters provided by the grid that produced it: density hint, size hint, and any other values derived from the grid's global knowledge.

Distribution doesn't need to know what kind of grid produced a guide. It just walks from 0 to 1, placing marks. The guide is the interface contract between grid and distribution.

#### Chord guide

A horizontal segment connecting two points on the circle's circumference, defined by an angle.

**Normalization: 0 = leftmost endpoint, 1 = rightmost endpoint.**

A chord guide's length depends on its angle — longest at 0° (equator), shrinking toward ±90° (poles). Produced by chord grids.

#### Ray guide

A segment from a center point outward to the circle's circumference, defined by an angle from the center.

**Normalization: 0 = center (origin), 1 = periphery (circumference).**

A ray guide's length depends on the center position and the angle — rays from a centered origin are all equal length; rays from an off-center origin vary. Produced by ray grids.

#### The shared contract

Both guide types support the same operations:

- **Interpolate** — given a position (0–1), return a pixel coordinate
- **Length** — the guide's length in pixels
- **Annotations** — the per-guide parameters from the grid

This uniformity is what allows distribution to be topology-agnostic. The same distribution algorithm works on chord guides and ray guides without modification. The visual difference between a chord-grid planet and a ray-grid planet comes entirely from the grid's choice of topology and its per-guide annotations — not from different distribution logic.

---

### Distribution

Distribution is the process of marking positions along each guide of a grid. It takes the grid's sequence of annotated guides and produces a set of **marks** — collected into a **plot**.

The distribution algorithm operates **per guide**. For each guide, it receives:
- The guide geometry (endpoints, length, interpolation)
- Per-guide parameters provided by the grid (density hint, size hint, any global-knowledge annotations)

And produces marks along that guide.

The algorithm itself can be simple: subdivide the guide into N positions with some jitter. The variation in the final result comes from the grid modulating N and other parameters per guide — not from the distribution algorithm being complex.

This separation is the core design: the **grid provides the global shape** (where is dense, where is sparse, where is large, where is small) and the **distribution provides the local texture** (exact positions along each guide, with controlled randomness).

**Margins** are a key distribution parameter. They define the start and end positions (on the 0–1 guide range) within which marks are placed. Margins of 0.0 to 1.0 use the full guide. Margins of 0.2 to 0.8 concentrate marks in the central 60%. On a ray guide, margins of 0.5 to 1.0 place features only in the outer half — achieving a "disc radius" constraint without truncating the ray geometry.

Distribution parameters: density (marks per guide, as modulated by the grid), margins (start/end positions on the 0–1 range), position jitter, size range.

---

### Marks

A mark is a single positioned location on a guide. It carries:

- **Position** — (x, y) in pixel space, resolved from the guide geometry and the normalized position along the guide
- **Size** — a scalar, determined by the grid's size annotation and the distribution's size logic

A mark is the atomic unit of placement. It says "here, this big" — nothing more. What gets drawn at a mark is entirely up to the renderer that receives it.

---

### Selection (shared interface)

Selection is a shared capability for any ordered collection in the engine. Plots (mark collections) and regions (partition collections) support the same selection operations with the same reusable criteria.

A selection from a collection produces another collection of the same type — a subset with the same interface.

#### Selection modes

**Filter** — non-destructive. The source collection is unchanged. The selection is an independent view. The same element can appear in multiple filtered selections. This is the default mode.

**Extract** — destructive. Selected elements are removed from the source collection. Subsequent operations on the source only see what remains. Use extract to partition a collection into non-overlapping groups: "extract 30% for one purpose, then extract half the remainder for another, the rest for a third."

#### Selection criteria

Selection criteria are reusable — they describe *how* to pick elements, not *which specific elements*. The same criterion can be applied to any selectable collection, regardless of what it contains.

Types of criteria:
- **Direct** — by index, by position range, by guide
- **Filtered** — by size range, by position on the 0–1 guide range, by spatial area
- **Randomized** — pick N elements at random
- **Probabilistic** — each element has a probability of inclusion, optionally biased by position (favor center, favor edges, favor a specific guide range)

These are designed as a shared, reusable interface applicable to any selectable collection.

---

### Plot

A plot is a selectable collection of **marks** produced by a distribution pass. It is the **compositional playground** — all the positions that could be occupied, without any assignment to purpose. Like a chess board: all the squares are there, but no pieces are placed yet.

A plot does not decide what marks are used for. Instead, the model author uses the selection interface to choose subsets and wire them to different renderers. One selection feeds craters, another feeds clouds, another feeds whirl shapes. Each selection is itself a plot.

---

## The pipeline

```
1. PARTITION(S)     Define one or more partitions (belts, discs)
                    Optionally collect into a region for selection
                        ↓
2. GRID             Construct a grid within a partition
                    The grid produces a sequence of annotated guides
                        ↓
              ┌─────────┴─────────┐
              ↓                   ↓
3a. DISTRIBUTION            3b. DIRECT TO RENDERER
    Walk each guide,             For continuous features (bands,
    placing marks                gradients, stripes) the renderer
              ↓                  consumes guides directly —
4.  PLOT                         no marks, no plot
    The full mark collection
              ↓
5.  SELECTION(S)
    Filter or extract subsets
              ↓
6.  RENDERER(S)
    Each selection wired to a renderer
```

Each layer in a model runs this pipeline independently. Layer 1 might use a chord grid in a wide belt, selecting different mark subsets for different features. Layer 2 might use an off-center ray grid in a disc, feeding guides directly to a band renderer. The visual complexity of the final planet comes from the interaction between layers built on different geometric foundations.



