import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { unwrap } from "../core/paint";
import { toTransparent } from "../core/color";
import { merge } from "../compositing/merge";

export interface SpotlightParams {
  color?: string;
  size?: number;
  x?: number;
  y?: number;
}

export function spotlight(
  env: Environment,
  paint: Paint,
  params: SpotlightParams,
): Paint {
  const { center, radius } = env;
  const color = params.color ?? "rgba(255,255,255,0.1)";
  const size = params.size ?? radius * 0.75;
  const cx = params.x ?? center.x - radius * 0.3;
  const cy = params.y ?? center.y - radius * 0.3;

  const highlight = env.createPaint();
  const { ctx } = unwrap(highlight);

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, toTransparent(color));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  return merge(env, paint, highlight, { blendMode: "hard-light" });
}
