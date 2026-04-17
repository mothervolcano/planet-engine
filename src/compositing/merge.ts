import type { BlendMode } from "../core/types";
import type { Paint } from "../core/paint";
import { unwrap, consume } from "../core/paint";

export interface MergeOptions {
  blendMode?: BlendMode;
  opacity?: number;
  blur?: number;
  offset?: { x: number; y: number };
}

export function merge(
  _env: unknown,
  base: Paint,
  overlay: Paint,
  options?: MergeOptions,
): Paint {
  const baseInternal = unwrap(base);
  const overlayInternal = unwrap(overlay);
  const ctx = baseInternal.ctx;

  ctx.save();

  if (options?.blendMode) {
    ctx.globalCompositeOperation =
      options.blendMode === "cutout" ? "destination-out" : options.blendMode;
  }
  if (options?.opacity !== undefined) {
    ctx.globalAlpha = options.opacity;
  }
  if (options?.blur) {
    ctx.filter = `blur(${options.blur}px)`;
  }

  const ox = options?.offset?.x ?? 0;
  const oy = options?.offset?.y ?? 0;
  ctx.drawImage(overlayInternal.canvas, ox, oy);

  ctx.restore();

  consume(overlay);
  return base;
}

export function mergeCut(
  _env: unknown,
  base: Paint,
  cutter: Paint,
): Paint {
  const baseInternal = unwrap(base);
  const cutterInternal = unwrap(cutter);

  baseInternal.ctx.save();
  baseInternal.ctx.globalCompositeOperation = "destination-out";
  baseInternal.ctx.drawImage(cutterInternal.canvas, 0, 0);
  baseInternal.ctx.restore();

  consume(cutter);
  return base;
}

export function mergeMask(
  _env: unknown,
  base: Paint,
  mask: Paint,
): Paint {
  const baseInternal = unwrap(base);
  const maskInternal = unwrap(mask);

  baseInternal.ctx.save();
  baseInternal.ctx.globalCompositeOperation = "destination-in";
  baseInternal.ctx.drawImage(maskInternal.canvas, 0, 0);
  baseInternal.ctx.restore();

  consume(mask);
  return base;
}
