// ── Core ──
export type { Point, PointLike, BlendMode } from "./core/types";
export type { ColorSchema, SchemeId } from "./core/color-schema";
export { silicate, sulfur, copper, malachite, schemes } from "./core/color-schema";
export { toTransparent, mix, tint, shade, colorRange } from "./core/color";
export type { SeededRandom } from "./core/prng";
export type { Paint } from "./core/paint";
export type { Environment, EnvironmentConfig } from "./core/environment";
export { createEnvironment } from "./core/environment";

// ── Geometry ──
export type { Band, Disc, Partition } from "./geometry/partition";
export { band, disc, fullSphere, resolvePartition, resolveBand } from "./geometry/partition";
export type { Mark } from "./geometry/mark";
export { mark } from "./geometry/mark";
export type { SelectionCriterion } from "./geometry/selection";
export type { GuideAnnotations, Guide } from "./geometry/guide";
export type { Grid, ChordGridParams, RayGridParams } from "./geometry/grid";
export { chordGrid, rayGrid } from "./geometry/grid";
export type { Plot } from "./geometry/plot";
export { createPlot } from "./geometry/plot";
export type { Region } from "./geometry/region";
export { createRegion, region } from "./geometry/region";
export type { DistributionParams } from "./geometry/distribution";
export { distribute } from "./geometry/distribution";

// ── Renderers ──
export { baseSphere } from "./renderers/partition/base-sphere";
export { solidFill } from "./renderers/partition/solid-fill";
export { gradientFill } from "./renderers/partition/gradient-fill";
export { spot } from "./renderers/mark/spot";
export { blot } from "./renderers/mark/blot";
export { crater } from "./renderers/mark/crater";
export { mandorla } from "./renderers/mark/mandorla";
export { irregularStar } from "./renderers/mark/irregular-star";
export { belt } from "./renderers/partition/belt";
export { gradientBelt } from "./renderers/partition/gradient-belt";
export { stroke } from "./renderers/guide/stroke";

// ── Effects ──
export type { WarpRegion } from "./effects/warp/region";
export { waveWarp } from "./effects/warp/wave";
export { twistWarp } from "./effects/warp/twist";
export { bulgeWarp } from "./effects/warp/bulge";
export { rampWarp } from "./effects/warp/ramp";
export { gradientMask } from "./effects/mask/gradient-mask";
export { radialGradientMask } from "./effects/mask/radial-gradient-mask";
export { gradientCut } from "./effects/mask/gradient-cut";
export { radialGradientCut } from "./effects/mask/radial-gradient-cut";
export { correctionBlur } from "./effects/post/correction-blur";
export { antiAliasMask } from "./effects/post/anti-alias-mask";
export { fitSphere } from "./effects/post/fit-sphere";

// ── Lighting ──
export { baseShadow } from "./lighting/base-shadow";
export { shadow } from "./lighting/shadow";
export { spotlight } from "./lighting/spotlight";
export { lightEdge } from "./lighting/light-edge";
export { rimLight } from "./lighting/rim-light";

// ── Compositing ──
export type { MergeOptions } from "./compositing/merge";
export { merge, mergeCut, mergeMask } from "./compositing/merge";
export type { Collector, CollectorOptions } from "./compositing/collector";
export { collector } from "./compositing/collector";
