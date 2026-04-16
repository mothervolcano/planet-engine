import type { SeededRandom } from "../core/prng";
import type { Mark } from "./mark";
import type { SelectionCriterion } from "./selection";
import { applySelection, applyExtraction } from "./selection";

export interface Plot {
  readonly marks: readonly Mark[];
  filter(criterion: SelectionCriterion, random: SeededRandom): Plot;
  extract(criterion: SelectionCriterion, random: SeededRandom): Plot;
}

export function createPlot(marks: Mark[]): Plot {
  let items = marks.slice().sort((a, b) => a.y - b.y);

  return {
    get marks(): readonly Mark[] {
      return items;
    },

    filter(criterion: SelectionCriterion, random: SeededRandom): Plot {
      const selected = applySelection(items, criterion, random);
      return createPlot(selected);
    },

    extract(criterion: SelectionCriterion, random: SeededRandom): Plot {
      const { selected, remaining } = applyExtraction(items, criterion, random);
      items = remaining;
      return createPlot(selected);
    },
  };
}
