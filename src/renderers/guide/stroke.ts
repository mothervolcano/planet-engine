import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Guide } from "../../geometry/guide";
import { unwrap } from "../../core/paint";

export interface StrokeStyle {
  color: string;
  lineWidth?: number;
  opacity?: number;
}

export function stroke(
  env: Environment,
  guide: Guide,
  style: StrokeStyle,
): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);

  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.lineWidth ?? 1;
  ctx.globalAlpha = style.opacity ?? 1;

  ctx.beginPath();
  ctx.moveTo(guide.start.x, guide.start.y);
  ctx.lineTo(guide.end.x, guide.end.y);
  ctx.stroke();

  ctx.globalAlpha = 1;

  return paint;
}
