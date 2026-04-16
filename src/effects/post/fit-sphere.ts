import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { radialGradientMask } from "../mask/radial-gradient-mask";
import { radialGradientCut } from "../mask/radial-gradient-cut";

export function fitSphere(
  env: Environment,
  paint: Paint,
): Paint {
  const { radius } = env;

  // Radial mask: keep center, fade edges
  paint = radialGradientMask(env, paint, {
    innerRadius: radius * 0.6,
    outerRadius: radius,
  });

  // Radial cut: remove overshoot beyond sphere edge
  paint = radialGradientCut(env, paint, {
    innerRadius: radius * 0.85,
    outerRadius: radius * 1.1,
  });

  return paint;
}
