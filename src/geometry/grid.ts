import { point, fromPolar } from "@mothervolcano/topo";

import type { Environment } from "../core/environment";
import type { Partition } from "./partition";
import { resolvePartition } from "./partition";
import type { Guide } from "./guide";
import { createChordGuide, createRayGuide } from "./guide";

export interface Grid {
  readonly guides: readonly Guide[];
  readonly partition: Partition;
}

export interface ChordGridParams {
  count: number;
  jitter?: number;
}

export interface RayGridParams {
  count: number;
  jitter?: number;
}

const DEG_TO_RAD = Math.PI / 180;
const EPSILON = 0.01;

export function chordGrid(
  env: Environment,
  partition: Partition,
  params: ChordGridParams,
): Grid {
  const { count, jitter = 0 } = params;
  const { radius, center } = env;

  const guides: Guide[] = [];
  let maxLength = 0;

  const rawGuides: Array<{ start: ReturnType<typeof point>; end: ReturnType<typeof point>; length: number; angle: number }> = [];

  if (partition.kind === "disc") {
    const dc = partition.center;
    const dr = partition.radius;

    const yTop = dc.y - dr;
    const yBot = dc.y + dr;
    const ySpacing = (yBot - yTop) / (count + 1);

    for (let i = 0; i < count; i++) {
      let y = yTop + ySpacing * (i + 1);

      if (jitter > 0) {
        y += jitter * ySpacing * env.random.uniform(-0.5, 0.5);
        y = Math.max(yTop + EPSILON, Math.min(yBot - EPSILON, y));
      }

      // Half-chord within the disc
      const dyDisc = y - dc.y;
      const halfDisc = Math.sqrt(dr * dr - dyDisc * dyDisc);

      // Half-chord within the planet circle
      const dyPlanet = y - center.y;
      const halfPlanetSq = radius * radius - dyPlanet * dyPlanet;
      if (halfPlanetSq < EPSILON) continue;
      const halfPlanet = Math.sqrt(halfPlanetSq);

      // Intersect disc and planet circle
      const xLeft = Math.max(dc.x - halfDisc, center.x - halfPlanet);
      const xRight = Math.min(dc.x + halfDisc, center.x + halfPlanet);

      const chordLength = xRight - xLeft;
      if (chordLength < EPSILON) continue;

      if (chordLength > maxLength) maxLength = chordLength;

      const angle = Math.asin(dyPlanet / radius) / DEG_TO_RAD;

      rawGuides.push({
        start: point(xLeft, y),
        end: point(xRight, y),
        length: chordLength,
        angle,
      });
    }
  } else {
    const angleStart = partition.angleStart;
    const angleEnd = partition.angleEnd;
    const angleRange = angleEnd - angleStart;
    const spacing = angleRange / (count + 1);

    for (let i = 0; i < count; i++) {
      let angle = angleStart + spacing * (i + 1);

      if (jitter > 0) {
        angle += jitter * spacing * env.random.uniform(-0.5, 0.5);
        angle = Math.max(angleStart + EPSILON, Math.min(angleEnd - EPSILON, angle));
      }

      const rad = angle * DEG_TO_RAD;
      const y = center.y + radius * Math.sin(rad);
      const halfChord = radius * Math.cos(rad);

      if (halfChord < EPSILON) continue;

      const chordLength = halfChord * 2;
      if (chordLength > maxLength) maxLength = chordLength;

      rawGuides.push({
        start: point(center.x - halfChord, y),
        end: point(center.x + halfChord, y),
        length: chordLength,
        angle,
      });
    }
  }

  // Second pass: create annotated guides
  const diameter = radius * 2;
  for (let i = 0; i < rawGuides.length; i++) {
    const g = rawGuides[i]!;
    const hint = maxLength > 0 ? g.length / diameter : 0;
    guides.push(
      createChordGuide(g.start, g.end, {
        index: i,
        densityHint: hint,
        sizeHint: hint,
        length: g.length,
        angle: g.angle,
      }),
    );
  }

  return { guides, partition: resolvePartition(center, radius, partition) };
}

export function rayGrid(
  env: Environment,
  partition: Partition,
  params: RayGridParams,
): Grid {
  const { count, jitter = 0 } = params;
  const { radius, center } = env;

  // Grid center: use partition center for disc, sphere center for band
  const gridCenter =
    partition.kind === "disc" ? partition.center : center;

  const angleSpacing = 360 / count;
  const guides: Guide[] = [];
  let maxLength = 0;

  const rawGuides: Array<{ start: ReturnType<typeof point>; end: ReturnType<typeof point>; length: number }> = [];

  for (let i = 0; i < count; i++) {
    let angleDeg = angleSpacing * i;

    if (jitter > 0) {
      angleDeg += jitter * angleSpacing * env.random.uniform(-0.5, 0.5);
    }

    const angleRad = angleDeg * DEG_TO_RAD;

    // Ray-circle intersection: find where ray from gridCenter at angleRad hits sphere circumference
    const endPoint = raySphereIntersection(gridCenter, angleRad, center, radius);
    if (!endPoint) continue;

    const len = gridCenter.distance(endPoint);
    if (len < EPSILON) continue;

    if (len > maxLength) maxLength = len;

    rawGuides.push({
      start: gridCenter,
      end: endPoint,
      length: len,
    });
  }

  for (let i = 0; i < rawGuides.length; i++) {
    const g = rawGuides[i]!;
    const hint = maxLength > 0 ? g.length / maxLength : 0;
    guides.push(
      createRayGuide(g.start, g.end, {
        index: i,
        densityHint: hint,
        sizeHint: hint,
        length: g.length,
      }),
    );
  }

  return { guides, partition: resolvePartition(center, radius, partition) };
}

/**
 * Computes the intersection of a ray from origin in direction angleRad
 * with a circle at sphereCenter with sphereRadius.
 * Returns the forward intersection point, or null if none.
 */
function raySphereIntersection(
  origin: { readonly x: number; readonly y: number },
  angleRad: number,
  sphereCenter: { readonly x: number; readonly y: number },
  sphereRadius: number,
): ReturnType<typeof point> | null {
  const dir = fromPolar(1, angleRad);
  const fx = origin.x - sphereCenter.x;
  const fy = origin.y - sphereCenter.y;

  const a = dir.x * dir.x + dir.y * dir.y;
  const b = 2 * (fx * dir.x + fy * dir.y);
  const c = fx * fx + fy * fy - sphereRadius * sphereRadius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  // Take the positive root furthest from origin (ray goes outward)
  const t = t2 > EPSILON ? t2 : t1 > EPSILON ? t1 : null;
  if (t === null) return null;

  return point(origin.x + dir.x * t, origin.y + dir.y * t);
}
