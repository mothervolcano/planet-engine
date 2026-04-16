import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { band } from "../geometry/partition";
import { distribute } from "../geometry/distribution";
import { blot } from "../renderers/mark/blot";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { merge } from "../compositing/merge";
import { collector } from "../compositing/collector";
import { solidFill } from "../renderers";
import { sphereWarp } from "../effects";

export type ProbabilisticBias = "any" | "lo" | "hi" | "mid";

export function probabilisticFilter(env: Environment, bias: ProbabilisticBias): Paint {
  let result = solidFill(env, band(-90, 90), { color: "#09337E" });

  const partition = band(-90, 90);

  const plot = distribute(env, partition, {
    mode: "poisson",
    minSpacing: 0.12,
    margins: [0.05, 0.95],
    sizeRange: [0.03, 0.08],
  });

  const filtered = plot.filter(
    { kind: "probabilistic", probability: 1, bias },
    env.random,
  );

  const markAcc = collector(env, { blendMode: "screen" });
  for (const m of filtered.marks) {
    markAcc.add(blot(env, m, { color: "rgba(160, 200, 255, 0.7)" }));
  }

  result = merge(env, result, markAcc.result());
  result = sphereWarp(env, result, {strength: 0.5});
  result = antiAliasMask(env, result);

  return result;
}
