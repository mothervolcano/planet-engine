import type { SeededRandom } from "../core/prng";
import type { Mark } from "./mark";
import type { SelectionCriterion } from "./selection";
import { applySelection, applyExtraction } from "./selection";

/**
 * An ordered collection of {@link Mark}s that supports non-destructive
 * and destructive subset operations.
 *
 * Marks are stored sorted by ascending `y` so that renderers can paint
 * back-to-front without an additional sort pass.
 *
 * ### Two ways to subset
 *
 * | Method    | Effect on this Plot         | Returns                    |
 * |-----------|-----------------------------|----------------------------|
 * | `filter`  | None (non-destructive)      | New Plot with matched marks |
 * | `extract` | Matched marks are removed   | New Plot with matched marks |
 *
 * `extract` is useful when partitioning a single Plot into disjoint
 * groups — e.g. pulling crater candidates out before scattering
 * spots across the remainder.
 */
export interface Plot {
  /** The current marks, sorted by ascending `y`. */
  readonly marks: readonly Mark[];

  /**
   * Returns a new Plot containing only the marks that satisfy
   * `criterion`. The source Plot is unchanged.
   */
  filter(criterion: SelectionCriterion, random: SeededRandom): Plot;

  /**
   * Removes the marks that satisfy `criterion` from this Plot and
   * returns them in a new Plot. Subsequent reads of `marks` on
   * the source will no longer include the extracted items.
   */
  extract(criterion: SelectionCriterion, random: SeededRandom): Plot;
}

/**
 * Creates a {@link Plot} from an array of marks.
 *
 * The input is defensively copied and sorted by ascending `y` so the
 * caller can safely mutate the original array afterwards.
 */
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
