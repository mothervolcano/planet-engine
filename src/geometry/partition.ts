/**
 * Spatial partitions on a sphere.
 *
 * A `Partition` defines a region of the planet's surface where rendering
 * operations (fills, belts, scatter marks, grids) are confined. Two shapes
 * are supported:
 *
 * - **Band** — a horizontal latitude stripe defined by angular range
 *   (degrees, –90 to 90). Resolved against a concrete sphere to produce
 *   absolute y-coordinates.
 * - **Disc** — a circular area defined by center point and radius.
 *
 * Partitions are declarative: they carry only angular/geometric parameters
 * until `resolveBand` / `resolvePartition` projects them onto a sphere of
 * known center and radius.
 */

import type { Point } from "../core/types";

/**
 * Horizontal latitude stripe on the sphere.
 *
 * `angleStart` and `angleEnd` are in degrees (–90 = south pole, 90 = north
 * pole). Before rendering, call `resolveBand` to project the angles into
 * absolute pixel y-coordinates (`yStart`, `yEnd`).
 */
export type Band = {
  readonly kind: "band";
  readonly angleStart: number;
  readonly angleEnd: number;
  readonly yStart?: number;
  readonly yEnd?: number;
};

/** Circular region defined by a center point and radius (in pixels). */
export type Disc = {
  readonly kind: "disc";
  readonly center: Point;
  readonly radius: number;
};

/** Discriminated union of all partition shapes. */
export type Partition = Band | Disc;

/** Create an unresolved latitude band from angular bounds (degrees). */
export function band(angleStart: number, angleEnd: number): Band {
  return { kind: "band", angleStart, angleEnd };
}

/** Create a disc partition from a center point and pixel radius. */
export function disc(center: Point, radius: number): Disc {
  return { kind: "disc", center, radius };
}

/** Shorthand for a band spanning the entire sphere (–90° to 90°). */
export function fullSphere(): Band {
  return band(-90, 90);
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Project a band's angular bounds onto a sphere, producing absolute
 * y-coordinates (`yStart`, `yEnd`) for rendering.
 */
export function resolveBand(
  center: { readonly y: number },
  radius: number,
  b: Band,
): Band {
  return {
    kind: "band",
    angleStart: b.angleStart,
    angleEnd: b.angleEnd,
    yStart: center.y + radius * Math.sin(b.angleStart * DEG_TO_RAD),
    yEnd: center.y + radius * Math.sin(b.angleEnd * DEG_TO_RAD),
  };
}

/**
 * Resolve any partition against a sphere. Bands are projected to absolute
 * y-coordinates; discs are returned as-is (already in pixel space).
 */
export function resolvePartition(
  center: { readonly y: number },
  radius: number,
  partition: Partition,
): Partition {
  if (partition.kind === "disc") return partition;
  return resolveBand(center, radius, partition);
}
