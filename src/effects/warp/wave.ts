import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { WarpRegion } from "./region";
import { unwrap } from "../../core/paint";
import { resolveRegion } from "./region";
import { bilinearSample } from "./sample";

export interface WaveWarpParams {
  /** Displacement as a fraction of the region's reference size. */
  amplitude: number;
  /** Cycles per region reference size. */
  frequency: number;
  phase?: number;
  direction?: "horizontal" | "vertical";
  /** Mark or Disc that anchors the wave and sets its scale. Defaults to the full planet. */
  region?: WarpRegion;
}

export function waveWarp(
  env: Environment,
  paint: Paint,
  params: WaveWarpParams,
): Paint {
  const { ctx, canvas } = unwrap(paint);
  const { amplitude, frequency, phase = 0, direction = "vertical" } = params;
  const { cx, cy, refSize } = resolveRegion(params.region, env);
  const w = canvas.width;
  const h = canvas.height;

  const amplitudePx = amplitude * refSize;
  const wavelengthPx = refSize / frequency;

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx: number;
      let sy: number;

      if (direction === "horizontal") {
        sx = x + amplitudePx * Math.sin(2 * Math.PI * (y - cy) / wavelengthPx + phase);
        sy = y;
      } else {
        sx = x;
        sy = y + amplitudePx * Math.sin(2 * Math.PI * (x - cx) / wavelengthPx + phase);
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
