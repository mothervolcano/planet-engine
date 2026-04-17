import { point } from "@mothervolcano/topo";

import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { unwrap } from "../core/paint";
import { merge } from "../compositing/merge";
import { radialGradientCut } from "../effects/mask/radial-gradient-cut";

export interface ShadowParams {
  color: string;
  offset?: number;
}

export function shadow(
  env: Environment,
  paint: Paint,
  params: ShadowParams,
): Paint {
  const { center, radius } = env;
  const offset = params.offset ?? 0.5;

  // Create a dark sphere
  const dark = env.createPaint();
  const { ctx } = unwrap(dark);

  ctx.fillStyle = params.color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Carve from the lit side using a radial cut
  const maskCenter = point(center.x + radius * offset, center.y);
  const cutCenter = point(center.x - radius * offset*1.3, center.y - radius*0.6);

  const masked = radialGradientCut(env, dark, {
    center: maskCenter,
    innerRadius: radius * 0.5,
    outerRadius: radius * 1.5,
    scale: 1.3,
  });

  const punched = radialGradientCut(env, masked, {
    center: cutCenter,
    innerRadius: radius * 1.1,
    outerRadius: radius * 0.7,
    scale: 1.6,
  });

  return merge(env, paint, punched, { blendMode: "multiply" });

  // return merge(env, paint, result, { blendMode: "multiply" });
}
