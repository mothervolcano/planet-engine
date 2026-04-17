import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { WarpRegion } from "./region";
import { unwrap } from "../../core/paint";
import { resolveRegion } from "./region";
import { bilinearSample } from "./sample";

export interface DirectionalBlurParams {
  direction: "horizontal" | "vertical";
  /** Blur kernel half-length in pixels. */
  amount: number;
  /** Region that anchors the falloff. When provided, blur tapers to zero at the region boundary. */
  region?: WarpRegion;
  /** Falloff radius as a fraction of the region's reference size. Default 1.0. */
  radius?: number;
  /** Fraction of the radius used for the fade-out zone. 0 = hard cut, 1 = fade from center. Default 0.3. */
  feather?: number;
}

export function directionalBlur(
  env: Environment,
  paint: Paint,
  params: DirectionalBlurParams,
): Paint {
  const { ctx, canvas } = unwrap(paint);
  const w = canvas.width;
  const h = canvas.height;
  const { direction, amount } = params;
  const halfLen = Math.floor(amount / 2);

  const { cx, cy, refSize } = resolveRegion(params.region, env);
  const rad = (params.radius ?? 1.0) * refSize;
  const hasRegion = params.region !== undefined;

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let effectiveHalf = halfLen;

      if (hasRegion) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= rad) {
          effectiveHalf = 0;
        } else {
          const feather = params.feather ?? 0.3;
          const fadeStart = 1 - feather;
          const t = dist / rad;
          const fadeT = feather > 0 ? Math.max(0, (t - fadeStart) / feather) : (t < 1 ? 0 : 1);
          effectiveHalf = Math.floor(halfLen * (1 - fadeT * fadeT));
        }
      }

      const samples = effectiveHalf * 2 + 1;
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

      for (let i = -effectiveHalf; i <= effectiveHalf; i++) {
        const sx = direction === "horizontal" ? x + i : x;
        const sy = direction === "vertical" ? y + i : y;
        const [r, g, b, a] = bilinearSample(src.data, w, h, sx, sy);
        rSum += r;
        gSum += g;
        bSum += b;
        aSum += a;
      }

      const di = (y * w + x) * 4;
      dst.data[di] = rSum / samples;
      dst.data[di + 1] = gSum / samples;
      dst.data[di + 2] = bSum / samples;
      dst.data[di + 3] = aSum / samples;
    }
  }

  ctx.putImageData(dst, 0, 0);
  return paint;
}
