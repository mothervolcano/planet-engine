import type { SeededRandom } from "../core/prng";

export type SelectionCriterion =
  | { kind: "all" }
  | { kind: "alternated" }
  | { kind: "random"; count: number }
  | { kind: "probabilistic"; probability: number; bias?: "lo" | "hi" | "mid" | "any" }
  | { kind: "range"; start: number; end: number }
  | { kind: "indices"; indices: number[] };

export function applySelection<T>(
  items: readonly T[],
  criterion: SelectionCriterion,
  random: SeededRandom,
): T[] {
  switch (criterion.kind) {
    case "all":
      return items.slice();

    case "alternated":
      return items.filter((_, i) => i % 2 === 0);

    case "random":
      return random.pickN(items, criterion.count);

    case "probabilistic": {
      const n = items.length;
      return items.filter((_, i) => {
        const p = modulateProbability(criterion.probability, criterion.bias, i, n);
        return random.chance(p);
      });
    }

    case "range":
      return items.slice(criterion.start, criterion.end);

    case "indices":
      return criterion.indices
        .filter((i) => i >= 0 && i < items.length)
        .map((i) => items[i]!);
  }
}

export function applyExtraction<T>(
  items: T[],
  criterion: SelectionCriterion,
  random: SeededRandom,
): { selected: T[]; remaining: T[] } {
  const selectedIndices = new Set<number>();

  switch (criterion.kind) {
    case "all":
      for (let i = 0; i < items.length; i++) selectedIndices.add(i);
      break;

    case "alternated":
      for (let i = 0; i < items.length; i += 2) selectedIndices.add(i);
      break;

    case "random": {
      const indices = Array.from({ length: items.length }, (_, i) => i);
      const picked = random.pickN(indices, criterion.count);
      for (const i of picked) selectedIndices.add(i);
      break;
    }

    case "probabilistic": {
      const n = items.length;
      for (let i = 0; i < n; i++) {
        const p = modulateProbability(criterion.probability, criterion.bias, i, n);
        if (random.chance(p)) selectedIndices.add(i);
      }
      break;
    }

    case "range":
      for (let i = criterion.start; i < Math.min(criterion.end, items.length); i++) {
        selectedIndices.add(i);
      }
      break;

    case "indices":
      for (const i of criterion.indices) {
        if (i >= 0 && i < items.length) selectedIndices.add(i);
      }
      break;
  }

  const selected: T[] = [];
  const remaining: T[] = [];

  for (let i = 0; i < items.length; i++) {
    if (selectedIndices.has(i)) {
      selected.push(items[i]!);
    } else {
      remaining.push(items[i]!);
    }
  }

  return { selected, remaining };
}

function modulateProbability(
  baseProbability: number,
  bias: "lo" | "hi" | "mid" | "any" | undefined,
  index: number,
  total: number,
): number {
  if (!bias || bias === "any" || total <= 1) return baseProbability;

  const t = index / (total - 1);

  switch (bias) {
    case "lo":
      return baseProbability * (1 - t);
    case "hi":
      return baseProbability * t;
    case "mid":
      return baseProbability * (1 - 2 * Math.abs(t - 0.5));
  }
}
