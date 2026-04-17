/**
 * A positioned point with a radius, used as the fundamental placement
 * primitive throughout the geometry and rendering subsystems.
 *
 * Marks are produced by distribution strategies (grid, partition scatter)
 * and collected into {@link Plot}s for filtering. Renderers (blot, crater,
 * spot, mandorla, irregular-star) consume marks to stamp visual shapes onto
 * paint layers.
 */
export interface Mark {
  /** Horizontal position in canvas space. */
  readonly x: number;
  /** Vertical position in canvas space. */
  readonly y: number;
  /**
   * Primary spatial dimension of the mark, **normalised to `[0, 1]`**
   * relative to the environment radius.
   *
   * ### How it is produced
   * Distribution functions sample from a `sizeRange` pair (default
   * `[0.01, 0.07]`). Grid distributions additionally scale by
   * `guide.annotations.sizeHint`. Demo scenes override the range up to
   * `[0.5, 0.8]` for large features.
   *
   * ### How renderers interpret it
   * | Renderer        | Interpretation                                    |
   * |-----------------|---------------------------------------------------|
   * | blot            | Radius of the radial-gradient circle               |
   * | spot            | Radius of the filled circle                        |
   * | crater          | Outer radius; inner cutout uses `size * 0.85`      |
   * | mandorla        | Semi-major axis (half-length of the almond shape)  |
   * | irregular-star  | Outer point radius of the star                     |
   *
   * Warp effects (`bulgeWarp`, `twistWarp`, `waveWarp`) also accept a Mark
   * as a region anchor, using `size` as the reference scale for the effect.
   *
   * ### In calculations
   * Treat as a **linear, unsigned, unit-space distance**. Multiply by the
   * environment radius to convert to canvas pixels when needed
   * (e.g. `size * radius` before passing to `ctx.arc`).
   */
  readonly size: number;
}

/**
 * Creates an immutable {@link Mark}.
 */
export function mark(x: number, y: number, size: number): Mark {
  return { x, y, size };
}
