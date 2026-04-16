import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";
import { mergeMask } from "../../compositing/merge";

export function antiAliasMask(
  env: Environment,
  paint: Paint,
): Paint {
  const { center, radius } = env;

  const mask = env.createPaint();
  const { ctx } = unwrap(mask);

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius - 1, 0, Math.PI * 2);
  ctx.fill();

  return mergeMask(env, paint, mask);
}
