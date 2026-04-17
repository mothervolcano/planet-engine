const scratchCanvas = document.createElement("canvas");
scratchCanvas.width = 1;
scratchCanvas.height = 1;
const scratchCtx = scratchCanvas.getContext("2d")!;

function parseRGB(color: string): [number, number, number] {
  scratchCtx.clearRect(0, 0, 1, 1);
  scratchCtx.fillStyle = color;
  scratchCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = scratchCtx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export function toTransparent(color: string): string {
  const [r, g, b] = parseRGB(color);
  return `rgba(${r}, ${g}, ${b}, 0)`;
}

/** Blend two colors. t=0 returns a, t=1 returns b. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseRGB(a);
  const [r2, g2, b2] = parseRGB(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Lighten a color toward white. amount=0 is original, amount=1 is white. */
export function tint(color: string, amount: number): string {
  return mix(color, "#ffffff", amount);
}

/** Darken a color toward black. amount=0 is original, amount=1 is black. */
export function shade(color: string, amount: number): string {
  return mix(color, "#000000", amount);
}

/** Generate an array of `steps` colors interpolated from `from` to `to`. */
export function colorRange(from: string, to: string, steps: number): string[] {
  if (steps === 1) return [mix(from, to, 0.5)];
  return Array.from({ length: steps }, (_, i) => mix(from, to, i / (steps - 1)));
}
