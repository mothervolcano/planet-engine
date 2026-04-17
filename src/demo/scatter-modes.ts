import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { band, disc } from "../geometry/partition";
import { distribute } from "../geometry/distribution";
import { blot } from "../renderers/mark/blot";
import { antiAliasMask } from "../effects/post/anti-alias-mask";
import { merge } from "../compositing/merge";
import { collector } from "../compositing/collector";
import { solidFill } from "../renderers";

export type PartitionType = "band" | "disc";

function base(env: Environment): Paint {
  return solidFill(env, band(-90, 90), { color: "#09337E" });
}

function render(env: Environment, base: Paint, marks: ReturnType<typeof distribute>): Paint {
  const acc = collector(env, { blendMode: "screen" });
  for (const m of marks.marks) {
    acc.add(blot(env, m, { color: "rgba(160, 200, 255, 0.7)" }));
  }
  let result = merge(env, base, acc.result());
  result = antiAliasMask(env, result);
  return result;
}

export function poissonMarks(env: Environment, partitionType: PartitionType): Paint {
  const partition =
    partitionType === "band"
      ? band(-90, 90)
      : disc(env.center, env.radius * 0.7);

  const plot = distribute(env, partition, {
    mode: "poisson",
    minSpacing: 0.12,
    margins: [0.05, 0.95],
    sizeRange: [0.03, 0.1],
  });

  return render(env, base(env), plot);
}

export function noiseMaskedMarks(env: Environment, partitionType: PartitionType): Paint {
  const partition =
    partitionType === "band"
      ? band(-90, 90)
      : disc(env.center, env.radius * 0.8);

  const plot = distribute(env, partition, {
    mode: "noise-masked",
    density: 300,
    noiseScale: 0.025,
    threshold: 0.45,
    octaves: 2,
    margins: [0.05, 0.95],
    sizeRange: [0.02, 0.07],
  });

  return render(env, base(env), plot);
}

export function clusteredMarks(env: Environment, partitionType: PartitionType): Paint {
  const partition =
    partitionType === "band"
      ? band(-90, 90)
      : disc(env.center, env.radius * 0.8);

  const plot = distribute(env, partition, {
    mode: "clustered",
    clusterCount: 7,
    marksPerCluster: 14,
    clusterSpread: 0.12,
    margins: [0.05, 0.95],
    sizeRange: [0.03, 0.2],
  });

  return render(env, base(env), plot);
}
