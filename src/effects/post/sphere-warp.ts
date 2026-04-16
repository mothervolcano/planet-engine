import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";
import { bilinearSample } from "../warp/sample";

export interface SphereWarpParams {
  /** 0 = flat (no warp), 1 = full orthographic sphere projection. Default: 1. */
  strength?: number;
}

/**
 * Remaps pixel positions so features appear to sit on a spherical surface.
 *
 * Uses the inverse orthographic projection: output pixel at normalized radius d
 * samples the source at d_src = (2/π)·asin(d), compressing features toward the
 * limb and expanding them near the pole — matching how a sphere looks under
 * parallel projection.
 */
export function sphereWarp(
  env: Environment,
  paint: Paint,
  params: SphereWarpParams = {},
): Paint {
  const { strength = 1 } = params;
  const { ctx, canvas } = unwrap(paint);
  const { center, radius } = env;
  const w = canvas.width;
  const h = canvas.height;
  const cx = center.x;
  const cy = center.y;
  const TWO_OVER_PI = 2 / Math.PI;

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / radius;

      let sx: number;
      let sy: number;

      if (d >= 1 || d < 1e-6) {
        sx = x;
        sy = y;
      } else {
        const dSrc = d + strength * (TWO_OVER_PI * Math.asin(d) - d);
        const scale = dSrc / d;
        sx = cx + dx * scale;
        sy = cy + dy * scale;
      }

      const [r, g, b, a] = bilinearSample(src.data, w, h, sx, sy);
      const di = (y * w + x) * 4;
      dst.data[di] = r;
      dst.data[di + 1] = g;
      dst.data[di + 2] = b;
      dst.data[di + 3] = a;
    }
  }

  ctx.putImageData(dst, 0, 0);
  return paint;
}
