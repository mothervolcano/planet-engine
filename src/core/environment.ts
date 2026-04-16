import { point } from "@mothervolcano/topo";

import type { Point } from "./types";
import type { SeededRandom } from "./prng";
import type { Paint } from "./paint";
import { createRandom } from "./prng";
import { createPool } from "./pool";
import { createPaint, unwrap } from "./paint";

export interface Environment {
  readonly radius: number;
  readonly diameter: number;
  readonly center: Point;
  readonly random: SeededRandom;

  createPaint(): Paint;
  createPaintSized(w: number, h: number): Paint;

  toImage(paint: Paint): Promise<HTMLImageElement>;
  toBlob(paint: Paint): Promise<Blob>;
  toCanvas(paint: Paint): HTMLCanvasElement;
  toDataURL(paint: Paint): string;

  dispose(): void;
}

export interface EnvironmentConfig {
  radius: number;
  seed: number;
  poolInitialSize?: number;
}

export function createEnvironment(config: EnvironmentConfig): Environment {
  const { radius, seed } = config;
  const diameter = radius * 2;
  const center: Point = point(radius, radius);
  const random = createRandom(seed);
  const pool = createPool();

  function makePaint(): Paint {
    const { canvas, ctx } = pool.acquire(diameter, diameter);
    return createPaint(canvas, ctx, pool);
  }

  function makePaintSized(w: number, h: number): Paint {
    const { canvas, ctx } = pool.acquire(w, h);
    return createPaint(canvas, ctx, pool);
  }

  function toImage(paint: Paint): Promise<HTMLImageElement> {
    const { canvas } = unwrap(paint);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = canvas.toDataURL();
    });
  }

  function toBlob(paint: Paint): Promise<Blob> {
    const { canvas } = unwrap(paint);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      });
    });
  }

  function toCanvas(paint: Paint): HTMLCanvasElement {
    const { canvas } = unwrap(paint);
    return canvas;
  }

  function toDataURL(paint: Paint): string {
    const { canvas } = unwrap(paint);
    return canvas.toDataURL();
  }

  function dispose(): void {
    pool.dispose();
  }

  return {
    radius,
    diameter,
    center,
    random,
    createPaint: makePaint,
    createPaintSized: makePaintSized,
    toImage,
    toBlob,
    toCanvas,
    toDataURL,
    dispose,
  };
}
