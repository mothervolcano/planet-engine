import type { Environment } from "../core/environment";
import type { Paint } from "../core/paint";
import { createEnvironment } from "../core/environment";
import { sketch } from "./sketch";
import { singleBand } from "./single-band";
import { lightingOnly } from "./lighting-only";
import { stratoGas } from "./strato-gas";
import { gridMarks, type GridType } from "./grid-marks";
import { partitionMarks, type PartitionType } from "./partition-marks";
import { poissonMarks, noiseMaskedMarks, clusteredMarks } from "./scatter-modes";
import { probabilisticFilter, type ProbabilisticBias } from "./probabilistic-filter";

const demos = [
  { fn: sketch,       title: "Model Sketch"},
  { fn: singleBand,   title: "band partitions + warp" },
  { fn: lightingOnly, title: "lighting stack only" },
  { fn: stratoGas,    title: "gas giant (bands + storms + lighting)" },
];

const GRID_OPTIONS: { value: GridType; label: string }[] = [
  { value: "chord", label: "chord grid" },
  { value: "ray",   label: "ray grid" },
];

const PARTITION_OPTIONS: { value: PartitionType; label: string }[] = [
  { value: "band", label: "band" },
  { value: "disc", label: "disc" },
];

const BIAS_OPTIONS: { value: ProbabilisticBias; label: string }[] = [
  { value: "any", label: "any" },
  { value: "lo",  label: "lo" },
  { value: "hi",  label: "hi" },
  { value: "mid", label: "mid" },
];

function buildUI(container: HTMLElement): {
  seedInput: HTMLInputElement;
  demoGrid: HTMLElement;
} {
  container.style.cssText = `
    display: flex; flex-direction: column; align-items: center;
    gap: 40px; padding: 100px 40px 40px; background: #0a0a0a; min-height: 100vh;
  `;

  // ── Seed controls ──
  const controls = document.createElement("div");
  controls.style.cssText = `
    display: flex; align-items: center; gap: 12px;
    position: fixed; top: 0; left: 0; right: 0; z-index: 10;
    justify-content: center;
    padding: 12px 24px;
    background: rgba(10,10,10,0.85);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #222;
  `;

  const label = document.createElement("label");
  label.textContent = "seed";
  label.style.cssText = "opacity: 0.4; font-size: 13px;";

  const seedInput = document.createElement("input");
  seedInput.type = "number";
  seedInput.value = "42";
  seedInput.style.cssText = `
    background: #1a1a1a; border: 1px solid #333; color: white;
    padding: 6px 10px; font-family: monospace; font-size: 13px;
    width: 120px; border-radius: 4px;
  `;

  const randomBtn = document.createElement("button");
  randomBtn.textContent = "randomize";
  randomBtn.style.cssText = `
    background: #1a1a1a; border: 1px solid #444; color: white;
    padding: 6px 14px; font-family: monospace; font-size: 13px;
    cursor: pointer; border-radius: 4px;
  `;
  randomBtn.addEventListener("click", () => {
    seedInput.value = String(Math.floor(Math.random() * 0xffffffff));
    seedInput.dispatchEvent(new Event("change"));
  });

  controls.append(label, seedInput, randomBtn);

  // ── Demo grid ──
  const demoGrid = document.createElement("div");
  demoGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(3, max-content);
    gap: 40px 32px;
    justify-items: center;
  `;

  container.append(controls, demoGrid);
  return { seedInput, demoGrid };
}

function makeCell(title: string): { cell: HTMLElement; heading: HTMLElement; imgSlot: HTMLElement } {
  const cell = document.createElement("div");
  cell.style.cssText = "display: flex; flex-direction: column; align-items: center;";

  const heading = document.createElement("span");
  heading.textContent = title;
  heading.style.cssText = "font-size: 11px; opacity: 0.45; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 32px;";

  const imgSlot = document.createElement("div");
  imgSlot.style.cssText = "margin-bottom: 28px;";

  cell.append(heading, imgSlot);
  return { cell, heading, imgSlot };
}

// ── Generic radio cell builder ─────────────────────────────────────────────────

function buildRadioCell<T extends string>(
  title: string,
  options: { value: T; label: string }[],
  defaultValue: T,
  groupName: string,
  paintFn: (env: Environment, value: T) => Paint,
  getSeed: () => number,
): { cell: HTMLElement; rerender: (seed: number) => Promise<void> } {
  const { cell, imgSlot } = makeCell(title);
  let current = defaultValue;

  const radiosRow = document.createElement("div");
  radiosRow.style.cssText = "display: flex; gap: 16px; align-items: center; margin-top: 28px;";

  const doRender = async (seed: number) => {
    imgSlot.innerHTML = "";
    const env = createEnvironment({ radius: 150, seed });
    const paint = paintFn(env, current);
    const img = await env.toImage(paint);
    img.style.borderRadius = "50%";
    env.dispose();
    imgSlot.appendChild(img);
    imgSlot.appendChild(radiosRow);
  };

  for (const { value, label } of options) {
    const radioLabel = document.createElement("label");
    radioLabel.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.6; cursor: pointer;";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = groupName;
    radio.value = value;
    radio.checked = value === current;
    radio.style.cursor = "pointer";

    radio.addEventListener("change", async () => {
      if (radio.checked) {
        current = value;
        await doRender(getSeed());
      }
    });

    radioLabel.append(radio, document.createTextNode(label));
    radiosRow.appendChild(radioLabel);
  }

  return { cell, rerender: doRender };
}

// ── Cell builders ─────────────────────────────────────────────────────────────

async function renderGridMarksCell(
  imgSlot: HTMLElement,
  radiosRow: HTMLElement,
  seed: number,
  gridType: GridType,
) {
  imgSlot.innerHTML = "";
  const env = createEnvironment({ radius: 150, seed });
  const paint = gridMarks(env, gridType);
  const img = await env.toImage(paint);
  img.style.borderRadius = "50%";
  env.dispose();
  imgSlot.appendChild(img);
  imgSlot.appendChild(radiosRow);
}

function buildGridMarksCell(seed: () => number): { cell: HTMLElement; rerender: (seed: number) => Promise<void> } {
  const { cell, imgSlot } = makeCell("mark distribution along grid guides");

  let currentGridType: GridType = "chord";

  const radiosRow = document.createElement("div");
  radiosRow.style.cssText = "display: flex; gap: 16px; align-items: center; margin-top: 28px;";

  const groupName = "grid-type";
  for (const { value, label } of GRID_OPTIONS) {
    const radioLabel = document.createElement("label");
    radioLabel.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.6; cursor: pointer;";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = groupName;
    radio.value = value;
    radio.checked = value === currentGridType;
    radio.style.cursor = "pointer";

    radio.addEventListener("change", async () => {
      if (radio.checked) {
        currentGridType = value;
        await renderGridMarksCell(imgSlot, radiosRow, seed(), currentGridType);
      }
    });

    radioLabel.append(radio, document.createTextNode(label));
    radiosRow.appendChild(radioLabel);
  }

  const rerender = (s: number) =>
    renderGridMarksCell(imgSlot, radiosRow, s, currentGridType);

  return { cell, rerender };
}

// ── Render ────────────────────────────────────────────────────────────────────

type DemoCell = { cell: HTMLElement; rerender: (seed: number) => Promise<void> };

async function render(demoGrid: HTMLElement, seed: number, cells: DemoCell[]) {
  demoGrid.innerHTML = "";

  for (const { fn, title } of demos) {
    const { cell, imgSlot } = makeCell(title);
    const env = createEnvironment({ radius: 150, seed });
    const paint = fn(env);
    const img = await env.toImage(paint);
    img.style.borderRadius = "50%";
    env.dispose();
    imgSlot.appendChild(img);
    demoGrid.appendChild(cell);
  }

  for (const { cell, rerender } of cells) {
    demoGrid.appendChild(cell);
    await rerender(seed);
  }
}

async function main() {
  const container = document.getElementById("app")!;
  const { seedInput, demoGrid } = buildUI(container);

  const getSeed = () => {
    const v = parseInt(seedInput.value, 10);
    return isNaN(v) ? 42 : v;
  };

  const cells: DemoCell[] = [
    buildGridMarksCell(getSeed),
    buildRadioCell("uniform scatter", PARTITION_OPTIONS, "band", "uniform-partition", partitionMarks, getSeed),
    buildRadioCell("poisson scatter", PARTITION_OPTIONS, "band", "poisson-partition", poissonMarks, getSeed),
    buildRadioCell("noise-masked scatter", PARTITION_OPTIONS, "band", "noise-partition", noiseMaskedMarks, getSeed),
    buildRadioCell("clustered scatter", PARTITION_OPTIONS, "band", "clustered-partition", clusteredMarks, getSeed),
    buildRadioCell("probabilistic filter", BIAS_OPTIONS, "any", "prob-bias", probabilisticFilter, getSeed),
  ];

  for (const { cell } of cells) demoGrid.appendChild(cell);

  const fullRender = (seed: number) => render(demoGrid, seed, cells);

  seedInput.addEventListener("change", () => fullRender(getSeed()));
  seedInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fullRender(getSeed());
  });

  await fullRender(getSeed());
}

main();
