import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";

export interface BaseSphereStyle {
  baseColor: string;
  shadowColor: string;
}

export function baseSphere(env: Environment, style: BaseSphereStyle): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const { center, radius } = env;

  const gradient = ctx.createRadialGradient(
    center.x - radius * 0.3,
    center.y - radius * 0.3,
    0,
    center.x,
    center.y,
    radius,
  );
  gradient.addColorStop(0, style.baseColor);
  gradient.addColorStop(1, style.shadowColor);

  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  return paint;
}
