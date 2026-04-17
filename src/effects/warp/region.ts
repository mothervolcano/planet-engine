import type { Disc } from "../../geometry/partition";
import type { Mark } from "../../geometry/mark";
import type { Environment } from "../../core/environment";

/** A spatial region that anchors a warp effect and provides its reference size. */
export type WarpRegion = Mark | Disc;

export function resolveRegion(
  region: WarpRegion | undefined,
  env: Environment,
): { cx: number; cy: number; refSize: number } {
  if (!region) {
    return { cx: env.center.x, cy: env.center.y, refSize: env.radius };
  }
  if ('size' in region) {
    return { cx: region.x, cy: region.y, refSize: region.size * env.radius };
  }
  return { cx: region.center.x, cy: region.center.y, refSize: region.radius };
}
