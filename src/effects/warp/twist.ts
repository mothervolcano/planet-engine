import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { WarpRegion } from "./region";
import { unwrap } from "../../core/paint";
import { resolveRegion } from "./region";
import { bilinearSample } from "./sample";

export interface TwistWarpParams {
  /** Mark or Disc that anchors the twist and sets its scale. Defaults to the full planet. */
  region?: WarpRegion;
  /** Maximum rotation angle at the center, in degrees. */
  angle: number;
  /** Falloff radius as a fraction of the region's reference size. */
  radius: number;
}

const DEG_TO_RAD = Math.PI / 180;

export function twistWarp(
  env: Environment,
  paint: Paint,
  params: TwistWarpParams,
): Paint {
  const { ctx, canvas } = unwrap(paint);
  const w = canvas.width;
  const h = canvas.height;
  const { cx, cy, refSize } = resolveRegion(params.region, env);
  const maxAngle = params.angle * DEG_TO_RAD;
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

      if (dist < rad) {
        const t = dist / rad;
        const cosT = Math.cos(t * Math.PI / 2);
        const falloff = cosT * cosT * cosT * cosT; // cos^4
        const theta = maxAngle * falloff;

        const cosA = Math.cos(theta);
        const sinA = Math.sin(theta);
        sx = cx + dx * cosA - dy * sinA;
        sy = cy + dx * sinA + dy * cosA;
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
