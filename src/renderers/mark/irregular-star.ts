import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Mark } from "../../geometry/mark";
import { unwrap } from "../../core/paint";

export interface IrregularStarStyle {
  color: string;
  points?: number;
  innerRadius?: number;
}

export function irregularStar(
  env: Environment,
  m: Mark,
  style: IrregularStarStyle,
): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const { random } = env;

  const points = style.points ?? 5;
  const innerRadiusRatio = style.innerRadius ?? 0.4;
  const outerRadius = m.size * env.radius;
  const innerRadius = outerRadius * innerRadiusRatio;
  const totalPoints = points * 2;
  const angleStep = (Math.PI * 2) / totalPoints;

  ctx.fillStyle = style.color;
  ctx.beginPath();

  for (let i = 0; i < totalPoints; i++) {
    const angle = angleStep * i - Math.PI / 2;
    const isOuter = i % 2 === 0;
    const baseRadius = isOuter ? outerRadius : innerRadius;
    const r = isOuter ? baseRadius * random.uniform(0.7, 1.3) : baseRadius;

    const px = m.x + Math.cos(angle) * r;
    const py = m.y + Math.sin(angle) * r;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();

  return paint;
}
