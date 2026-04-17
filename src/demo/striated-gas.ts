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
import { mandorla, stroke } from "../renderers";
import { correctionBlur, sphereWarp } from "../effects";
import { colorRange, shade, tint } from "../core/color";

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
      let line = stroke(env, g, { lineWidth: random.uniform(1,3), color: 'white'});
      line = correctionBlur(env, line, { amount: random.uniform(0.1, 5) });
      cutoutLinesAcc.add(line);
    }
    const cutoutLines = cutoutLinesAcc.result();
    content = merge(env, content, cutoutLines);

    // ── fitSphere on content only, then composite onto base ──
    content = sphereWarp(env, content, { strength: 0.70 });
    result = merge(env, result, content);

    // ── Lighting ──
    result = shadow(env, result, { color: 'black' });
    result = rimLight(env, result, { color: schema.atmosphere });
    result = antiAliasMask(env, result);

    return result;
}