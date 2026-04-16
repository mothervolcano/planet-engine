import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Partition } from "../../geometry/partition";
import { unwrap } from "../../core/paint";

export interface SolidFillStyle {
  color: string;
}

const DEG_TO_RAD = Math.PI / 180;

export function solidFill(
  env: Environment,
  partition: Partition,
  style: SolidFillStyle,
): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const { center, radius } = env;

  // Clip to sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = style.color;

  if (partition.kind === "band") {
    const y1 = partition.yStart ?? center.y + radius * Math.sin(partition.angleStart * DEG_TO_RAD);
    const y2 = partition.yEnd ?? center.y + radius * Math.sin(partition.angleEnd * DEG_TO_RAD);
    ctx.fillRect(0, y1, env.diameter, y2 - y1);
  } else {
    ctx.beginPath();
    ctx.arc(partition.center.x, partition.center.y, partition.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return paint;
}
