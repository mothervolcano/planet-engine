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
import { mark, type Mark } from "../geometry/mark";
import { mandorla, stroke } from "../renderers";
import { correctionBlur, sphereWarp } from "../effects";
import { colorRange, shade, tint } from "../core/color";
import { displaceMerge } from "../compositing";

export function striatedGas(env: Environment, schema: ColorSchema): Paint {
    const { random } = env;

    const accentColor = schema.palette.length > 0 ? random.pick(schema.palette) : shade(schema.base, 0.5);
    const altColor = schema.palette.length > 0 ? random.pick(schema.palette) : shade(schema.base, 0.5);
    const palette = colorRange(schema.base, altColor, 5);

    // ── Base layer ──
    let result = baseSphere(env, { baseColor: schema.base, shadowColor: schema.nightside });

    // --------------------------------------------------
    // Layer 1: base belts
   
    const baseGrid = chordGrid(env, band(-80, 80), { count: random.int(4, 9), jitter: random.uniform(0, 0.5) });
    const baseBands = chordPartitions(env, baseGrid);

    const baseBeltAcc = collector(env);
    for (const p of baseBands.partitions) {
      baseBeltAcc.add(belt(env, p, { color: random.pick(palette), fadeExtent: random.uniform(0.1, 0.9) }));
    }
    let content = baseBeltAcc.result();

    // --------------------------------------------------
    // Layer 2: focal belt

    const focalBeltGrid = chordGrid(env, band(-40, 40), { count: random.int(2, 9), jitter: 0 });
    const focalBandOptions = chordPartitions(env, focalBeltGrid);
    const focalBand = random.pick(focalBandOptions.partitions);

    let focalBelt = belt(env, focalBand, { color: accentColor, fadeExtent: 0.1 });
    focalBelt = correctionBlur(env, focalBelt, { amount: 5 });
    content = merge(env, content, focalBelt);

    // --------------------------------------------------
    // Layer 2.1: focal belt cutout

    const cutoutLineGrid = chordGrid(env, focalBand, { count: random.int(5, 15), jitter: 0 });
    const cutoutLinesAcc = collector(env);
    for (const g of cutoutLineGrid.guides) {
      let line = stroke(env, g, { lineWidth: random.uniform(2,4), color: 'tomato'});
      line = correctionBlur(env, line, { amount: random.uniform(1, 5) });
      cutoutLinesAcc.add(line);
    }
    const cutoutLines = cutoutLinesAcc.result();
    content = merge(env, content, cutoutLines, {blendMode: 'cutout'});

    // --------------------------------------------------
    // Layer 3: cloud lines

    const cloudLineGrid = chordGrid(env, band(random.int(-70, -10), random.int(10, 70)), { count: random.int(5, 15), jitter: 0.5 });
    const cloudLineAcc = collector(env);
    const twistEffects: Array<{ region: Mark; angle: number; radius: number }> = [];

    const twistChance = 5 / cloudLineGrid.guides.length;

    for (const g of cloudLineGrid.guides) {
      let line = stroke(env, g, { lineWidth: random.uniform(1,3), color: tint(accentColor, 0.7) });
      line = correctionBlur(env, line, { amount: random.uniform(2, 5) });

      if (!random.chance(twistChance)) {
        cloudLineAcc.add(line);
        continue;
      }

      // Determine 2-3 twist positions spaced along the line
      const twistCount = random.int(2, 3);
      const placements: number[] = [];
      const tRadii: number[] = [];

      for (let i = 0; i < twistCount; i++) {
        const markSize = random.uniform(0.05, 0.12);
        const twistRadiusFrac = random.uniform(0.6, 1.0);
        const pixelRadius = twistRadiusFrac * markSize * env.radius;
        const tRadius = pixelRadius / g.annotations.length;

        let t: number | null = null;
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidate = random.uniform(tRadius, 1 - tRadius);
          let valid = true;
          for (let j = 0; j < placements.length; j++) {
            if (Math.abs(candidate - placements[j]!) < tRadius + tRadii[j]!) {
              valid = false;
              break;
            }
          }
          if (valid) { t = candidate; break; }
        }

        if (t === null) continue;

        placements.push(t);
        tRadii.push(tRadius);

        const center = g.interpolate(t);
        twistEffects.push({
          region: mark(center.x, center.y, markSize),
          angle: random.uniform(15, 60),
          radius: twistRadiusFrac * 3,
        });
      }

      cloudLineAcc.add(line);
    }
    let cloudLines = cloudLineAcc.result();

    // Apply all twist effects to the composited cloud lines layer
    for (const fx of twistEffects) {
      cloudLines = twistWarp(env, cloudLines, fx);
    }

    content = displaceMerge(env, content, cloudLines, { strength: 20, spread: 10, mode: 'push', opacity: 0 });
    // content = merge(env, content, cloudLines);

    // --------------------------------------------------

    // ── fitSphere on content only, then composite onto base ──
    content = sphereWarp(env, content, { strength: 0.70 });
    result = merge(env, result, content);

    // ── Lighting ──
    result = shadow(env, result, { color: 'black' });
    result = rimLight(env, result, { color: schema.atmosphere });
    result = antiAliasMask(env, result);

    return result;
}