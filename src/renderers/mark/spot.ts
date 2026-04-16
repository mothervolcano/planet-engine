import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Mark } from "../../geometry/mark";
import { unwrap } from "../../core/paint";

export interface SpotStyle {
  color: string;
  opacity?: number;
}

export function spot(env: Environment, m: Mark, style: SpotStyle): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);

  ctx.globalAlpha = style.opacity ?? 1;
  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  return paint;
}
