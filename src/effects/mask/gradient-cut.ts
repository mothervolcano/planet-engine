import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";
import { mergeCut } from "../../compositing/merge";

export interface GradientCutParams {
  direction?: "left" | "right" | "top" | "bottom";
  start?: number;
  end?: number;
}

export function gradientCut(
  env: Environment,
  paint: Paint,
  params: GradientCutParams,
): Paint {
  const direction = params.direction ?? "right";
  const start = params.start ?? 0;
  const end = params.end ?? 1;
  const { diameter } = env;

  const cutter = env.createPaint();
  const { ctx } = unwrap(cutter);

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

  gradient.addColorStop(start, "transparent");
  gradient.addColorStop(end, "white");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, diameter, diameter);

  return mergeCut(env, paint, cutter);
}
