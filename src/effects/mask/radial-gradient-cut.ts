import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { PointLike } from "../../core/types";
import { unwrap } from "../../core/paint";
import { mergeCut } from "../../compositing/merge";

export interface RadialGradientCutParams {
  center?: PointLike;
  innerRadius?: number;
  outerRadius?: number;
  scale?: number;
}

export function radialGradientCut(
  env: Environment,
  paint: Paint,
  params: RadialGradientCutParams,
): Paint {
  const cx = params.center?.x ?? env.center.x;
  const cy = params.center?.y ?? env.center.y;
  const scale = params.scale ?? 1;
  const innerRadius = (params.innerRadius ?? 0) * scale;
  const outerRadius = (params.outerRadius ?? env.radius) * scale;
  const { diameter } = env;

  const cutter = env.createPaint();
  const { ctx } = unwrap(cutter);

  const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, "white");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, diameter, diameter);

  return mergeCut(env, paint, cutter);
}
