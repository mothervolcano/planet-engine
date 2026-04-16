import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { band } from "../geometry/partition";
import { chordGrid } from "../geometry/grid";
import { chordPartitions } from "../geometry/chord-partitions";
import { distribute } from "../geometry/distribution";
import { baseSphere } from "../renderers/partition/base-sphere";
import { belt } from "../renderers/partition/belt";
import { spot } from "../renderers/mark/spot";
import { twistWarp } from "../effects/warp/twist";
import { fitSphere } from "../effects/post/fit-sphere";
import { shadow } from "../lighting/shadow";
import { rimLight } from "../lighting/rim-light";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { merge } from "../compositing/merge";
import { collector } from "../compositing/collector";
import { spotlight } from "../lighting";
import { mandorla } from "../renderers";
import { correctionBlur, regionBlur, sphereWarp, waveWarp } from "../effects";

const COLORS = [
  "#1a4a8a",
  "#2060aa",
  "#1848a0",
  "#0d3366",
  "#244c88",
  "#183070",
  "#2a5aaa",
  "#1040cc",
];

export function stratoGas(env: Environment): Paint {
  const { random } = env;

  // ── Base layer ──
  let result = baseSphere(env, { baseColor: "#09337E", shadowColor: "#021133" });

  // ── Belts + storms (content layer, separate from base) ──
  const grid = chordGrid(env, band(-90, 90), { count: 8, jitter: 0.3 });
  const bands = chordPartitions(env, grid);

  const beltAcc = collector(env);
  for (const p of bands.partitions) {
    beltAcc.add(belt(env, p, { color: random.pick(COLORS) }));
  }
  let content = beltAcc.result();

  const plot = distribute(env, grid, { density: 5, margins: [0.1, 0.9], sizeRange: [0.1, 0.3] });
  const storms = plot.extract({ kind: "probabilistic", probability: 0.3 }, random);

  const stormAcc = collector(env, { blendMode: "screen" });
  for (const m of storms.marks) {
    let s = mandorla(env, m, { color: "white" });
    s = waveWarp(env, s, { amplitude: 0.2, frequency: 3, direction: 'vertical', region: m });
    s = correctionBlur(env, s, { amount: 4}); 
    s = twistWarp(env, s, { angle: random.uniform(90, 180), radius: 2, region: m });
    stormAcc.add(s);
  }
  content = merge(env, content, stormAcc.result());

  for (const m of storms.marks) {
    twistWarp(env, content, { angle: random.uniform(90, 180), radius: 2, region: m });
  }

  // ── fitSphere on content only, then composite onto base ──
  content = sphereWarp(env, content, { strength: 0.5});
  content = fitSphere(env, content);
  result = merge(env, result, content);

  // ── Lighting ──
  result = shadow(env, result, { color: "#021133" });
  result = rimLight(env, result, { color: "#5f83c3" });
  result = antiAliasMask(env, result);

  return result;
}
