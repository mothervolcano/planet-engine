import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { unwrap } from "../core/paint";
import { merge } from "../compositing/merge";

export interface BaseShadowParams {
  color: string;
}

export function baseShadow(
  env: Environment,
  paint: Paint,
  params: BaseShadowParams,
): Paint {
  const { center, radius, diameter } = env;

  const overlay = env.createPaint();
  const { ctx } = unwrap(overlay);

  // Left-to-right gradient: transparent on lit side, dark on shadow side
  const gradient = ctx.createLinearGradient(0, 0, diameter, 0);
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(0.5, "transparent");
  gradient.addColorStop(1, params.color);

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  return merge(env, paint, overlay, { blendMode: "multiply" });
}
