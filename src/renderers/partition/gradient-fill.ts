import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import type { Partition } from "../../geometry/partition";
import { unwrap } from "../../core/paint";

export interface GradientStop {
  offset: number;
  color: string;
}

export interface GradientFillStyle {
  stops: GradientStop[];
  direction?: "linear" | "radial";
}

const DEG_TO_RAD = Math.PI / 180;

export function gradientFill(
  env: Environment,
  partition: Partition,
  style: GradientFillStyle,
): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const { center, radius, diameter } = env;
  const direction = style.direction ?? "linear";

  // Clip to sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.clip();

  let gradient: CanvasGradient;

  if (partition.kind === "band") {
    const y1 = partition.yStart ?? center.y + radius * Math.sin(partition.angleStart * DEG_TO_RAD);
    const y2 = partition.yEnd ?? center.y + radius * Math.sin(partition.angleEnd * DEG_TO_RAD);

    if (direction === "radial") {
      const cy = (y1 + y2) / 2;
      gradient = ctx.createRadialGradient(center.x, cy, 0, center.x, cy, radius);
    } else {
      gradient = ctx.createLinearGradient(0, y1, 0, y2);
    }

    for (const stop of style.stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y1, diameter, y2 - y1);
  } else {
    if (direction === "radial") {
      gradient = ctx.createRadialGradient(
        partition.center.x,
        partition.center.y,
        0,
        partition.center.x,
        partition.center.y,
        partition.radius,
      );
    } else {
      gradient = ctx.createLinearGradient(
        partition.center.x - partition.radius,
        partition.center.y,
        partition.center.x + partition.radius,
        partition.center.y,
      );
    }

    for (const stop of style.stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(partition.center.x, partition.center.y, partition.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return paint;
}
