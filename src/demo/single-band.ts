import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { band } from "../geometry/partition";
import { solidFill } from "../renderers/partition/solid-fill";
import { belt } from "../renderers/partition/belt";
import { chordGrid } from "../geometry/grid";
import { chordPartitions } from "../geometry/chord-partitions";
import { bulgeWarp } from "../effects/warp/bulge";
import { twistWarp } from "../effects";
import { waveWarp } from "../effects";
import { merge } from "../compositing/merge";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { collector } from "../compositing";
import { distribute } from "../geometry";

/**
 * 
 * 
 */
export function singleBand(env: Environment): Paint {
  // ── Solid base (no lighting gradient) ──
  let result = solidFill(env, band(-90, 90), { color: "#09337E" });

  // 
  //
  const grid = chordGrid(env, band(-45, 45), { count: 6, jitter: 0 });
  const bands = chordPartitions(env, grid);
  const middle = bands.filter({ kind: "indices", indices: [1,2,3] }, env.random);

  const beltAcc = collector(env);
  for (const p of middle.partitions) {
    const plot = distribute(env, p, {density: 10, sizeRange: [0.5, 0.8]});
    const mark = plot.extract({kind: 'random', count: 1}, env.random).marks[0]
    let b = belt(env, p, { color: "#2a5aaa", fadeExtent: 0.35 });
    // b = waveWarp(env, b, {amplitude: 10, frequency: 5, direction: 'vertical'});
    b = twistWarp(env, b, { angle: 45, radius: 1, region: mark });
    beltAcc.add(b);
  }
  let content = beltAcc.result();

  // content = bulgeWarp(env, content, { strength: 0.8, radius: 0.5 });
  // content = twistWarp(env, content, { angle: 45, radius: 0.5 });
  // content = waveWarp(env, content, { amplitude: 0.05, frequency: env.random.uniform(2, 6), direction: "vertical" });

  result = merge(env, result, content);

  result = antiAliasMask(env, result);

  return result;
}
