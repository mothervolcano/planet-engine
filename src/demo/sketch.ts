import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import type { ColorSchema } from "../core/color-schema";
import { band } from "../geometry/partition";
import { chordGrid } from "../geometry/grid";
import { chordPartitions } from "../geometry/chord-partitions";
import { baseSphere } from "../renderers/partition/base-sphere";
import { belt } from "../renderers/partition/belt";
import { shadow } from "../lighting/shadow";
import { rimLight } from "../lighting/rim-light";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { fitSphere } from "../effects/post/fit-sphere";
import { merge } from "../compositing/merge";
import { collector } from "../compositing/collector";
import { correctionBlur, sphereWarp } from "../effects";
import { stroke } from "../renderers";
import { colorRange, shade } from "../core/color";

export function sketch(env: Environment, schema: ColorSchema): Paint {
  const { random } = env;

  const palette = colorRange(schema.base, shade(schema.base, 0.5), 5);

  // ── Base layer ──
  let result = baseSphere(env, { baseColor: schema.base, shadowColor: schema.nightside });

  const bandsGrid = chordGrid(env, band(-90, 90), { count: 6, jitter: 0.5 });

  const lines1Grid = chordGrid(env, band(15, 60), { count: 5, jitter: 0.3 });

  const bands = chordPartitions(env, bandsGrid);

  const beltAcc = collector(env);
  for (const p of bands.partitions) {
    let s = belt(env, p, { color: random.pick(palette), fadeExtent: random.uniform(0.1, 0.3) });
    s = correctionBlur(env, s, { amount: random.int(2, 5) });
    beltAcc.add(s);
  }
  let content = beltAcc.result();

  const lines1Acc = collector(env);
  for (const g of lines1Grid.guides) {
    let paint = stroke(env, g, { color: schema.highlight ?? schema.atmosphere, lineWidth: random.int(1, 5) });
    lines1Acc.add(paint);
  }

  content = merge(env, content, lines1Acc.result());

  // ── fitSphere on content only, then composite onto base ──
  content = sphereWarp(env, content, { strength: 0.5 });
  content = fitSphere(env, content);
  result = merge(env, result, content);

  // ── Lighting ──
  result = shadow(env, result, { color: schema.nightside });
  result = rimLight(env, result, { color: schema.atmosphere });
  result = antiAliasMask(env, result);

  return result;
}
