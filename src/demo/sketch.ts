import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import type { ColorSchema } from "../core/color-schema";
import { band, disc } from "../geometry/partition";
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
import { correctionBlur, sphereWarp, twistWarp, waveWarp } from "../effects";
import { stroke } from "../renderers";
import { colorRange, shade } from "../core/color";
import { mark } from "../geometry/mark";

export function sketch(env: Environment, schema: ColorSchema): Paint {
  const { random, radius } = env;

  const palette = colorRange(schema.base, shade(schema.base, 0.5), 5);

  // ── Base layer ──
  let result = baseSphere(env, { baseColor: schema.base, shadowColor: schema.nightside });

  const bandsGrid = chordGrid(env, band(-60, 90), { count: 6, jitter: 0.5 });

  const featPos = random.pick(bandsGrid.guides).interpolate(0.4)

  const lines1Grid = chordGrid(env, band(15, 60), { count: 5, jitter: 0.3 });
  const lines2Grid = chordGrid(env, disc(featPos, radius * 0.3), {count: 10, jitter: 0.3})

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
    paint = waveWarp(env, paint, {amplitude: random.uniform(0.05, 0.2), frequency: random.uniform(1, 3)});
    lines1Acc.add(paint);
  }

  const stormPos = random.pick(lines1Grid.guides).interpolate(random.uniform(0, 1));
  const stormMark = mark(stormPos.x, stormPos.y, random.uniform(0.3, 0.5));

  let lines = lines1Acc.result();
//   lines1 = correctionBlur(env, lines1, { amount: 2 })
  lines = twistWarp(env, lines, {angle: 400, radius: 2, region: stormMark});
  //   lines1 = waveWarp(env, lines1, {amplitude: 0.2, frequency: 2});
  
  content = merge(env, content, lines);
  
  //--------------------
  
  const lines2Acc = collector(env);
  for (const g of lines2Grid.guides) {
      let paint = stroke(env, g, {color: schema.highlight ?? schema.atmosphere, lineWidth: random.int(1, 5)});
      lines2Acc.add(paint);
    }
    
    const stormMark2 = mark(featPos.x, featPos.y, random.uniform(0.3, 0.5));
    
    lines = lines2Acc.result();
    lines = correctionBlur(env, lines, {amount: 1})
    lines = twistWarp(env, lines, {angle: 400, radius: 2, region: stormMark2});
    lines = waveWarp(env, lines, {amplitude: random.uniform(0.05, 0.1), frequency: random.uniform(1, 3)});

content = merge(env, content, lines);

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
