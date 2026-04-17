import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import type { ColorSchema } from "../core/color-schema";
import { band } from "../geometry/partition";
import { chordGrid } from "../geometry/grid";
import { chordPartitions } from "../geometry/chord-partitions";
import { distribute } from "../geometry/distribution";
import { baseSphere } from "../renderers/partition/base-sphere";
import { belt } from "../renderers/partition/belt";
import { twistWarp } from "../effects/warp/twist";
import { shadow } from "../lighting/shadow";
import { rimLight } from "../lighting/rim-light";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { merge } from "../compositing/merge";
import { collector } from "../compositing/collector";
import { mandorla } from "../renderers";
import { correctionBlur, sphereWarp } from "../effects";
import { colorRange, shade, tint } from "../core/color";

export function stratoGas(env: Environment, schema: ColorSchema): Paint {
  const { random } = env;

  const accentColor = schema.palette.length > 0 ? random.pick(schema.palette) : shade(schema.base, 0.5);
  const palette = colorRange(schema.base, accentColor, 5);

  // ── Base layer ──
  let result = baseSphere(env, { baseColor: schema.base, shadowColor: accentColor });

  // ── Belts + storms (content layer, separate from base) ──
  const grid = chordGrid(env, band(-80, 80), { count: random.int(4, 9), jitter: random.uniform(0, 0.5) });
  const bands = chordPartitions(env, grid);

  const beltAcc = collector(env);
  for (const p of bands.partitions) {
    beltAcc.add(belt(env, p, { color: random.pick(palette), fadeExtent: random.uniform(0.1, 0.9) }));
  }
  let content = beltAcc.result();

  const plot = distribute(env, grid, { density: 5, margins: [0.1, 0.9], sizeRange: [0.1, 0.3] });
  const storms = plot.extract({ kind: "probabilistic", probability: 0.3, bias: 'mid' }, random);


  const bigStorm = storms.marks.length > 1 ? storms.extract({kind: 'random', count: 1}, random).marks[0] : undefined;

  const stormAcc = collector(env, { blendMode: "screen" });
  for (const m of storms.marks) {
    let s = mandorla(env, m, { color: tint(accentColor, 0.7) });
    s = correctionBlur(env, s, { amount: 5 });
    stormAcc.add(s);
  }
  content = merge(env, content, stormAcc.result());

  for (const m of storms.marks) {
    const angle = random.uniform(90, 120) * (random.int(0,2) ? 1 : -1)
    // const angle = random.uniform(90, 180)
    twistWarp(env, content, { angle, radius: 2, region: m });
  }

  if (bigStorm) twistWarp(env, content, { angle: random.uniform(180, 500), radius: 2, region: bigStorm });

  // ── fitSphere on content only, then composite onto base ──
  content = sphereWarp(env, content, { strength: 0.70 });
  result = merge(env, result, content);

  // ── Lighting ──
  result = shadow(env, result, { color: 'black' });
  result = rimLight(env, result, { color: schema.atmosphere });
  result = antiAliasMask(env, result);

  return result;
}
