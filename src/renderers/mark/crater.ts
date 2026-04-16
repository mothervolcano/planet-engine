import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Mark } from "../../geometry/mark";
import { unwrap } from "../../core/paint";

export interface CraterStyle {
  color: string;
  lightAngle?: number;
}

export function crater(env: Environment, m: Mark, style: CraterStyle): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const lightAngle = style.lightAngle ?? 0;

  // Draw filled circle
  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
  ctx.fill();

  // Cut out an offset circle to leave a crescent rim
  const offsetX = Math.cos(lightAngle) * m.size * 0.4;
  const offsetY = Math.sin(lightAngle) * m.size * 0.4;

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(m.x + offsetX, m.y + offsetY, m.size * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  return paint;
}
