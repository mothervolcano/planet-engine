import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { band, disc } from "../geometry/partition";
import { distribute } from "../geometry/distribution";
import { blot } from "../renderers/mark/blot";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { merge } from "../compositing/merge";
import { collector } from "../compositing/collector";
import { solidFill } from "../renderers";

export type PartitionType = "band" | "disc";

export function partitionMarks(env: Environment, partitionType: PartitionType): Paint {
  let result = solidFill(env, band(-90, 90), { color: "#09337E" });

  const partition =
    partitionType === "band"
      ? band(-90, 90)
      : disc(env.center, env.radius * 0.6);

  const plot = distribute(env, partition, {
    density: 100,
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
