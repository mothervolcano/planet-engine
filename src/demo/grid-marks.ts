import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { band } from "../geometry/partition";
import { chordGrid, rayGrid } from "../geometry/grid";
import { distribute } from "../geometry/distribution";
import { blot } from "../renderers/mark/blot";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { merge } from "../compositing/merge";
import { collector } from "../compositing/collector";
import { solidFill } from "../renderers";

export type GridType = "chord" | "ray";

export function gridMarks(env: Environment, gridType: GridType): Paint {
  let result = solidFill(env, band(-90, 90), { color: "#09337E" });

  const partition = band(-90, 90);
  const grid =
    gridType === "chord"
      ? chordGrid(env, partition, { count: 8, jitter: 0.1 })
      : rayGrid(env, partition, { count: 12, jitter: 0.5 });

  const plot = distribute(env, grid, {
    density: 6,
    margins: [0.05, 0.95],
    sizeRange: [0.03, 0.09],
  });

  const markAcc = collector(env, { blendMode: "screen" });
  for (const m of plot.marks) {
    markAcc.add(blot(env, m, { color: "rgba(160, 200, 255, 0.7)" }));
  }

  result = merge(env, result, markAcc.result());
  result = antiAliasMask(env, result);

  return result;
}
