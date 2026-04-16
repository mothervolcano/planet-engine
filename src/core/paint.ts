import type { CanvasPool } from "./pool";

const PAINT_BRAND = Symbol("Paint");

export type Paint = {
  readonly [PAINT_BRAND]: true;
  readonly width: number;
  readonly height: number;
};

export interface PaintInternal {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pool: CanvasPool | null;
}

const paintMap = new WeakMap<Paint, PaintInternal>();

/**
 * Creates a new Paint token backed by the given canvas and rendering context.
 * The token exposes only the canvas dimensions publicly; the underlying
 * canvas and context are stored internally and can be retrieved via `unwrap`.
 *
 * @param canvas - The HTMLCanvasElement to associate with this paint token.
 * @param ctx - The 2D rendering context for the canvas.
 * @param pool - Optional canvas pool to return the canvas to when consumed.
 */
export function createPaint(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  pool: CanvasPool | null = null,
): Paint {
  const paint = {
    [PAINT_BRAND]: true as const,
    width: canvas.width,
    height: canvas.height,
  };
  paintMap.set(paint, { canvas, ctx, pool });
  return paint;
}

/**
 * Retrieves the internal canvas, context, and pool for a live Paint token.
 * Throws if the token has already been consumed or was never registered.
 *
 * @param paint - A valid, unconsumed Paint token.
 */
export function unwrap(paint: Paint): PaintInternal {
  const internal = paintMap.get(paint);
  if (!internal) {
    throw new Error("Paint has been consumed or is invalid");
  }
  return internal;
}

/**
 * Invalidates a Paint token and releases its canvas back to the pool (if any).
 * After this call the token can no longer be unwrapped. Throws if the token
 * has already been consumed.
 *
 * @param paint - The Paint token to consume.
 */
export function consume(paint: Paint): void {
  const internal = paintMap.get(paint);
  if (!internal) {
    throw new Error("Paint has already been consumed");
  }
  paintMap.delete(paint);
  if (internal.pool) {
    internal.pool.release(internal.canvas);
  }
}
