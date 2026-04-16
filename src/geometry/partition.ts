import type { Point } from "../core/types";

export type Band = {
  readonly kind: "band";
  readonly angleStart: number;
  readonly angleEnd: number;
  readonly yStart?: number;
  readonly yEnd?: number;
};

export type Disc = {
  readonly kind: "disc";
  readonly center: Point;
  readonly radius: number;
};

export type Partition = Band | Disc;

export function band(angleStart: number, angleEnd: number): Band {
  return { kind: "band", angleStart, angleEnd };
}

export function disc(center: Point, radius: number): Disc {
  return { kind: "disc", center, radius };
}

export function fullSphere(): Band {
  return band(-90, 90);
}

const DEG_TO_RAD = Math.PI / 180;

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

export function resolvePartition(
  center: { readonly y: number },
  radius: number,
  partition: Partition,
): Partition {
  if (partition.kind === "disc") return partition;
  return resolveBand(center, radius, partition);
}
