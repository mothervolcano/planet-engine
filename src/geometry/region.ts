import type { SeededRandom } from "../core/prng";
import type { Partition } from "./partition";
import type { SelectionCriterion } from "./selection";
import { applySelection, applyExtraction } from "./selection";

export interface Region {
  readonly partitions: readonly Partition[];
  filter(criterion: SelectionCriterion, random: SeededRandom): Region;
  extract(criterion: SelectionCriterion, random: SeededRandom): Region;
}

export function createRegion(partitions: Partition[]): Region {
  let items = partitions;

  return {
    get partitions(): readonly Partition[] {
      return items;
    },

    filter(criterion: SelectionCriterion, random: SeededRandom): Region {
      const selected = applySelection(items, criterion, random);
      return createRegion(selected);
    },

    extract(criterion: SelectionCriterion, random: SeededRandom): Region {
      const { selected, remaining } = applyExtraction(items, criterion, random);
      items = remaining;
      return createRegion(selected);
    },
  };
}

export function region(...partitions: Partition[]): Region {
  return createRegion(partitions);
}
