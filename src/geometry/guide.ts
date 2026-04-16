import type { Point } from "../core/types";

export interface GuideAnnotations {
  readonly index: number;
  readonly densityHint: number;
  readonly sizeHint: number;
  readonly length: number;
  readonly angle?: number;
}

export interface Guide {
  readonly kind: "chord" | "ray";
  readonly start: Point;
  readonly end: Point;
  readonly annotations: GuideAnnotations;
  interpolate(t: number): Point;
}

export function createChordGuide(
  start: Point,
  end: Point,
  annotations: GuideAnnotations,
): Guide {
  return {
    kind: "chord",
    start,
    end,
    annotations,
    interpolate(t: number): Point {
      return start.lerp(end, t);
    },
  };
}

export function createRayGuide(
  start: Point,
  end: Point,
  annotations: GuideAnnotations,
): Guide {
  return {
    kind: "ray",
    start,
    end,
    annotations,
    interpolate(t: number): Point {
      return start.lerp(end, t);
    },
  };
}
