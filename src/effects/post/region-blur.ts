import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";
import { merge, mergeCut, mergeMask } from "../../compositing/merge";
import type { WarpRegion } from "../warp/region";
import { resolveRegion } from "../warp/region";

export interface RegionBlurParams {
  region?: WarpRegion;
  amount: number;
  feather?: number;
}

export function regionBlur(
  env: Environment,
  paint: Paint,
  params: RegionBlurParams,
): Paint {
  const { cx, cy, refSize } = resolveRegion(params.region, env);
  const feather = params.feather ?? 0.5;

  const { canvas } = unwrap(paint);

  const blurred = env.createPaint();
  const blurredInternal = unwrap(blurred);
  blurredInternal.ctx.filter = `blur(${params.amount}px)`;
  blurredInternal.ctx.drawImage(canvas, 0, 0);

  const innerR = refSize * (1 - feather);
  // Blur mask extends beyond the cut radius to capture energy the CSS blur spreads
  // outside the region boundary — prevents a transparent ring at the cut edge.
  const blurOuterR = refSize + params.amount;

  const buildMask = (outerR: number): Paint => {
    const m = env.createPaint();
    const mi = unwrap(m);
    const grad = mi.ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, "white");
    grad.addColorStop(1, "transparent");
    mi.ctx.fillStyle = grad;
    mi.ctx.fillRect(0, 0, canvas.width, canvas.height);
    return m;
  };

  mergeMask(env, blurred, buildMask(blurOuterR));
  mergeCut(env, paint, buildMask(refSize));
  merge(env, paint, blurred);

  return paint;
}
