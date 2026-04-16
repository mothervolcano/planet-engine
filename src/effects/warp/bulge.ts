import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { WarpRegion } from "./region";
import { unwrap } from "../../core/paint";
import { resolveRegion } from "./region";
import { bilinearSample } from "./sample";

export interface BulgeWarpParams {
  /** Mark or Disc that anchors the bulge and sets its scale. Defaults to the full planet. */
  region?: WarpRegion;
  /** Push strength at center, in [0, 1]. */
  strength: number;
  /** Falloff radius as a fraction of the region's reference size. */
  radius: number;
}

export function bulgeWarp(
  env: Environment,
  paint: Paint,
  params: BulgeWarpParams,
): Paint {
  const { ctx, canvas } = unwrap(paint);
  const w = canvas.width;
  const h = canvas.height;
  const { cx, cy, refSize } = resolveRegion(params.region, env);
  const { strength } = params;
  const rad = params.radius * refSize;

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let sx: number;
      let sy: number;

      if (dist < rad && dist > 0) {
        const t = dist / rad;
        const scale = 1 - strength * (1 - t);
        sx = cx + dx * scale;
        sy = cy + dy * scale;
      } else {
        sx = x;
        sy = y;
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
