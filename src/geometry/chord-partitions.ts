import type { Environment } from "../core/environment";
import type { Grid } from "./grid";
import type { Band } from "./partition";
import type { Region } from "./region";
import { band, resolveBand } from "./partition";
import { createRegion } from "./region";

export function chordPartitions(env: Environment, grid: Grid): Region {
  const parent = grid.partition;

  if (parent.kind !== "band") {
    throw new Error("chordPartitions requires a Band partition");
  }

  const angles: number[] = grid.guides.map((g) => {
    const a = g.annotations.angle;
    if (a === undefined) {
      throw new Error("chordPartitions requires guides with angle annotations");
    }
    return a;
  });

  angles.sort((a, b) => a - b);

  const boundaries = [parent.angleStart, ...angles, parent.angleEnd];
  const partitions: Band[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    partitions.push(resolveBand(env.center, env.radius, band(boundaries[i]!, boundaries[i + 1]!)));
  }

  return createRegion(partitions);
}
