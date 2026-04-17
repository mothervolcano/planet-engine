import type { BlendMode } from "../core/types";
import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { unwrap, consume } from "../core/paint";
import { bilinearSample } from "../effects/warp/sample";

export interface DisplaceMergeOptions {
  /** Max displacement in pixels. */
  strength: number;
  /** Blur radius for the alpha field, in pixels. Controls how wide
   *  the displacement influence zone extends beyond shape edges.
   *  Larger = smoother, wider push. Default: 8 */
  spread?: number;
  /** "push": overlay acts as a solid object, pushing all base content
   *  outward from under the shape (compression at edges, easing outward).
   *  "edge": displacement peaks at shape edges only.
   *  Default: "push" */
  mode?: "push" | "edge";
  /** Blend mode for the final overlay compositing. */
  blendMode?: BlendMode;
  /** Opacity for the final overlay compositing. */
  opacity?: number;
}

function boxBlurAlpha(
  alpha: Float32Array,
  w: number,
  h: number,
  radius: number,
): void {
  const temp = new Float32Array(w * h);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    const rRight = Math.min(radius, w - 1);
    for (let i = 0; i <= rRight; i++) sum += alpha[row + i]!;

    for (let x = 0; x < w; x++) {
      const left = x - radius;
      const right = x + radius;
      const wLeft = Math.max(0, left);
      const wRight = Math.min(w - 1, right);
      const count = wRight - wLeft + 1;

      temp[row + x] = sum / count;

      if (left >= 0) sum -= alpha[row + left]!;
      if (right + 1 < w) sum += alpha[row + right + 1]!;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    const rBottom = Math.min(radius, h - 1);
    for (let i = 0; i <= rBottom; i++) sum += temp[i * w + x]!;

    for (let y = 0; y < h; y++) {
      const top = y - radius;
      const bottom = y + radius;
      const wTop = Math.max(0, top);
      const wBottom = Math.min(h - 1, bottom);
      const count = wBottom - wTop + 1;

      alpha[y * w + x] = sum / count;

      if (top >= 0) sum -= temp[top * w + x]!;
      if (bottom + 1 < h) sum += temp[(bottom + 1) * w + x]!;
    }
  }
}

export function displaceMerge(
  _env: Environment,
  base: Paint,
  overlay: Paint,
  options: DisplaceMergeOptions,
): Paint {
  const baseInternal = unwrap(base);
  const overlayInternal = unwrap(overlay);
  const w = baseInternal.canvas.width;
  const h = baseInternal.canvas.height;
  const { strength } = options;
  const spread = options.spread ?? 8;
  const mode = options.mode ?? "push";

  // 1. Read base pixels
  const baseData = baseInternal.ctx.getImageData(0, 0, w, h);

  // 2. Extract overlay alpha field
  const overlayData = overlayInternal.ctx.getImageData(0, 0, w, h);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    alpha[i] = overlayData.data[i * 4 + 3]! / 255;
  }

  // 3. For push mode, compute shape centroid for displacement direction.
  let centroidX = 0;
  let centroidY = 0;
  if (mode === "push") {
    let cx = 0, cy = 0, count = 0;
    for (let i = 0; i < w * h; i++) {
      if (alpha[i]! > 0.5) {
        cx += i % w;
        cy += Math.floor(i / w);
        count++;
      }
    }
    if (count > 0) {
      centroidX = cx / count;
      centroidY = cy / count;
    }
  }

  // 4. Blur the alpha field to widen the influence zone.
  //    Three passes approximate a Gaussian for rotational symmetry.
  if (spread > 0) {
    const r = Math.round(spread / 3);
    boxBlurAlpha(alpha, w, h, r);
    boxBlurAlpha(alpha, w, h, r);
    boxBlurAlpha(alpha, w, h, r);
  }

  // 5. Displace base pixels
  const dstData = baseInternal.ctx.createImageData(w, h);

  if (mode === "push") {
    // Push mode: direction from centroid (inward for inverse mapping),
    // magnitude from blurred alpha. Content under the shape is pushed
    // radially outward from the centroid.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const cdx = centroidX - x;
        const cdy = centroidY - y;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy);

        let sx: number;
        let sy: number;

        if (cd < 1e-6) {
          sx = x;
          sy = y;
        } else {
          // Cap displacement at distance to centroid to prevent
          // fold-over (sampling past the centroid to the other side).
          const displace = Math.min(alpha[idx]! * strength, cd);
          sx = x + (cdx / cd) * displace;
          sy = y + (cdy / cd) * displace;
        }

        const [r, g, b, a] = bilinearSample(baseData.data, w, h, sx, sy);
        const di = (y * w + x) * 4;
        dstData.data[di] = r;
        dstData.data[di + 1] = g;
        dstData.data[di + 2] = b;
        dstData.data[di + 3] = a;
      }
    }
  } else {
    // Edge mode: Sobel gradient of blurred alpha for direction,
    // gradient magnitude controls displacement amount.
    const gxField = new Float32Array(w * h);
    const gyField = new Float32Array(w * h);
    let maxMag = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - 1);
        const x1 = Math.min(w - 1, x + 1);
        const y0 = Math.max(0, y - 1);
        const y1 = Math.min(h - 1, y + 1);

        const a00 = alpha[y0 * w + x0]!;
        const a10 = alpha[y0 * w + x]!;
        const a20 = alpha[y0 * w + x1]!;
        const a01 = alpha[y * w + x0]!;
        const a21 = alpha[y * w + x1]!;
        const a02 = alpha[y1 * w + x0]!;
        const a12 = alpha[y1 * w + x]!;
        const a22 = alpha[y1 * w + x1]!;

        const gx = (a20 - a00) + 2 * (a21 - a01) + (a22 - a02);
        const gy = (a02 - a00) + 2 * (a12 - a10) + (a22 - a20);

        const idx = y * w + x;
        gxField[idx] = gx;
        gyField[idx] = gy;

        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag > maxMag) maxMag = mag;
      }
    }

    const scale = maxMag > 0 ? strength / maxMag : 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const sx = x + gxField[idx]! * scale;
        const sy = y + gyField[idx]! * scale;

        const [r, g, b, a] = bilinearSample(baseData.data, w, h, sx, sy);
        const di = (y * w + x) * 4;
        dstData.data[di] = r;
        dstData.data[di + 1] = g;
        dstData.data[di + 2] = b;
        dstData.data[di + 3] = a;
      }
    }
  }

  // 6. Write displaced base back
  baseInternal.ctx.putImageData(dstData, 0, 0);

  // 7. Composite overlay on top
  baseInternal.ctx.save();
  if (options.blendMode) {
    baseInternal.ctx.globalCompositeOperation = options.blendMode;
  }
  if (options.opacity !== undefined) {
    baseInternal.ctx.globalAlpha = options.opacity;
  }
  baseInternal.ctx.drawImage(overlayInternal.canvas, 0, 0);
  baseInternal.ctx.restore();

  // 8. Consume overlay, return base
  consume(overlay);
  return base;
}
