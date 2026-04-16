const scratchCanvas = document.createElement("canvas");
scratchCanvas.width = 1;
scratchCanvas.height = 1;
const scratchCtx = scratchCanvas.getContext("2d")!;

export function toTransparent(color: string): string {
  scratchCtx.clearRect(0, 0, 1, 1);
  scratchCtx.fillStyle = color;
  scratchCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = scratchCtx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, 0)`;
}
