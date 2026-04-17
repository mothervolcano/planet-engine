import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Mark } from "../../geometry/mark";
import { unwrap } from "../../core/paint";
import { toTransparent } from "../../core/color";

export interface BlotStyle {
  color: string;
}

export function blot(env: Environment, m: Mark, style: BlotStyle): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);

  const r = m.size * env.radius;
  const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
  gradient.addColorStop(0, style.color);
  gradient.addColorStop(1, toTransparent(style.color));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
  ctx.fill();

  return paint;
}
