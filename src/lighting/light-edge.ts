import { point } from "@mothervolcano/topo";

import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { unwrap } from "../core/paint";
import { merge } from "../compositing/merge";
import { radialGradientCut } from "../effects/mask/radial-gradient-cut";

export interface LightEdgeParams {
  color?: string;
  thickness?: number;
}

export function lightEdge(
  env: Environment,
  paint: Paint,
  params: LightEdgeParams,
): Paint {
  const { center, radius } = env;
  const color = params.color ?? "rgba(255,255,255,0.4)";
  const thickness = params.thickness ?? 0.05;

  // Bright circle
  const edge = env.createPaint();
  const { ctx } = unwrap(edge);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Cut most of it away, leaving a thin crescent on the left (lit) side
  const cutOffset = radius * thickness;
  const carved = radialGradientCut(env, edge, {
    center: point(center.x + cutOffset, center.y),
    innerRadius: radius * 0.7,
    outerRadius: radius * 0.95,
  });

  return merge(env, paint, carved, { blendMode: "screen" });
}
