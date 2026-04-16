import type { BlendMode } from "../core/types";
import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { merge } from "./merge";

/**
 * Accumulates paints produced inside a loop before compositing them onto a
 * base layer in a single `merge` call.
 *
 * The first paint added becomes the accumulation canvas directly — no merge
 * is performed for it. Subsequent paints are merged onto that canvas using
 * the `blendMode` and `opacity` specified at construction. Each added paint
 * is consumed (its canvas returned to the pool) as it is merged.
 *
 * Call `result()` once after the loop to retrieve the accumulated paint, then
 * pass it to `merge`. The result paint is consumed by that outer `merge`.
 */
export interface Collector {
  /**
   * Merge `paint` into the accumulation. Consumes `paint`.
   * The first call sets the accumulation; subsequent calls composite onto it.
   */
  add(paint: Paint): void;

  /**
   * Return the accumulated paint. If `add` was never called, returns a
   * blank paint sized to the environment diameter.
   */
  result(): Paint;
}

export interface CollectorOptions {
  /** Blend mode applied when compositing each paint onto the accumulation. Defaults to `source-over`. */
  blendMode?: BlendMode;
  /** Opacity applied when compositing each paint onto the accumulation. Defaults to 1. */
  opacity?: number;
}

/**
 * Create a `Collector` for accumulating loop-produced paints.
 *
 * @example
 * ```ts
 * const acc = collector(env, { blendMode: 'screen' });
 * for (const m of plot.marks) {
 *   acc.add(spot(env, m, { color: 'white' }));
 * }
 * result = merge(env, result, acc.result());
 * ```
 */
export function collector(env: Environment, options?: CollectorOptions): Collector {
  let accumulation: Paint | null = null;

  function add(paint: Paint): void {
    if (!accumulation) {
      accumulation = paint;
    } else {
      accumulation = merge(env, accumulation, paint, {
        blendMode: options?.blendMode,
        opacity: options?.opacity,
      });
    }
  }

  function result(): Paint {
    if (!accumulation) {
      accumulation = env.createPaint();
    }
    return accumulation;
  }

  return { add, result };
}
