import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";
import { bilinearSample } from "./sample";

export interface RampWarpParams {
  direction?: "left" | "right";
  strength: number;
}

export function rampWarp(
  _env: Environment,
  paint: Paint,
  params: RampWarpParams,
): Paint {
  const { ctx, canvas } = unwrap(paint);
  const w = canvas.width;
  const h = canvas.height;
  const { strength, direction = "right" } = params;

  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = x / w;
      // Linear compression: maps output x to source x
      const ramp = direction === "right"
        ? 1 - strength * t
        : 1 - strength * (1 - t);
      const sx = x * ramp + (w * (1 - ramp)) / 2;
      const sy = y;

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
