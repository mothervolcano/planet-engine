import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { PointLike } from "../../core/types";
import { unwrap } from "../../core/paint";
import { mergeMask } from "../../compositing/merge";

export interface RadialGradientMaskParams {
  center?: PointLike;
  innerRadius?: number;
  outerRadius?: number;
  scale?: number;
}

export function radialGradientMask(
  env: Environment,
  paint: Paint,
  params: RadialGradientMaskParams,
): Paint {
  const cx = params.center?.x ?? env.center.x;
  const cy = params.center?.y ?? env.center.y;
  const scale = params.scale ?? 1;
  const innerRadius = (params.innerRadius ?? 0) * scale;
  const outerRadius = (params.outerRadius ?? env.radius) * scale;
  const { diameter } = env;

  const mask = env.createPaint();
  const { ctx } = unwrap(mask);

  const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
  gradient.addColorStop(0, "white");
  gradient.addColorStop(1, "transparent");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, diameter, diameter);

  return mergeMask(env, paint, mask);
}
