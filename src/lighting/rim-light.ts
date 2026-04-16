import { point } from "@mothervolcano/topo";

import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { unwrap } from "../core/paint";
import { toTransparent } from "../core/color";
import { merge } from "../compositing/merge";
import { radialGradientCut } from "../effects/mask/radial-gradient-cut";

export interface RimLightParams {
  color: string;
  asymmetry?: number;
}

export function rimLight(
  env: Environment,
  paint: Paint,
  params: RimLightParams,
): Paint {
  const { center, radius } = env;
  const asymmetry = params.asymmetry ?? 0.6;

  // Radial gradient: dark center to bright edge
  const rim = env.createPaint();
  const { ctx } = unwrap(rim);

  // Clip to sphere in normal space
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.clip();

  // Elliptical gradient: stretch vertically so rim thins toward the poles
  const stretch = 1.1;
  ctx.translate(0, center.y);
  ctx.scale(1, stretch);
  ctx.translate(0, -center.y);

  const gradient = ctx.createRadialGradient(
    center.x,
    center.y,
    radius * 0.9,
    center.x,
    center.y,
    radius * 1,
  );
  gradient.addColorStop(0, toTransparent(params.color));
  gradient.addColorStop(1, params.color);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, env.diameter, env.diameter);
  ctx.restore();

  // Carve one side for asymmetry (stronger on shadow side)
  const carved = radialGradientCut(env, rim, {
    center: point(center.x + radius * asymmetry, center.y),
    innerRadius: radius * 0,
    outerRadius: radius * 1.2,
  });

  return merge(env, paint, carved, { blendMode: "screen" });
}
