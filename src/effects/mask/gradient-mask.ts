import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";
import { mergeMask } from "../../compositing/merge";

export interface GradientMaskParams {
  direction?: "left" | "right" | "top" | "bottom";
  start?: number;
  end?: number;
}

export function gradientMask(
  env: Environment,
  paint: Paint,
  params: GradientMaskParams,
): Paint {
  const direction = params.direction ?? "right";
  const start = params.start ?? 0;
  const end = params.end ?? 1;
  const { diameter } = env;

  const mask = env.createPaint();
  const { ctx } = unwrap(mask);

  let gradient: CanvasGradient;
  switch (direction) {
    case "left":
      gradient = ctx.createLinearGradient(diameter, 0, 0, 0);
      break;
    case "right":
      gradient = ctx.createLinearGradient(0, 0, diameter, 0);
      break;
    case "top":
      gradient = ctx.createLinearGradient(0, diameter, 0, 0);
      break;
    case "bottom":
      gradient = ctx.createLinearGradient(0, 0, 0, diameter);
      break;
  }

  gradient.addColorStop(start, "white");
  gradient.addColorStop(end, "transparent");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, diameter, diameter);

  return mergeMask(env, paint, mask);
}
