import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { band } from "../geometry/partition";
import { solidFill } from "../renderers/partition/solid-fill";
import { shadow } from "../lighting/shadow";
import { rimLight } from "../lighting/rim-light";
import { lightEdge } from "../lighting/light-edge";
import { spotlight } from "../lighting/spotlight";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { baseSphere } from "../renderers";

/**
 * Minimal demo: solid-color sphere + full lighting stack.
 * No bands, no storms, no warps — isolates lighting effects.
 */
export function lightingOnly(env: Environment): Paint {
  // ── Flat solid base ──
  // let result = solidFill(env, band(-90, 90), { color: "#09337E" });

  let result = baseSphere(env, { baseColor: "#09337E", shadowColor: "#021133" });

  // ── Lighting stack ──
  result = shadow(env, result, { color: "#021133" });
  result = rimLight(env, result, { color: "#5f83c3" });
  // result = lightEdge(env, result, { color: "rgba(255,255,255,0.4)" });
  // result = spotlight(env, result, {});
  result = antiAliasMask(env, result);

  return result;
}
