import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Mark } from "../../geometry/mark";
import { unwrap } from "../../core/paint";

export interface MandorlaStyle {
  color: string;
  angle?: number;
  ratio?: number;
}

export function mandorla(env: Environment, m: Mark, style: MandorlaStyle): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const angle = style.angle ?? 0;
  const ratio = style.ratio ?? 0.5;

  const halfLen = m.size * env.radius;
  const halfWidth = halfLen * ratio;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Top and bottom points along the major axis
  const topX = m.x - cos * halfLen;
  const topY = m.y - sin * halfLen;
  const bottomX = m.x + cos * halfLen;
  const bottomY = m.y + sin * halfLen;

  // Control point offsets perpendicular to the axis
  const perpX = -sin * halfWidth;
  const perpY = cos * halfWidth;

  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.quadraticCurveTo(m.x + perpX, m.y + perpY, bottomX, bottomY);
  ctx.quadraticCurveTo(m.x - perpX, m.y - perpY, topX, topY);
  ctx.fill();

  return paint;
}
