export interface CanvasPool {
  acquire(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
  release(canvas: HTMLCanvasElement): void;
  readonly activeCount: number;
  dispose(): void;
}

export function createPool(): CanvasPool {
  const idle: HTMLCanvasElement[] = [];
  const contexts = new Map<HTMLCanvasElement, CanvasRenderingContext2D>();
  let active = 0;

  function getOrCreateContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    let ctx = contexts.get(canvas);
    if (!ctx) {
      ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      contexts.set(canvas, ctx);
    }
    return ctx;
  }

  function acquire(width: number, height: number) {
    const canvas = idle.pop() ?? document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = getOrCreateContext(canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.clearRect(0, 0, width, height);

    active++;
    return { canvas, ctx };
  }

  function release(canvas: HTMLCanvasElement) {
    idle.push(canvas);
    active--;
  }

  function dispose() {
    idle.length = 0;
    contexts.clear();
    active = 0;
  }

  return {
    acquire,
    release,
    get activeCount() { return active; },
    dispose,
  };
}
