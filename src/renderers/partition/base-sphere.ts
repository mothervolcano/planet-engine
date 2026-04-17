import { merge } from "../../compositing";
import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap } from "../../core/paint";
import { band } from "../../geometry";
import { solidFill } from "./solid-fill";

export interface BaseSphereStyle {
  baseColor: string;
  shadowColor: string;
}

export function baseSphere(env: Environment, style: BaseSphereStyle): Paint {
  const paint = env.createPaint();
  const { ctx } = unwrap(paint);
  const { center, radius } = env;
  
  let result = solidFill(env, band(-90, 90), { color: style.baseColor });

  const gradient = ctx.createRadialGradient(
    center.x - radius * 0.1,
    center.y - radius * 0.1,
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

  // Linear fade-in mask: transparent on the left, opaque on the right, 30° downward inclination
  const angle = (30 * Math.PI) / 180;
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius;
  const fadeGradient = ctx.createLinearGradient(
    center.x - dx, center.y - dy,
    center.x + dx, center.y + dy,
  );
  fadeGradient.addColorStop(0, "rgba(0,0,0,0)");
  fadeGradient.addColorStop(1, "rgba(0,0,0,1)");

  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = fadeGradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = "source-over";

  result = merge(env, result, paint);
  return result;
}
