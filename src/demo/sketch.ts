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

export function sketch(env: Environment): Paint {
    const { random } = env;

    // ── Base layer ──
    let result = baseSphere(env, { baseColor: "#09337E", shadowColor: "#021133" });
    
    const bandsGrid = chordGrid(env, band(-90, 90), { count: 6, jitter: 0.5 });
    
    const lines1Grid = chordGrid(env, band(15, 60), { count: 5, jitter: 0.3 });
    const lines2Grid = chordGrid(env, band(15, 60), { count: 5, jitter: 0.3 });

    const bands = chordPartitions(env, bandsGrid);
    
    const beltAcc = collector(env);
    for (const p of bands.partitions) {
        beltAcc.add(belt(env, p, { color: random.pick(COLORS), fadeExtent: 0 }));
    }
    let content = beltAcc.result();

    // ── fitSphere on content only, then composite onto base ──
    content = fitSphere(env, content);
    result = merge(env, result, content);

    // ── Lighting ──
    result = shadow(env, result, { color: "#021133" });
    result = rimLight(env, result, { color: "#5f83c3" });
    result = antiAliasMask(env, result);

    return result
}