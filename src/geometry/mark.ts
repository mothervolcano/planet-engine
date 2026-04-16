export interface Mark {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export function mark(x: number, y: number, size: number): Mark {
  return { x, y, size };
}
