import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Partition } from "../../geometry/partition";
import { unwrap } from "../../core/paint";
import { toTransparent } from "../../core/color";

export interface BeltStyle {
  color: string;
  fadeExtent?: number;
}

const DEG_TO_RAD = Math.PI / 180;

export function belt(
  env: Environment,
  partition: Partition,
  style: BeltStyle,
): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const { center, radius, diameter } = env;
  const fadeExtent = style.fadeExtent ?? 0.2;

  let y1: number;
  let y2: number;

  if (partition.kind === "band") {
    y1 = partition.yStart ?? center.y + radius * Math.sin(partition.angleStart * DEG_TO_RAD);
    y2 = partition.yEnd ?? center.y + radius * Math.sin(partition.angleEnd * DEG_TO_RAD);
  } else {
    y1 = partition.center.y - partition.radius;
    y2 = partition.center.y + partition.radius;
  }

  const height = y2 - y1;

  // Clip to sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.clip();

  if (fadeExtent === 0 || height === 0) {
    ctx.fillStyle = style.color;
  } else {
    const transparent = toTransparent(style.color);
    const gradient = ctx.createLinearGradient(0, y1, 0, y2);
    const fadeT = Math.min(fadeExtent, 0.5);
    gradient.addColorStop(0, transparent);
    gradient.addColorStop(fadeT, style.color);
    gradient.addColorStop(1 - fadeT, style.color);
    gradient.addColorStop(1, transparent);
    ctx.fillStyle = gradient;
  }

  ctx.fillRect(0, y1, diameter, height);

  ctx.restore();
  return paint;
}
